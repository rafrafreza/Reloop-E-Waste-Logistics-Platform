"""Payout orchestration - business logic for consumer & partner payouts."""
import json
import logging

from sqlalchemy.orm import Session

from app.models import CollectionRequest, Payout, PartnerProfile, User
from app.cashfree import create_upi_transfer, generate_transfer_id
from app.utils import notify

logger = logging.getLogger(__name__)


def process_consumer_payout(db: Session, req: CollectionRequest) -> None:
    """Called at OTP verification (PICKED_UP). Creates a Payout record and
    optionally fires a Cashfree transfer if payment_method == ONLINE."""

    if not req.quotation:
        return

    amount = req.quotation.total_amount
    if amount <= 0:
        return

    # Check for duplicate
    existing = db.query(Payout).filter(
        Payout.request_id == req.id,
        Payout.payout_type == "CONSUMER",
    ).first()
    if existing:
        return

    payout = Payout(
        request_id=req.id,
        user_id=req.consumer_id,
        payout_type="CONSUMER",
        amount=amount,
        payment_method=req.payment_method,
        upi_id=req.consumer_upi_id,
    )

    if req.payment_method == "CASH":
        payout.status = "CASH_COLLECTED"
        db.add(payout)
        notify(db, req.consumer_id, "Cash payment",
               f"Rs.{amount:.2f} to be collected in cash from the pickup partner.")
        return

    # ONLINE -> Cashfree UPI transfer
    transfer_id = generate_transfer_id("RLC")
    payout.transfer_id = transfer_id
    payout.status = "PROCESSING"

    try:
        result = create_upi_transfer(
            transfer_id=transfer_id,
            amount=amount,
            vpa=req.consumer_upi_id,
            beneficiary_name=req.consumer.full_name if req.consumer else "Consumer",
            beneficiary_phone=req.consumer.phone if req.consumer else "",
            remarks="Reloop Consumer Payout",
        )
        payout.cashfree_status_code = result.get("status")
        payout.beneficiary_id = result.get("beneficiary_details", {}).get("beneficiary_id")

        if result.get("http_status") in (200, 201):
            cf_status = result.get("status", "PENDING")
            payout.cashfree_status = cf_status
            payout.status = "SUCCESS" if cf_status == "SUCCESS" else "PROCESSING"
            notify(db, req.consumer_id, "Payout initiated",
                   f"Rs.{amount:.2f} is being transferred to your UPI ({req.consumer_upi_id}).")
        else:
            payout.status = "FAILED"
            payout.cashfree_status = "ERROR"
            error_msg = result.get("message", "Unknown error")
            notify(db, req.consumer_id, "Payout failed",
                   f"Payout of Rs.{amount:.2f} failed: {error_msg}. Our team will retry.")
            logger.error("Consumer payout failed for request %s: %s", req.id, result)

    except Exception as e:
        payout.status = "FAILED"
        payout.cashfree_status = "ERROR"
        payout.cashfree_status_code = "EXCEPTION"
        logger.exception("Cashfree API error for request %s", req.id)

    db.add(payout)


def process_partner_payout(db: Session, partner_user_id: int) -> dict:
    """Called by admin to process a partner's accumulated wallet balance.
    Creates a single Cashfree transfer for the total pending amount."""

    profile = db.query(PartnerProfile).filter(
        PartnerProfile.user_id == partner_user_id
    ).first()
    if not profile:
        return {"error": "Partner profile not found"}
    if not profile.upi_id:
        return {"error": "Partner has no UPI ID configured"}

    amount = profile.total_earnings
    if amount <= 0:
        return {"error": "No balance to pay out"}

    transfer_id = generate_transfer_id("RLP")

    payout = Payout(
        user_id=partner_user_id,
        payout_type="PARTNER",
        amount=amount,
        payment_method="ONLINE",
        upi_id=profile.upi_id,
        transfer_id=transfer_id,
        status="PROCESSING",
    )

    try:
        user = db.query(User).get(partner_user_id)
        result = create_upi_transfer(
            transfer_id=transfer_id,
            amount=amount,
            vpa=profile.upi_id,
            beneficiary_name=user.full_name if user else "Partner",
            beneficiary_phone=user.phone if user else "",
            remarks="Reloop partner payout",
        )
        payout.cashfree_status_code = result.get("status")
        payout.beneficiary_id = result.get("beneficiary_details", {}).get("beneficiary_id")

        if result.get("http_status") in (200, 201):
            cf_status = result.get("status", "PENDING")
            payout.cashfree_status = cf_status
            payout.status = "SUCCESS" if cf_status == "SUCCESS" else "PROCESSING"
            profile.total_earnings = 0.0
            notify(db, partner_user_id, "Payout sent",
                   f"Rs.{amount:.2f} has been transferred to your UPI ({profile.upi_id}).")
        else:
            payout.status = "FAILED"
            payout.cashfree_status = "ERROR"
            error_msg = result.get("message", "Unknown error")
            logger.error("Partner payout failed for user %s: %s", partner_user_id, result)
            db.add(payout)
            db.commit()
            return {"error": f"Cashfree error: {error_msg}"}

    except Exception as e:
        payout.status = "FAILED"
        payout.cashfree_status_code = "EXCEPTION"
        logger.exception("Cashfree API error for partner %s", partner_user_id)
        db.add(payout)
        db.commit()
        return {"error": str(e)}

    db.add(payout)
    db.commit()
    return {"ok": True, "transfer_id": transfer_id, "amount": amount}
