import os
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import SystemMessage, HumanMessage

router = APIRouter(prefix="/api/chat", tags=["chat"])

class ChatRequest(BaseModel):
    message: str

# Load knowledge base once at startup
KB_PATH = os.path.join(os.path.dirname(__file__), "..", "knowledge_base.md")
with open(KB_PATH, "r", encoding="utf-8") as f:
    knowledge_base = f.read()

SYSTEM_PROMPT = f"""
You are the official Reloop E-waste Platform AI Assistant.
Use the following knowledge base to answer the user's questions. 
If the information is not in the knowledge base, politely say that you don't have that information.
Keep your answers concise, friendly, and helpful. Answer strictly based on the knowledge base.

--- KNOWLEDGE BASE ---
{knowledge_base}
"""

@router.post("")
def chat_with_bot(req: ChatRequest):
    api_key = os.getenv("GOOGLE_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="GOOGLE_API_KEY is not set in the environment.")
    
    try:
        # User requested gemini-2.5-flash
        llm = ChatGoogleGenerativeAI(model="gemini-3.5-flash-lite", google_api_key=api_key, temperature=0.2)
        messages = [
            SystemMessage(content=SYSTEM_PROMPT),
            HumanMessage(content=req.message)
        ]
        response = llm.invoke(messages)
        reply = response.content
        if isinstance(reply, list):
            reply = " ".join([str(p.get("text", "")) if isinstance(p, dict) else str(p) for p in reply])
        return {"reply": str(reply)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
