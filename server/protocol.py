import json
import logging
from typing import Dict, Any, Tuple, Optional

logger = logging.getLogger(__name__)

# Protocol Message Types
MSG_REGISTER = "REGISTER"
MSG_REGISTER_ACK = "REGISTER_ACK"
MSG_HEARTBEAT = "HEARTBEAT"
MSG_HEARTBEAT_ACK = "HEARTBEAT_ACK"
MSG_CONNECT_TO = "CONNECT_TO"
MSG_PEER_INVITE = "PEER_INVITE"
MSG_PEER_INFO = "PEER_INFO"
MSG_ERROR = "ERROR"
MSG_UDP_REGISTER = "UDP_REGISTER"
MSG_UDP_REGISTER_ACK = "UDP_REGISTER_ACK"

def parse_message(raw_data: str) -> Tuple[Optional[str], Optional[Dict[str, Any]]]:
    """
    Parses a raw protocol message from the TCP stream.
    Expects NDJSON format (newline delimited JSON).
    """
    try:
        data = json.loads(raw_data.strip())
        if not isinstance(data, dict):
            return None, None
        msg_type = data.get("type")
        return msg_type, data
    except json.JSONDecodeError:
        logger.warning(f"Protocol parser failed on raw input: {raw_data!r}")
        return None, None

def make_register_ack(assigned_id: str, keepalive_interval: int = 30) -> str:
    return json.dumps({
        "type": MSG_REGISTER_ACK,
        "assigned_id": assigned_id,
        "keepalive_interval": keepalive_interval
    }) + "\n"

def make_heartbeat_ack() -> str:
    return json.dumps({
        "type": MSG_HEARTBEAT_ACK
    }) + "\n"

def make_peer_invite(peer_id: str, local_endpoints: list, public_host: str, public_port: int) -> str:
    return json.dumps({
        "type": MSG_PEER_INVITE,
        "peer_id": peer_id,
        "peer_endpoints": {
            "local": local_endpoints,
            "public": f"{public_host}:{public_port}"
        }
    }) + "\n"

def make_peer_info(peer_id: str, local_endpoints: list, public_host: str, public_port: int) -> str:
    return json.dumps({
        "type": MSG_PEER_INFO,
        "peer_id": peer_id,
        "peer_endpoints": {
            "local": local_endpoints,
            "public": f"{public_host}:{public_port}"
        }
    }) + "\n"

def make_error(message: str) -> str:
    return json.dumps({
        "type": MSG_ERROR,
        "message": message
    }) + "\n"

def make_udp_register_ack(public_host: str, public_port: int) -> str:
    return json.dumps({
        "type": MSG_UDP_REGISTER_ACK,
        "public_host": public_host,
        "public_port": public_port
    }) + "\n"
