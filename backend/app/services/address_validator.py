import re

def detect_and_validate_address(address: str) -> tuple[bool, str, str]:
    """
    Validates a crypto wallet address and detects its blockchain.
    Returns: (is_valid: bool, chain: str, error_message: str)
    """
    if not address or not isinstance(address, str):
        return False, "", "Address cannot be empty"

    addr = address.strip()

    # Ethereum / EVM Check: 0x + 40 hex chars
    if re.match(r"^0x[a-fA-F0-9]{40}$", addr):
        return True, "ethereum", ""

    # TRON Check: Base58 string starting with T, length 34
    if re.match(r"^T[a-zA-Z0-9]{33}$", addr):
        return True, "tron", ""

    # Bitcoin Check: Legacy (1...), P2SH (3...), or Bech32 (bc1...)
    if re.match(r"^(1[a-km-zA-HJ-NP-Z1-9]{25,34}|3[a-km-zA-HJ-NP-Z1-9]{25,34}|bc1[a-zA-Z0-9]{25,60})$", addr):
        return True, "bitcoin", ""

    return False, "", "Invalid wallet address format for supported chains (Ethereum, TRON, Bitcoin)"
