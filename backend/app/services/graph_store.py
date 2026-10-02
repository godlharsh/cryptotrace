import json
import logging
import networkx as nx
from typing import List, Dict, Any, Tuple
from app.neo4j_client import get_neo4j_driver, check_neo4j_connection

logger = logging.getLogger("cryptotrace.graph_store")

class GraphStore:
    @classmethod
    def build_networkx_graph(cls, nodes: List[dict], edges: List[dict]) -> nx.DiGraph:
        G = nx.DiGraph()
        for node in nodes:
            G.add_node(
                node["id"],
                address=node["address"],
                chain=node["chain"],
                label=node.get("label", ""),
                role=node.get("role", "intermediary"),
                risk_score=node.get("risk_score", 0.0),
                vasp_name=node.get("vasp_name", None),
                vasp_confidence=node.get("vasp_confidence", 0.0)
            )
        for edge in edges:
            G.add_edge(
                edge["source"],
                edge["target"],
                tx_hash=edge.get("tx_hash", ""),
                amount=edge.get("amount", 0.0),
                token=edge.get("token", "ETH"),
                fiat_usd=edge.get("fiat_usd", 0.0),
                timestamp=edge.get("timestamp", 0),
                chain=edge.get("chain", "ethereum")
            )
        return G

    @classmethod
    def save_graph_to_neo4j(cls, case_ref: str, nodes: List[dict], edges: List[dict]) -> bool:
        if not check_neo4j_connection():
            logger.info("Neo4j not connected. Using local NetworkX JSON fallback graph storage.")
            return False

        driver = get_neo4j_driver()
        if not driver:
            return False

        try:
            with driver.session() as session:
                # Merge Nodes
                for node in nodes:
                    session.run(
                        """
                        MERGE (w:Wallet {address: $address, chain: $chain})
                        SET w.case_ref = $case_ref,
                            w.label = $label,
                            w.role = $role,
                            w.risk_score = $risk_score,
                            w.vasp_name = $vasp_name,
                            w.vasp_confidence = $vasp_confidence
                        """,
                        address=node["address"],
                        chain=node["chain"],
                        case_ref=case_ref,
                        label=node.get("label", ""),
                        role=node.get("role", "intermediary"),
                        risk_score=node.get("risk_score", 0.0),
                        vasp_name=node.get("vasp_name"),
                        vasp_confidence=node.get("vasp_confidence", 0.0)
                    )

                # Merge Edges
                for edge in edges:
                    session.run(
                        """
                        MATCH (a:Wallet {address: $source}), (b:Wallet {address: $target})
                        MERGE (a)-[r:TRANSFERRED {tx_hash: $tx_hash}]->(b)
                        SET r.amount = $amount,
                            r.token = $token,
                            r.fiat_usd = $fiat_usd,
                            r.timestamp = $timestamp,
                            r.chain = $chain,
                            r.case_ref = $case_ref
                        """,
                        source=edge["source"],
                        target=edge["target"],
                        tx_hash=edge.get("tx_hash", ""),
                        amount=edge.get("amount", 0.0),
                        token=edge.get("token", "ETH"),
                        fiat_usd=edge.get("fiat_usd", 0.0),
                        timestamp=edge.get("timestamp", 0),
                        chain=edge.get("chain", "ethereum"),
                        case_ref=case_ref
                    )
            logger.info(f"Successfully saved {len(nodes)} nodes and {len(edges)} edges to Neo4j Aura.")
            return True
        except Exception as e:
            logger.warning(f"Error persisting graph to Neo4j: {e}")
            return False

    @classmethod
    def graph_to_json(cls, nodes: List[dict], edges: List[dict]) -> str:
        return json.dumps({"nodes": nodes, "edges": edges})
