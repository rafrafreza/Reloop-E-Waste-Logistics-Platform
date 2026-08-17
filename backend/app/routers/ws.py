import asyncio
import logging
import os
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from jose import jwt

from app.websocket import manager

router = APIRouter(tags=["websockets"])
logger = logging.getLogger(__name__)

SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = "HS256"

ALLOWED_ORIGINS = {"http://localhost:5173", "http://127.0.0.1:5173"}
if os.getenv("FRONTEND_URL"):
    ALLOWED_ORIGINS.add(os.getenv("FRONTEND_URL"))

@router.websocket("/ws/notifications")
async def websocket_endpoint(websocket: WebSocket):
    origin = websocket.headers.get("origin")
    # For local development with postman/wscat, origin might be missing. We allow it if needed, or strictly enforce.
    if origin and origin not in ALLOWED_ORIGINS:
        await websocket.close(code=4403, reason="Origin not allowed")
        return
        
    await websocket.accept()
    user_id = None
    try:
        # 1. Expect the first message to be the authentication token
        auth_data = await asyncio.wait_for(websocket.receive_json(), timeout=5.0)
        token = auth_data.get("token")
        if not token:
            await websocket.close(code=4401, reason="Missing token")
            return
            
        # Verify Token
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id_str = payload.get("sub")
        if not user_id_str:
            await websocket.close(code=4401, reason="Invalid token")
            return
            
        user_id = int(user_id_str)
        logger.info(f"WebSocket authenticated: user_id={user_id}")
        
        # 2. Register the connection manually now that auth succeeded
        await manager.connect(user_id, websocket)
        await websocket.send_json({"type": "auth_success"})
        
        # 3. Enter receive loop to keep connection alive and handle heartbeats
        while True:
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_json({"type": "pong"})
                
    except WebSocketDisconnect:
        if user_id is not None:
            logger.info(f"WebSocket disconnected: user_id={user_id}")
            manager.disconnect(user_id, websocket)
    except Exception:
        # Covers timeout on auth or invalid JWT, plus loop errors
        if user_id is not None:
            manager.disconnect(user_id, websocket)
        try:
            # If user_id is not None, auth succeeded and it's a runtime error
            code = 1011 if user_id is not None else 4401
            await websocket.close(code=code)
        except Exception:
            pass
