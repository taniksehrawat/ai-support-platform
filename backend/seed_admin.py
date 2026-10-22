# backend/seed_admin.py
"""
Run once after deployment:
    python -m backend.seed_admin
Creates the admin user (or promotes an existing one).
"""
from backend.app.database.database import SessionLocal, engine, Base
from backend.app.models.user import User
from backend.app.utils.auth import get_password_hash

ADMIN_EMAIL = "admin@cu.ac.in"
ADMIN_USERNAME = "admin"
ADMIN_PASSWORD = "Admin@123"     # CHANGE BEFORE RUNNING

def main():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    user = db.query(User).filter(User.email == ADMIN_EMAIL).first()
    if user:
        user.role = "admin"
        print(f"Promoted existing user {ADMIN_EMAIL} to admin.")
    else:
        db.add(User(
            email=ADMIN_EMAIL,
            username=ADMIN_USERNAME,
            hashed_password=get_password_hash(ADMIN_PASSWORD),
            role="admin",
        ))
        print(f"Created admin user {ADMIN_EMAIL}")
    db.commit()
    db.close()

if __name__ == "__main__":
    main()