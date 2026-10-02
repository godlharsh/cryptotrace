import time
import httpx
from app import config

class CurrencyService:
    _rate_cache = None
    _last_fetched = 0.0
    _cache_ttl_seconds = 600  # 10 minutes

    @classmethod
    def get_usd_inr_rate(cls) -> float:
        now = time.time()
        if cls._rate_cache and (now - cls._last_fetched) < cls._cache_ttl_seconds:
            return cls._rate_cache

        try:
            url = "https://api.coingecko.com/api/v3/simple/price?ids=tether&vs_currencies=inr"
            headers = {}
            if config.COINGECKO_API_KEY:
                headers["x-cg-demo-api-key"] = config.COINGECKO_API_KEY

            with httpx.Client(timeout=4.0) as client:
                res = client.get(url, headers=headers)
                if res.status_code == 200:
                    data = res.json()
                    rate = float(data["tether"]["inr"])
                    if rate > 50.0:
                        cls._rate_cache = rate
                        cls._last_fetched = now
                        print(f"[CurrencyService] Updated live CoinGecko USD/INR rate: {rate}")
                        return rate
        except Exception as e:
            print(f"[CurrencyService] CoinGecko rate fetch notice: {e}")

        # Fallback to configured default
        return config.FALLBACK_USD_INR
