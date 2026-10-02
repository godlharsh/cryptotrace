import time
import logging
from collections import deque
from typing import Dict, List, Set, Any
from app.services.blockchain_clients import (
    EtherscanClient,
    TronGridClient,
    BitcoinClient,
    CoinGeckoClient
)

logger = logging.getLogger("cryptotrace.tracer")

# In-memory progress tracker store
_TRACE_PROGRESS: Dict[str, Dict[str, Any]] = {}

def get_trace_progress(case_ref: str) -> Dict[str, Any]:
    return _TRACE_PROGRESS.get(case_ref, {
        "status": "NOT_STARTED",
        "progress_percent": 0,
        "stage": "Submitted",
        "current_hop": 0,
        "wallets_found": 0,
        "error": None
    })

def update_trace_progress(case_ref: str, stage: str, progress: int, hop: int = 0, wallets: int = 0, status: str = "IN_PROGRESS", error: str = None):
    _TRACE_PROGRESS[case_ref] = {
        "status": status,
        "progress_percent": progress,
        "stage": stage,
        "current_hop": hop,
        "wallets_found": wallets,
        "error": error
    }

class TracerService:
    @classmethod
    def fetch_outgoing_transfers(cls, address: str, chain: str, rates: dict) -> List[dict]:
        transfers = []
        addr_lower = address.lower()

        if chain == "ethereum":
            # Normal transactions
            txs = EtherscanClient.get_normal_txs(address)
            for tx in txs:
                from_addr = tx.get("from", "").lower()
                to_addr = tx.get("to", "").lower()
                val_eth = float(tx.get("value", 0)) / 1e18
                if from_addr == addr_lower and to_addr and val_eth > 0:
                    transfers.append({
                        "from": address,
                        "to": tx.get("to"),
                        "amount": round(val_eth, 6),
                        "token": "ETH",
                        "fiat_usd": round(val_eth * rates.get("ETH", 3200.0), 2),
                        "tx_hash": tx.get("hash", ""),
                        "timestamp": int(tx.get("timeStamp", time.time())),
                        "chain": "ethereum"
                    })

            # Internal transactions
            itxs = EtherscanClient.get_internal_txs(address)
            for tx in itxs:
                from_addr = tx.get("from", "").lower()
                to_addr = tx.get("to", "").lower()
                val_eth = float(tx.get("value", 0)) / 1e18
                if from_addr == addr_lower and to_addr and val_eth > 0:
                    transfers.append({
                        "from": address,
                        "to": tx.get("to"),
                        "amount": round(val_eth, 6),
                        "token": "ETH",
                        "fiat_usd": round(val_eth * rates.get("ETH", 3200.0), 2),
                        "tx_hash": tx.get("hash", ""),
                        "timestamp": int(tx.get("timeStamp", time.time())),
                        "chain": "ethereum"
                    })

            # ERC-20 transfers
            toks = EtherscanClient.get_token_transfers(address)
            for tx in toks:
                from_addr = tx.get("from", "").lower()
                to_addr = tx.get("to", "").lower()
                symbol = tx.get("tokenSymbol", "TOKEN").upper()
                decimals = int(tx.get("tokenDecimal", 18) or 18)
                val_token = float(tx.get("value", 0)) / (10 ** decimals)
                rate = rates.get(symbol, 1.0)
                if from_addr == addr_lower and to_addr and val_token > 0:
                    transfers.append({
                        "from": address,
                        "to": tx.get("to"),
                        "amount": round(val_token, 6),
                        "token": symbol,
                        "fiat_usd": round(val_token * rate, 2),
                        "tx_hash": tx.get("hash", ""),
                        "timestamp": int(tx.get("timeStamp", time.time())),
                        "chain": "ethereum"
                    })

        elif chain == "tron":
            # TRC20 transfers (USDT-TRC20 focus)
            trc20_txs = TronGridClient.get_trc20_transfers(address)
            for tx in trc20_txs:
                from_addr = tx.get("from", "")
                to_addr = tx.get("to", "")
                sym = tx.get("token_info", {}).get("symbol", "USDT").upper()
                decimals = int(tx.get("token_info", {}).get("decimals", 6) or 6)
                val_token = float(tx.get("value", 0)) / (10 ** decimals)
                if from_addr == address and to_addr and val_token > 0:
                    transfers.append({
                        "from": address,
                        "to": to_addr,
                        "amount": round(val_token, 6),
                        "token": sym,
                        "fiat_usd": round(val_token * rates.get(sym, 1.0), 2),
                        "tx_hash": tx.get("transaction_id", ""),
                        "timestamp": int(tx.get("block_timestamp", time.time() * 1000)) // 1000,
                        "chain": "tron"
                    })

            # TRX transfers
            trx_txs = TronGridClient.get_trx_transfers(address)
            for tx in trx_txs:
                raw_data = tx.get("raw_data", {}).get("contract", [{}])[0].get("parameter", {}).get("value", {})
                from_addr = raw_data.get("owner_address", "")
                to_addr = raw_data.get("to_address", "")
                amount_trx = float(raw_data.get("amount", 0)) / 1e6
                if from_addr == address and to_addr and amount_trx > 0:
                    transfers.append({
                        "from": address,
                        "to": to_addr,
                        "amount": round(amount_trx, 6),
                        "token": "TRX",
                        "fiat_usd": round(amount_trx * rates.get("TRX", 0.25), 2),
                        "tx_hash": tx.get("txID", ""),
                        "timestamp": int(tx.get("raw_data", {}).get("timestamp", time.time() * 1000)) // 1000,
                        "chain": "tron"
                    })

        elif chain == "bitcoin":
            btc_txs = BitcoinClient.get_address_txs(address)
            for tx in btc_txs:
                tx_hash = tx.get("txid", "")
                ts = tx.get("status", {}).get("block_time", int(time.time()))
                # Check inputs to see if address is sender
                is_sender = any(vin.get("prevout", {}).get("scriptpubkey_address") == address for vin in tx.get("vin", []))
                if is_sender:
                    for vout in tx.get("vout", []):
                        to_addr = vout.get("scriptpubkey_address")
                        val_btc = float(vout.get("value", 0)) / 1e8
                        if to_addr and to_addr != address and val_btc > 0:
                            transfers.append({
                                "from": address,
                                "to": to_addr,
                                "amount": round(val_btc, 8),
                                "token": "BTC",
                                "fiat_usd": round(val_btc * rates.get("BTC", 95000.0), 2),
                                "tx_hash": tx_hash,
                                "timestamp": ts,
                                "chain": "bitcoin"
                            })

        return transfers

    @classmethod
    def trace_wallet(
        cls,
        case_ref: str,
        root_address: str,
        chain: str,
        max_depth: int = 4,
        max_counterparties: int = 10,
        dust_threshold_usd: float = 1.0,
        max_total_nodes: int = 300
    ) -> tuple[List[dict], List[dict]]:

        max_depth = min(max(1, max_depth), 6)
        rates = CoinGeckoClient.get_prices()

        update_trace_progress(case_ref, "Fetching blockchain data", 20, hop=0, wallets=1)

        visited_wallets: Set[str] = {root_address}
        nodes_dict: Dict[str, dict] = {
            root_address: {
                "id": root_address,
                "address": root_address,
                "chain": chain,
                "role": "origin",
                "label": "Victim Suspect Wallet",
                "risk_score": 0.0,
                "hop": 0
            }
        }
        edges_list: List[dict] = []

        queue = deque([(root_address, 0)])

        while queue and len(nodes_dict) < max_total_nodes:
            current_addr, current_hop = queue.popleft()

            if current_hop >= max_depth:
                continue

            update_trace_progress(
                case_ref,
                "Tracing hops",
                50 + int((current_hop / max_depth) * 20),
                hop=current_hop + 1,
                wallets=len(nodes_dict)
            )

            # Fetch outgoing transfers
            outgoing = cls.fetch_outgoing_transfers(current_addr, chain, rates)

            # Filter dust
            valid_transfers = [t for t in outgoing if t["fiat_usd"] >= dust_threshold_usd or t["amount"] > 0.0001]

            # Sort by fiat value descending and cap at max_counterparties
            valid_transfers.sort(key=lambda x: x["fiat_usd"], reverse=True)
            top_transfers = valid_transfers[:min(max_counterparties, 5)]

            for tx in top_transfers:
                target_addr = tx["to"]
                if not target_addr or target_addr == current_addr:
                    continue

                if target_addr not in nodes_dict:
                    if len(nodes_dict) >= max_total_nodes:
                        break
                    nodes_dict[target_addr] = {
                        "id": target_addr,
                        "address": target_addr,
                        "chain": chain,
                        "role": "intermediary",
                        "label": "",
                        "risk_score": 0.0,
                        "hop": current_hop + 1
                    }
                    if target_addr not in visited_wallets and (current_hop + 1) < max_depth:
                        visited_wallets.add(target_addr)
                        queue.append((target_addr, current_hop + 1))

                # Add edge
                edge_id = f"{tx['tx_hash']}_{tx['from']}_{tx['to']}"
                edges_list.append({
                    "id": edge_id,
                    "source": tx["from"],
                    "target": tx["to"],
                    "amount": tx["amount"],
                    "token": tx["token"],
                    "fiat_usd": tx["fiat_usd"],
                    "tx_hash": tx["tx_hash"],
                    "timestamp": tx["timestamp"],
                    "chain": chain
                })

        update_trace_progress(case_ref, "Building graph", 75, hop=max_depth, wallets=len(nodes_dict))

        nodes_list = list(nodes_dict.values())
        return nodes_list, edges_list
