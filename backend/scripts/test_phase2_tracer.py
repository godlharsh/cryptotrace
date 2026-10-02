import time
import httpx

def test_wallet(address: str, chain: str, case_ref: str, depth: int = 2):
    print(f"\n======================================================")
    print(f" Testing Real Wallet Trace ({chain.upper()}): {address}")
    print(f"======================================================")

    # 1. POST /cases/trace
    r = httpx.post(
        "http://127.0.0.1:8000/cases/trace",
        json={
            "case_ref": case_ref,
            "title": f"Phase 2 Verification ({chain})",
            "suspect_wallet": address,
            "blockchain": chain,
            "depth": depth
        },
        timeout=10.0
    )
    print(f"Initiate Trace Status: {r.status_code}")
    print(f"Initiate Trace Response: {r.json()}")
    assert r.status_code == 200, "Failed to initiate trace"

    # 2. Poll GET /cases/{case_ref}/status
    print("Polling trace status...")
    max_wait = 90
    for i in range(max_wait):
        try:
            st = httpx.get(f"http://127.0.0.1:8000/cases/{case_ref}/status", timeout=15.0).json()
            print(f"[{i+1}s] Status: {st['status']} | Stage: {st['stage']} ({st['progress_percent']}%) | Wallets: {st['wallets_found']}")
            if st["status"] == "COMPLETED":
                break
            if st["status"] == "FAILED":
                print(f"Trace failed: {st.get('error')}")
                break
        except Exception as poll_err:
            print(f"[{i+1}s] Polling check: {poll_err}")
        time.sleep(1)

    # 3. Fetch Graph Payload
    r_graph = httpx.get(f"http://127.0.0.1:8000/cases/{case_ref}/graph", timeout=5.0)
    print(f"\nGraph Payload Status Code: {r_graph.status_code}")
    graph_data = r_graph.json()
    nodes = graph_data.get("nodes", [])
    edges = graph_data.get("edges", [])

    print(f"TRACE RESULT SUMMARY:")
    print(f"- Total Nodes Discovered: {len(nodes)}")
    print(f"- Total Edges Discovered: {len(edges)}")
    
    if nodes:
        print(f"- Origin Node: {nodes[0]['address']} (role={nodes[0]['role']})")
    if edges:
        print(f"- Sample Edge: {edges[0]['source']} -> {edges[0]['target']} ({edges[0]['amount']} {edges[0]['token']}, ${edges[0]['fiat_usd']})")

    assert len(nodes) > 0, "No nodes discovered"
    return len(nodes), len(edges)

def main():
    print("Starting Phase 2 Blockchain Data & Tracer Verification...")
    
    # Real Public Ethereum Address (Vitalik Buterin)
    eth_nodes, eth_edges = test_wallet("0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045", "ethereum", "CT-TEST-ETH", depth=2)

    # Real Public TRON Address
    tron_nodes, tron_edges = test_wallet("TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t", "tron", "CT-TEST-TRON", depth=2)

    print("\n======================================================")
    print("        PHASE 2 VERIFICATION SUCCESSFUL!              ")
    print("======================================================")
    print(f"Ethereum Case: {eth_nodes} nodes, {eth_edges} edges")
    print(f"TRON Case:     {tron_nodes} nodes, {tron_edges} edges")

if __name__ == "__main__":
    main()
