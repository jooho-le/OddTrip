import asyncio
from collections import defaultdict

from fastapi import WebSocket


class ChatConnectionManager:
    """In-process WebSocket fan-out.

    This is sufficient for one API process. When the API runs with multiple
    workers or instances, replace the fan-out behind this class with Redis
    Pub/Sub while keeping the router/service event shapes unchanged.
    """

    def __init__(self) -> None:
        self._connections: dict[str, set[WebSocket]] = defaultdict(set)
        self._lock = asyncio.Lock()

    async def connect(self, user_id: str, websocket: WebSocket) -> None:
        await websocket.accept()
        async with self._lock:
            self._connections[user_id].add(websocket)

    async def disconnect(self, user_id: str, websocket: WebSocket) -> None:
        async with self._lock:
            connections = self._connections.get(user_id)
            if not connections:
                return
            connections.discard(websocket)
            if not connections:
                self._connections.pop(user_id, None)

    async def send_to_users(self, user_ids: set[str], event: dict) -> None:
        async with self._lock:
            targets = [ws for user_id in user_ids for ws in self._connections.get(user_id, set())]

        stale: list[tuple[str, WebSocket]] = []
        for websocket in targets:
            try:
                await websocket.send_json(event)
            except Exception:
                for user_id in user_ids:
                    if websocket in self._connections.get(user_id, set()):
                        stale.append((user_id, websocket))
        for user_id, websocket in stale:
            await self.disconnect(user_id, websocket)


chat_connection_manager = ChatConnectionManager()
