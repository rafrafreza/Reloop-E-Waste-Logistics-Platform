"""
Creates all tables (if missing) and seeds demo data so the app is usable
immediately after `uvicorn app.main:app`. Seeding is idempotent - it only
runs if the users table is empty.
"""
from app.auth import hash_password
from app.database import Base, SessionLocal, engine
from app.models import Category, CentreProfile, PartnerProfile, Setting, User


def run():
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        if db.query(User).count() > 0:
            return  # already seeded

        print("Seeding demo data...")

        # --- Admin -----------------------------------------------------
        admin = User(
            email="admin@reloop.com",
            hashed_password=hash_password("admin123"),
            full_name="Platform Admin",
            phone="9000000001",
            role="ADMIN",
        )
        db.add(admin)

        # --- Categories --------------------------------------------------
        categories = [
            ("Mobile Phone", "\U0001F4F1", 120.0),
            ("Laptop", "\U0001F4BB", 90.0),
            ("Desktop Computer", "\U0001F5A5", 70.0),
            ("LED / LCD TV", "\U0001F4FA", 55.0),
            ("Refrigerator", "\U0001F9CA", 35.0),
            ("Washing Machine", "\U0001F300", 40.0),
            ("Air Conditioner", "\u2744\ufe0f", 45.0),
            ("Microwave Oven", "\U0001F372", 30.0),
            ("Printer", "\U0001F5A8", 25.0),
            ("Batteries", "\U0001F50B", 15.0),
        ]
        for name, icon, price in categories:
            db.add(Category(name=name, icon=icon, base_price_per_kg=price))

        # --- Centres (each is also a login user) ------------------------
        centre_user_1 = User(
            email="centre@reloop.com",
            hashed_password=hash_password("centre123"),
            full_name="Patna Segregation Desk",
            phone="9000000002",
            role="CENTRE",
        )
        centre_user_2 = User(
            email="centre.delhi@reloop.com",
            hashed_password=hash_password("centre123"),
            full_name="Delhi Segregation Desk",
            phone="9000000003",
            role="CENTRE",
        )
        db.add_all([centre_user_1, centre_user_2])
        db.flush()

        centre_1 = CentreProfile(
            user_id=centre_user_1.id,
            centre_name="GreenLoop Segregation Centre - Patna",
            city="Patna",
            address="Industrial Area, Patliputra, Patna",
            capacity_kg=5000,
        )
        centre_2 = CentreProfile(
            user_id=centre_user_2.id,
            centre_name="GreenLoop Segregation Centre - Delhi",
            city="Delhi",
            address="Okhla Industrial Estate, New Delhi",
            capacity_kg=8000,
        )
        db.add_all([centre_1, centre_2])
        db.flush()

        # --- Pickup partners ---------------------------------------------
        partner_user_1 = User(
            email="partner@reloop.com",
            hashed_password=hash_password("partner123"),
            full_name="Rohit Kumar",
            phone="9000000004",
            role="PARTNER",
        )
        partner_user_2 = User(
            email="partner.delhi@reloop.com",
            hashed_password=hash_password("partner123"),
            full_name="Aman Singh",
            phone="9000000005",
            role="PARTNER",
        )
        db.add_all([partner_user_1, partner_user_2])
        db.flush()

        db.add(PartnerProfile(
            user_id=partner_user_1.id, vehicle_number="BR-01-AB-1234",
            city="Patna", status="AVAILABLE", centre_id=centre_1.id,
        ))
        db.add(PartnerProfile(
            user_id=partner_user_2.id, vehicle_number="DL-02-CD-5678",
            city="Delhi", status="AVAILABLE", centre_id=centre_2.id,
        ))

        # --- Demo consumer -------------------------------------------------
        consumer = User(
            email="consumer@reloop.com",
            hashed_password=hash_password("consumer123"),
            full_name="Aisha Verma",
            phone="9000000006",
            role="CONSUMER",
        )
        db.add(consumer)
        db.flush()

        # --- Demo addresses -----------------------------------------------
        from app.models import Address, Assignment, CollectionRequest, InventoryItem, Quotation, RequestItem, StatusHistory
        from datetime import datetime, timedelta

        addr_patna = Address(
            user_id=consumer.id, label="Home", street="Boring Road, Flat 302",
            city="Patna", state="Bihar", pincode="800001", is_default=True
        )
        addr_delhi = Address(
            user_id=consumer.id, label="Office", street="Connaught Place, Block B",
            city="Delhi", state="Delhi", pincode="110001", is_default=False
        )
        db.add_all([addr_patna, addr_delhi])
        db.flush()

        # --- Demo Requests & Lifecycle Data -------------------------------
        cat_map = {c.name: c.id for c in db.query(Category).all()}
        now = datetime.utcnow()

        # Request 1: Completed (Patna) - 5 days ago
        req1 = CollectionRequest(
            consumer_id=consumer.id, address_id=addr_patna.id, centre_id=centre_1.id,
            status="COMPLETED", created_at=now - timedelta(days=5), updated_at=now - timedelta(days=4)
        )
        db.add(req1)
        db.flush()

        db.add(RequestItem(request_id=req1.id, category_id=cat_map.get("Laptop", 1), quantity=2, estimated_weight_kg=4.5, actual_weight_kg=4.8))
        db.add(RequestItem(request_id=req1.id, category_id=cat_map.get("Mobile Phone", 1), quantity=3, estimated_weight_kg=0.6, actual_weight_kg=0.6))
        db.add(Quotation(request_id=req1.id, material_value=500.0, handling_charge=30.0, pickup_charge=50.0, total_amount=420.0, status="ACCEPTED"))
        db.add(Assignment(request_id=req1.id, partner_id=partner_user_1.id, assigned_at=now - timedelta(days=4)))
        db.add(InventoryItem(centre_id=centre_1.id, request_id=req1.id, category_id=cat_map.get("Laptop", 1), weight_kg=4.8, status="RECYCLED", received_at=now - timedelta(days=4)))

        # Request 2: At Centre (Delhi) - 3 days ago
        req2 = CollectionRequest(
            consumer_id=consumer.id, address_id=addr_delhi.id, centre_id=centre_2.id,
            status="AT_CENTRE", created_at=now - timedelta(days=3), updated_at=now - timedelta(days=2)
        )
        db.add(req2)
        db.flush()

        db.add(RequestItem(request_id=req2.id, category_id=cat_map.get("Refrigerator", 1), quantity=1, estimated_weight_kg=45.0, actual_weight_kg=48.0))
        db.add(Quotation(request_id=req2.id, material_value=1500.0, handling_charge=100.0, pickup_charge=150.0, total_amount=1250.0, status="ACCEPTED"))
        db.add(Assignment(request_id=req2.id, partner_id=partner_user_2.id, assigned_at=now - timedelta(days=2)))
        db.add(InventoryItem(centre_id=centre_2.id, request_id=req2.id, category_id=cat_map.get("Refrigerator", 1), weight_kg=48.0, status="IN_STORAGE", received_at=now - timedelta(days=2)))

        # Request 3: Out for Pickup (Patna) - 1 day ago
        req3 = CollectionRequest(
            consumer_id=consumer.id, address_id=addr_patna.id, centre_id=centre_1.id,
            status="OUT_FOR_PICKUP", created_at=now - timedelta(days=1), updated_at=now - timedelta(hours=6)
        )
        db.add(req3)
        db.flush()

        db.add(RequestItem(request_id=req3.id, category_id=cat_map.get("LED / LCD TV", 1), quantity=1, estimated_weight_kg=12.0))
        db.add(Quotation(request_id=req3.id, material_value=600.0, handling_charge=40.0, pickup_charge=60.0, total_amount=500.0, status="ACCEPTED"))
        db.add(Assignment(request_id=req3.id, partner_id=partner_user_1.id, assigned_at=now - timedelta(hours=12)))

        # Request 4: Pending Quotation (Delhi) - Today
        req4 = CollectionRequest(
            consumer_id=consumer.id, address_id=addr_delhi.id, centre_id=None,
            status="PENDING", created_at=now, updated_at=now
        )
        db.add(req4)
        db.flush()

        db.add(RequestItem(request_id=req4.id, category_id=cat_map.get("Printer", 1), quantity=2, estimated_weight_kg=8.0))
        db.add(RequestItem(request_id=req4.id, category_id=cat_map.get("Batteries", 1), quantity=5, estimated_weight_kg=2.5))

        # --- Platform settings ---------------------------------------------
        settings = [
            ("platform_name", "Reloop", "Displayed name of the platform"),
            ("support_email", "support@reloop.com", "Public support email"),
            ("support_phone", "1800-000-1234", "Public support phone number"),
            ("service_cities", "Patna,Delhi", "Comma-separated list of serviceable cities"),
            ("default_pickup_charge", "50", "Default pickup charge (Rs.) suggested to centres"),
            ("default_handling_charge", "30", "Default handling charge (Rs.) suggested to centres"),
        ]
        for key, value, desc in settings:
            db.add(Setting(key=key, value=value, description=desc))

        db.commit()
        print("Seed complete.")
        print("Demo logins: admin@reloop.com / admin123")
        print("             centre@reloop.com / centre123")
        print("             partner@reloop.com / partner123")
        print("             consumer@reloop.com / consumer123")
    finally:
        db.close()

