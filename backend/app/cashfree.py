"""Cashfree Payouts API integration service."""
import os
import uuid
import logging

import httpx

logger = logging.getLogger(__name__)

CASHFREE_BASE_URL = "https://sandbox.cashfree.com"
CASHFREE_CLIENT_ID = os.getenv("CASHFREE_CLIENT_ID", "")
CASHFREE_CLIENT_SECRET = os.getenv("CASHFREE_CLIENT_SECRET", "")
API_VERSION = "2024-01-01"


def _headers() -> dict:
    return {
        "Content-Type": "application/json",
        "x-api-version": API_VERSION,
        "x-client-id": CASHFREE_CLIENT_ID,
        "x-client-secret": CASHFREE_CLIENT_SECRET,
    }


def generate_transfer_id(prefix: str = "RL") -> str:
    """Generate a unique transfer ID: RL_<uuid_short>"""
    return f"{prefix}_{uuid.uuid4().hex[:12]}"


def create_upi_transfer(
    transfer_id: str,
    amount: float,
    vpa: str,
    beneficiary_name: str,
    beneficiary_phone: str,
    beneficiary_email: str = "",
    remarks: str = "Reloop payout",
) -> dict:
    """
    POST /payout/transfers - Direct UPI transfer.
    Returns the full Cashfree API response dict.
    """
    payload = {
        "transfer_id": transfer_id,
        "transfer_amount": round(amount, 2),
        "transfer_currency": "INR",
        "transfer_mode": "upi",
        "beneficiary_details": {
            "beneficiary_name": beneficiary_name,
            "beneficiary_contact_details": {
                "beneficiary_phone": beneficiary_phone or "0000000000",
                "beneficiary_email": beneficiary_email,
            },
            "beneficiary_instrument_details": {
                "vpa": vpa,
            },
        },
        "transfer_remarks": remarks,
    }
    with httpx.Client(timeout=30) as client:
        resp = client.post(
            f"{CASHFREE_BASE_URL}/payout/transfers",
            json=payload,
            headers=_headers(),
        )
    data = resp.json()
    logger.info("Cashfree create_transfer %s -> %s %s", transfer_id, resp.status_code, data)
    return {"http_status": resp.status_code, **data}


def get_transfer_status(transfer_id: str) -> dict:
    """GET /payout/transfers/{transfer_id} - Check transfer status."""
    with httpx.Client(timeout=30) as client:
        resp = client.get(
            f"{CASHFREE_BASE_URL}/payout/transfers?transfer_id={transfer_id}",
            headers=_headers(),
        )
    return {"http_status": resp.status_code, **resp.json()}
