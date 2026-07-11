import random
import logging
from dataclasses import dataclass
from typing import Dict, List, Optional, Any

logger = logging.getLogger(__name__)

@dataclass
class ClientSession:
    client_id: str
    public_host: str
    public_port: int
    writer: Any  # asyncio.StreamWriter to push messages to this client
    local_endpoints: List[str]  # LAN IP endpoints reported by the client
    public_udp_host: Optional[str] = None
    public_udp_port: Optional[int] = None

class SessionDatabase:
    def __init__(self):
        # Maps client_id -> ClientSession
        self._sessions: Dict[str, ClientSession] = {}
        # Maps (public_host, public_port) -> client_id (for fast cleanup on disconnect)
        self._socket_to_id: Dict[tuple, str] = {}

    def _generate_unique_id(self) -> str:
        """
        Generates a unique 9-digit ID formatted as XXX-XXX-XXX.
        """
        while True:
            num = random.randint(100000000, 999999999)
            formatted_id = f"{num // 1000000:03d}-{(num // 1000) % 1000:03d}-{num % 1000:03d}"
            if formatted_id not in self._sessions:
                return formatted_id

    def register(self, host: str, port: int, writer: Any, local_endpoints: List[str]) -> str:
        """
        Registers a new client and returns its assigned ID.
        """
        client_id = self._generate_unique_id()
        session = ClientSession(
            client_id=client_id,
            public_host=host,
            public_port=port,
            writer=writer,
            local_endpoints=local_endpoints
        )
        self._sessions[client_id] = session
        self._socket_to_id[(host, port)] = client_id
        logger.info(f"Registered client {client_id} from public endpoint {host}:{port}")
        return client_id

    def deregister_by_socket(self, host: str, port: int) -> Optional[str]:
        """
        Deregisters a client based on its public socket endpoint.
        Returns the deregistered client's ID, or None if not found.
        """
        client_id = self._socket_to_id.pop((host, port), None)
        if client_id:
            self._sessions.pop(client_id, None)
            logger.info(f"Deregistered client {client_id} (socket {host}:{port} closed)")
        return client_id

    def get_session(self, client_id: str) -> Optional[ClientSession]:
        """
        Retrieves a client session by its assigned ID.
        """
        return self._sessions.get(client_id)

    def get_all_sessions(self) -> List[ClientSession]:
        """
        Returns a list of all active sessions.
        """
        return list(self._sessions.values())
