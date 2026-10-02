import logging
from neo4j import GraphDatabase
from app import config

logger = logging.getLogger("cryptotrace.neo4j")

_driver = None

def get_neo4j_driver():
    global _driver
    if not config.NEO4J_URI or not config.NEO4J_USER or not config.NEO4J_PASSWORD:
        return None
    if _driver is None:
        try:
            _driver = GraphDatabase.driver(
                config.NEO4J_URI,
                auth=(config.NEO4J_USER, config.NEO4J_PASSWORD)
            )
        except Exception as e:
            logger.warning(f"Failed to initialize Neo4j driver: {e}")
            return None
    return _driver

def check_neo4j_connection() -> bool:
    driver = get_neo4j_driver()
    if not driver:
        return False
    try:
        with driver.session() as session:
            result = session.run("RETURN 1 as test")
            record = result.single()
            return record and record["test"] == 1
    except Exception as e:
        logger.warning(f"Neo4j connection test failed: {e}")
        return False

def close_neo4j():
    global _driver
    if _driver:
        _driver.close()
        _driver = None
