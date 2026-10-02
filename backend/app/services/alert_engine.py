"""
CryptoTrace v2 - Alert Generation Engine
Analyzes fund-flow graphs and produces risk alerts (CRITICAL, HIGH, MEDIUM, LOW)
for VASP exits, rapid layering fan-out, high value transfers, and multi-hop obfuscation.
"""

import json
from typing import List, Dict, Any, Optional

class AlertEngine:
    @classmethod
    def generate_alerts(
        cls,
        nodes: List[dict],
        edges: List[dict],
        case_ref: str,
        case_id: Optional[int] = None,
        amount_lost: float = 0.0,
        suspect_wallet: str = ""
    ) -> List[dict]:
        alerts: List[dict] = []
        suspect_lower = suspect_wallet.lower()

        # Build node lookup & out-degrees
        node_map = {n["address"].lower(): n for n in nodes}
        out_edges: Dict[str, List[dict]] = {}
        for edge in edges:
            src = edge["source"].lower()
            out_edges.setdefault(src, []).append(edge)

        # 1. Check for VASP Exit / Deposit Alerts (CRITICAL)
        for node in nodes:
            vasp_name = node.get("vasp_name")
            if vasp_name:
                hop = node.get("hop", 0)
                addr = node["address"]
                # Find edge leading into this VASP
                in_txs = [e for e in edges if e["target"].lower() == addr.lower()]
                tx_hash = in_txs[0]["tx_hash"] if in_txs else "N/A"
                fiat = in_txs[0].get("fiat_usd", 0.0) if in_txs else 0.0

                path_nodes = [suspect_wallet, addr] if hop > 0 else [addr]

                alerts.append({
                    "case_id": case_id,
                    "title": f"Probable {vasp_name} Exchange Deposit Identified (VASP Exit)",
                    "severity": "CRITICAL",
                    "risk_score": 95.0,
                    "reason": f"Funds (${fiat:,.2f} USD) traced directly into target VASP deposit address ({addr}) at Hop {hop} (Tx: {tx_hash[:12]}...).",
                    "status": "ACTIVE",
                    "path_json": json.dumps(path_nodes)
                })

        # 2. Check for Rapid Fan-Out Layering (HIGH)
        for src_addr, tx_list in out_edges.items():
            if len(tx_list) >= 3:
                src_node = node_map.get(src_addr, {})
                hop = src_node.get("hop", 0)
                total_fiat = sum(t.get("fiat_usd", 0.0) for t in tx_list)
                targets = [t["target"] for t in tx_list]

                alerts.append({
                    "case_id": case_id,
                    "title": "Rapid Multi-Recipient Layering Pattern",
                    "severity": "HIGH",
                    "risk_score": 85.0,
                    "reason": f"Wallet {src_addr[:8]}...{src_addr[-6:]} rapidly split transfers across {len(tx_list)} separate counterparties (Total: ${total_fiat:,.2f} USD) at Hop {hop}.",
                    "status": "ACTIVE",
                    "path_json": json.dumps([src_addr] + targets[:3])
                })

        # 3. High-Value Single Transfer Alerts (HIGH)
        threshold_usd = max(10000.0, amount_lost * 0.25 if amount_lost else 5000.0)
        high_val_count = 0
        for edge in edges:
            fiat = edge.get("fiat_usd", 0.0)
            if fiat >= threshold_usd and high_val_count < 3:
                high_val_count += 1
                src = edge["source"]
                tgt = edge["target"]
                tx_hash = edge["tx_hash"]
                token = edge.get("token", "USD")

                alerts.append({
                    "case_id": case_id,
                    "title": f"High-Value Transaction Alert (${fiat:,.2f} USD)",
                    "severity": "HIGH",
                    "risk_score": 80.0,
                    "reason": f"Single transfer of {edge['amount']} {token} (${fiat:,.2f} USD) detected from {src[:6]}...{src[-4:]} to {tgt[:6]}...{tgt[-4:]} (Tx: {tx_hash[:12]}...).",
                    "status": "ACTIVE",
                    "path_json": json.dumps([src, tgt])
                })

        # 4. Multi-Hop Chain Obfuscation Alert (MEDIUM)
        max_hop = max((n.get("hop", 0) for n in nodes), default=0)
        if max_hop >= 3:
            alerts.append({
                "case_id": case_id,
                "title": f"Multi-Hop Obfuscation Chain ({max_hop} Hops Traced)",
                "severity": "MEDIUM",
                "risk_score": 65.0,
                "reason": f"Fund transfers span {max_hop} consecutive intermediary hops, indicating structured wallet obfuscation.",
                "status": "ACTIVE",
                "path_json": json.dumps([suspect_wallet, f"Intermediate Hops ({max_hop})"])
            })

        # Fallback default alert if none triggered
        if not alerts:
            alerts.append({
                "case_id": case_id,
                "title": "Suspect Wallet Investigation Initiated",
                "severity": "LOW",
                "risk_score": 40.0,
                "reason": f"Initial blockchain fund-flow trace completed for suspect wallet {suspect_wallet}.",
                "status": "ACTIVE",
                "path_json": json.dumps([suspect_wallet])
            })

        return alerts
