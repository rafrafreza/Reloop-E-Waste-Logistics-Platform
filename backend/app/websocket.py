import asyncio
from fastapi import WebSocket

import logging

class ConnectionManager:
    def __init__(self):
        # Maps user_id -> list of active WebSockets (one user can have multiple tabs)
        self.active_connections: dict[int, list[WebSocket]] = {}
        # Global reference to the main event loop
        self.main_loop: asyncio.AbstractEventLoop | None = None

    async def connect(self, user_id: int, websocket: WebSocket):
        if user_id not in self.active_connections:
            self.active_connections[user_id] = []
        self.active_connections[user_id].append(websocket)

    def disconnect(self, user_id: int, websocket: WebSocket):
        if user_id in self.active_connections:
            if websocket in self.active_connections[user_id]:
                self.active_connections[user_id].remove(websocket)
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]

    async def send_personal_message(self, user_id: int, message: dict):
        if user_id in self.active_connections:
            # Create a copy of the list to safely iterate in case of disconnects during iteration
            for connection in list(self.active_connections[user_id]):
                try:
                    await asyncio.wait_for(connection.send_json(message), timeout=2.0)
                except Exception:
                    # If sending fails (e.g., dead socket), disconnect it
                    self.disconnect(user_id, connection)

    def push_sync(self, user_id: int, message: dict):
        """Thread-safe method to push messages from synchronous routes."""
        if self.main_loop and self.main_loop.is_running():
            future = asyncio.run_coroutine_threadsafe(
                self.send_personal_message(user_id, message), 
                self.main_loop
            )
            future.add_done_callback(self._log_push_result)

    @staticmethod
    def _log_push_result(future):
        try:
            future.result()
        except Exception:
            logging.exception("WebSocket push failed")

manager = ConnectionManager()
