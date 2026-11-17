# backend/seed_shops.py
"""
Seed sample shops, menu items, and shopkeeper users.

Run once from project root:
    python -m backend.seed_shops

Idempotent — safe to re-run.
"""
from decimal import Decimal
from backend.app.database.database import SessionLocal, engine, Base
from backend.app.models.user import User
from backend.app.models.shop import Shop
from backend.app.models.menu_item import MenuItem
from backend.app.utils.auth import get_password_hash


SHOPS = [
    {
        "shopkeeper": {
            "email": "sharma@campus.local",
            "username": "sharma_cafe",
            "password": "Cafe@123",
        },
        "shop": {
            "name": "Sharma Cafe",
            "description": "Hot beverages and quick bites near Hostel A",
        },
        "menu": [
            {"name": "Veg Sandwich", "price": Decimal("45.00"), "description": "Grilled with veggies"},
            {"name": "Paneer Sandwich", "price": Decimal("65.00"), "description": "Paneer + mint chutney"},
            {"name": "Masala Tea", "price": Decimal("15.00"), "description": None},
            {"name": "Cold Coffee", "price": Decimal("55.00"), "description": None},
        ],
    },
    {
        "shopkeeper": {
            "email": "rao@campus.local",
            "username": "rao_snacks",
            "password": "Snack@123",
        },
        "shop": {
            "name": "Rao Snacks Corner",
            "description": "Late-night snacks for hostellers",
        },
        "menu": [
            {"name": "Samosa", "price": Decimal("20.00"), "description": "Two pieces"},
            {"name": "Vada Pav", "price": Decimal("25.00"), "description": None},
            {"name": "Chicken Sandwich", "price": Decimal("80.00"), "description": "Spicy grilled"},
        ],
    },
    {
        "shopkeeper": {
            "email": "gupta@campus.local",
            "username": "gupta_dhaba",
            "password": "Dhaba@123",
        },
        "shop": {
            "name": "Gupta Dhaba",
            "description": "Full meals and tiffin service",
        },
        "menu": [
            {"name": "Veg Thali", "price": Decimal("120.00"), "description": "Dal, sabzi, roti, rice"},
            {"name": "Paneer Butter Masala", "price": Decimal("150.00"), "description": "With 3 rotis"},
            {"name": "Tea", "price": Decimal("15.00"), "description": None},
        ],
    },
]


def get_or_create_user(db, email, username, password, role="shopkeeper"):
    user = db.query(User).filter(User.email == email).first()
    if user:
        if user.role != role:
            user.role = role
        return user
    user = User(
        email=email,
        username=username,
        hashed_password=get_password_hash(password),
        role=role,
    )
    db.add(user)
    db.flush()
    return user


def get_or_create_shop(db, owner_id, name, description):
    shop = db.query(Shop).filter(Shop.name == name).first()
    if shop:
        return shop
    shop = Shop(name=name, description=description, owner_id=owner_id, is_open=True)
    db.add(shop)
    db.flush()
    return shop


def get_or_create_menu_item(db, shop_id, name, price, description):
    item = db.query(MenuItem).filter(
        MenuItem.shop_id == shop_id, MenuItem.name == name
    ).first()
    if item:
        return item
    item = MenuItem(
        shop_id=shop_id, name=name, price=price,
        description=description, is_available=True,
    )
    db.add(item)
    db.flush()
    return item


def main():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        for entry in SHOPS:
            u = get_or_create_user(
                db,
                email=entry["shopkeeper"]["email"],
                username=entry["shopkeeper"]["username"],
                password=entry["shopkeeper"]["password"],
            )
            shop = get_or_create_shop(
                db,
                owner_id=u.id,
                name=entry["shop"]["name"],
                description=entry["shop"]["description"],
            )
            for m in entry["menu"]:
                get_or_create_menu_item(db, shop.id, m["name"], m["price"], m["description"])
            print(f"✅ {shop.name} ready (owner: {u.email})")
        db.commit()
        print("\nDone. Shopkeeper credentials:")
        for entry in SHOPS:
            print(f"  {entry['shopkeeper']['email']} / {entry['shopkeeper']['password']}")
    finally:
        db.close()


if __name__ == "__main__":
    main()