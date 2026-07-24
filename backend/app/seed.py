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
        # (name, icon, price per kg, estimated kg CO2e avoided per kg recycled)
        categories = [
            ("Mobile Phone", "\U0001F4F1", 120.0, 3.5),
            ("Laptop", "\U0001F4BB", 90.0, 3.0),
            ("Desktop Computer", "\U0001F5A5", 70.0, 2.5),
            ("LED / LCD TV", "\U0001F4FA", 55.0, 2.0),
            ("Refrigerator", "\U0001F9CA", 35.0, 1.8),
            ("Washing Machine", "\U0001F300", 40.0, 1.5),
            ("Air Conditioner", "\u2744\ufe0f", 45.0, 2.2),
            ("Microwave Oven", "\U0001F372", 30.0, 1.6),
            ("Printer", "\U0001F5A8", 25.0, 1.4),
            ("Batteries", "\U0001F50B", 15.0, 4.0),
        ]
        for name, icon, price, co2 in categories:
            db.add(Category(name=name, icon=icon, base_price_per_kg=price, co2_factor_kg=co2))

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

        # --- Platform settings ---------------------------------------------
        settings = [
            ("platform_name", "Reloop", "Displayed name of the platform"),
            ("support_email", "support@reloop.com", "Public support email"),
            ("support_phone", "1800-000-1234", "Public support phone number"),
            ("service_cities", "Patna,Delhi", "Comma-separated list of serviceable cities"),
            ("default_pickup_charge", "50", "Default pickup charge (Rs.) suggested to centres"),
            ("default_handling_charge", "30", "Default handling charge (Rs.) suggested to centres"),
            ("platform_fee_percent", "5", "Platform commission (%) of material value, for revenue reporting"),
            ("partner_pickup_fee", "40", "Flat fee (Rs.) paid to a pickup partner per completed job"),
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
