"""
CryptoTrace v2 - Risk Scoring Engine
Calculates risk scores (0-100) for nodes and edges based on hop distance,
transfer volumes, fan-out clustering, and VASP proximity.
"""

from typing import List, Dict, Any

class RiskEngine:
    @classmethod
    def calculate_risk(
        cls,
        nodes: List[dict],
        edges: List[dict],
        suspect_wallet: str,
        amount_lost: float = 0.0
    ) -> tuple[List[dict], List[dict]]:
        """
        Enriches nodes and edges with risk scores and roles.
        """
        suspect_lower = suspect_wallet.lower()
        
        # 1. Map node out-degree & total volume
        out_degree: Dict[str, int] = {}
        total_outgoing_usd: Dict[str, float] = {}
        total_incoming_usd: Dict[str, float] = {}

        for edge in edges:
            src = edge["source"].lower()
            tgt = edge["target"].lower()
            fiat = edge.get("fiat_usd", 0.0)

            out_degree[src] = out_degree.get(src, 0) + 1
            total_outgoing_usd[src] = total_outgoing_usd.get(src, 0.0) + fiat
            total_incoming_usd[tgt] = total_incoming_usd.get(tgt, 0.0) + fiat

        # Base decay table by hop distance
        hop_base_risk = {
            0: 95.0,
            1: 80.0,
            2: 65.0,
            3: 50.0,
            4: 40.0,
            5: 30.0,
        }

        # 2. Compute Node Risk Scores & Roles
        for node in nodes:
            addr = node["address"]
            addr_lower = addr.lower()
            hop = node.get("hop", 0)

            # Base risk from hop
            base = hop_base_risk.get(hop, 25.0)

            # Modifiers
            volume_out = total_outgoing_usd.get(addr_lower, 0.0)
            volume_in = total_incoming_usd.get(addr_lower, 0.0)
            degree = out_degree.get(addr_lower, 0)

            vol_bonus = 0.0
            if max(volume_out, volume_in) >= 50000.0:
                vol_bonus = 15.0
            elif max(volume_out, volume_in) >= 10000.0:
                vol_bonus = 10.0
            elif max(volume_out, volume_in) >= 1000.0:
                vol_bonus = 5.0

            fanout_bonus = 10.0 if degree >= 3 else 0.0
            
            # Role & Label Determination
            role = node.get("role", "intermediary")
            if addr_lower == suspect_lower or hop == 0:
                role = "origin"
                node["label"] = node.get("label") or "Victim Suspect Wallet"
                base = 98.0
            elif node.get("vasp_name"):
                role = "vasp_deposit"
                base = 90.0
            elif degree > 3:
                role = "mixer_layering"
                if not node.get("label"):
                    node["label"] = f"Layering Hub (Fan-out: {degree})"
            else:
                if not node.get("label"):
                    node["label"] = f"Hop {hop} Wallet ({addr[:6]}...{addr[-4:]})"

            node["role"] = role
            final_score = min(100.0, base + vol_bonus + fanout_bonus)
            node["risk_score"] = round(final_score, 1)

        # Map fast node risk lookup
        node_risk_map = {n["address"].lower(): n["risk_score"] for n in nodes}

        # 3. Compute Edge Risk Scores
        for edge in edges:
            src = edge["source"].lower()
            tgt = edge["target"].lower()
            fiat = edge.get("fiat_usd", 0.0)

            src_risk = node_risk_map.get(src, 50.0)
            tgt_risk = node_risk_map.get(tgt, 50.0)

            vol_factor = min(20.0, (fiat / 1000.0) * 2.0)
            edge_risk = min(100.0, ((src_risk * 0.6) + (tgt_risk * 0.4)) + vol_factor)
            edge["risk_score"] = round(edge_risk, 1)

        return nodes, edges
