import time
import logging
import httpx
from typing import List, Dict, Any, Optional
from app import config

logger = logging.getLogger("cryptotrace.clients")

# Market Price Cache (10 min TTL)
_PRICE_CACHE = {"timestamp": 0, "rates": {"ETH": 3200.0, "TRX": 0.25, "BTC": 95000.0, "USDT": 1.0, "USDC": 1.0}}

# In-memory Blockchain API Cache (Address -> Transfer Results)
_API_CACHE: Dict[str, dict] = {}

class CoinGeckoClient:
    @staticmethod
    def get_prices() -> Dict[str, float]:
        global _PRICE_CACHE
        now = time.time()
        if now - _PRICE_CACHE["timestamp"] < 600:
            return _PRICE_CACHE["rates"]

        if not config.COINGECKO_API_KEY:
            return _PRICE_CACHE["rates"]

        url = "https://api.coingecko.com/api/v3/simple/price?ids=ethereum,tron,bitcoin,tether,usd-coin&vs_currencies=usd"
        headers = {"x-cg-demo-api-key": config.COINGECKO_API_KEY}
        try:
            r = httpx.get(url, headers=headers, timeout=6.0)
            if r.status_code == 200:
                data = r.json()
                rates = {
                    "ETH": float(data.get("ethereum", {}).get("usd", 3200.0)),
                    "TRX": float(data.get("tron", {}).get("usd", 0.25)),
                    "BTC": float(data.get("bitcoin", {}).get("usd", 95000.0)),
                    "USDT": float(data.get("tether", {}).get("usd", 1.0)),
                    "USDC": float(data.get("usd-coin", {}).get("usd", 1.0)),
                }
                _PRICE_CACHE = {"timestamp": now, "rates": rates}
                return rates
        except Exception as e:
            logger.warning(f"CoinGecko price fetch failed: {e}. Using cached/fallback rates.")

        return _PRICE_CACHE["rates"]


class EtherscanClient:
    BASE_URL = "https://api.etherscan.io/v2/api"

    @classmethod
    def _fetch_with_retry(cls, params: dict, max_retries: int = 2) -> dict:
        if not config.ETHERSCAN_API_KEY:
            return {"status": "0", "result": []}
        
        params["apikey"] = config.ETHERSCAN_API_KEY
        params["chainid"] = "1"
        cache_key = f"eth_{params.get('action')}_{params.get('address')}"

        if cache_key in _API_CACHE:
            return _API_CACHE[cache_key]

        for attempt in range(max_retries):
            try:
                r = httpx.get(cls.BASE_URL, params=params, timeout=5.0)
                if r.status_code == 200:
                    data = r.json()
                    if data.get("status") in ["1", "0"] or "result" in data:
                        _API_CACHE[cache_key] = data
                        return data
                time.sleep(0.15 * (2 ** attempt))
            except Exception as e:
                logger.warning(f"Etherscan request error ({params.get('action')}, attempt {attempt+1}): {e}")
                time.sleep(0.15 * (2 ** attempt))

        return {"status": "0", "result": []}

    @classmethod
    def get_normal_txs(cls, address: str) -> List[dict]:
        params = {"module": "account", "action": "txlist", "address": address, "sort": "desc"}
        res = cls._fetch_with_retry(params)
        return res.get("result", []) if isinstance(res.get("result"), list) else []

    @classmethod
    def get_internal_txs(cls, address: str) -> List[dict]:
        params = {"module": "account", "action": "txlistinternal", "address": address, "sort": "desc"}
        res = cls._fetch_with_retry(params)
        return res.get("result", []) if isinstance(res.get("result"), list) else []

    @classmethod
    def get_token_transfers(cls, address: str) -> List[dict]:
        params = {"module": "account", "action": "tokentx", "address": address, "sort": "desc"}
        res = cls._fetch_with_retry(params)
        return res.get("result", []) if isinstance(res.get("result"), list) else []


class TronGridClient:
    BASE_URL = "https://api.trongrid.io"

    @classmethod
    def _headers(cls) -> dict:
        headers = {"accept": "application/json"}
        if config.TRONGRID_API_KEY:
            headers["TRON-PRO-API-KEY"] = config.TRONGRID_API_KEY
        return headers

    @classmethod
    def get_trc20_transfers(cls, address: str) -> List[dict]:
        cache_key = f"tron_trc20_{address}"
        if cache_key in _API_CACHE:
            return _API_CACHE[cache_key]

        url = f"{cls.BASE_URL}/v1/accounts/{address}/transactions/trc20?limit=30"
        for attempt in range(2):
            try:
                r = httpx.get(url, headers=cls._headers(), timeout=5.0)
                if r.status_code == 200:
                    data = r.json()
                    res = data.get("data", [])
                    _API_CACHE[cache_key] = res
                    return res
                time.sleep(0.15 * (2 ** attempt))
            except Exception as e:
                logger.warning(f"TronGrid TRC20 error (attempt {attempt+1}): {e}")
                time.sleep(0.15 * (2 ** attempt))
        return []

    @classmethod
    def get_trx_transfers(cls, address: str) -> List[dict]:
        cache_key = f"tron_trx_{address}"
        if cache_key in _API_CACHE:
            return _API_CACHE[cache_key]

        url = f"{cls.BASE_URL}/v1/accounts/{address}/transactions?limit=30"
        for attempt in range(2):
            try:
                r = httpx.get(url, headers=cls._headers(), timeout=5.0)
                if r.status_code == 200:
                    data = r.json()
                    res = data.get("data", [])
                    _API_CACHE[cache_key] = res
                    return res
                time.sleep(0.15 * (2 ** attempt))
            except Exception as e:
                logger.warning(f"TronGrid TRX error (attempt {attempt+1}): {e}")
                time.sleep(0.15 * (2 ** attempt))
        return []


class BitcoinClient:
    MEMPOOL_URL = "https://mempool.space/api"
    BLOCKSTREAM_URL = "https://blockstream.info/api"

    @classmethod
    def get_address_txs(cls, address: str) -> List[dict]:
        cache_key = f"btc_txs_{address}"
        if cache_key in _API_CACHE:
            return _API_CACHE[cache_key]

        url = f"{cls.MEMPOOL_URL}/address/{address}/txs"
        try:
            r = httpx.get(url, timeout=5.0)
            if r.status_code == 200:
                res = r.json()
                _API_CACHE[cache_key] = res
                return res
        except Exception as e:
            logger.warning(f"Mempool.space request failed: {e}. Trying Blockstream fallback...")

        url_bs = f"{cls.BLOCKSTREAM_URL}/address/{address}/txs"
        try:
            r = httpx.get(url_bs, timeout=5.0)
            if r.status_code == 200:
                res = r.json()
                _API_CACHE[cache_key] = res
                return res
        except Exception as e:
            logger.warning(f"Blockstream request failed: {e}")

        return []
