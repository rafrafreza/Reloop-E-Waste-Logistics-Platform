from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload

from app.auth import get_current_user
from app.database import get_db
from app.models import CollectionRequest, SupportTicket, User
from app.schemas import SupportTicketCreate, SupportTicketOut

router = APIRouter(prefix="/api/support", tags=["support"])


def _ticket_out(t: SupportTicket) -> SupportTicketOut:
    return SupportTicketOut(
        id=t.id, user_id=t.user_id, user_name=t.user.full_name if t.user else None,
        user_role=t.user.role if t.user else None, request_id=t.request_id, subject=t.subject,
        message=t.message, status=t.status, admin_response=t.admin_response,
        created_at=t.created_at, updated_at=t.updated_at,
    )


@router.post("/tickets", response_model=SupportTicketOut, status_code=201)
def create_ticket(payload: SupportTicketCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    if payload.request_id is not None:
        req = db.get(CollectionRequest, payload.request_id)
        if not req:
            raise HTTPException(status_code=404, detail="Request not found")

    ticket = SupportTicket(
        user_id=user.id, request_id=payload.request_id, subject=payload.subject, message=payload.message,
    )
    db.add(ticket)
    db.commit()
    db.refresh(ticket)
    ticket = db.query(SupportTicket).options(joinedload(SupportTicket.user)).filter(SupportTicket.id == ticket.id).first()
    return _ticket_out(ticket)


@router.get("/tickets", response_model=list[SupportTicketOut])
def list_my_tickets(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    tickets = (
        db.query(SupportTicket)
        .options(joinedload(SupportTicket.user))
        .filter(SupportTicket.user_id == user.id)
        .order_by(SupportTicket.created_at.desc())
        .all()
    )
    return [_ticket_out(t) for t in tickets]


@router.get("/tickets/{ticket_id}", response_model=SupportTicketOut)
def get_my_ticket(ticket_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    ticket = (
        db.query(SupportTicket)
        .options(joinedload(SupportTicket.user))
        .filter(SupportTicket.id == ticket_id)
        .first()
    )
    if not ticket or (ticket.user_id != user.id and user.role != "ADMIN"):
        raise HTTPException(status_code=404, detail="Ticket not found")
    return _ticket_out(ticket)
