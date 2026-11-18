# backend/seed_shops.py
"""
Seed demo shops, menu items, and shopkeeper users.

Run once from project root:
    python -m backend.seed_shops

Idempotent — safe to re-run (existing entries are preserved, not duplicated).
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
            "description": "North Indian snacks, tea, and coffee — near Hostel A",
        },
        "menu": [
            {"name": "Veg Sandwich",   "price": Decimal("45.00"), "description": "Grilled with veggies"},
            {"name": "Paneer Sandwich","price": Decimal("65.00"), "description": "Paneer + mint chutney"},
            {"name": "Masala Tea",     "price": Decimal("15.00"), "description": None},
            {"name": "Cold Coffee",    "price": Decimal("55.00"), "description": None},
            {"name": "Samosa",         "price": Decimal("20.00"), "description": "Two pieces"},
            {"name": "Bread Pakora",   "price": Decimal("25.00"), "description": None},
            {"name": "Maggi",          "price": Decimal("40.00"), "description": "Plain or masala"},
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
            "description": "South Indian quick bites — near Hostel B",
        },
        "menu": [
            {"name": "Vada Pav",         "price": Decimal("25.00"), "description": None},
            {"name": "Chicken Sandwich", "price": Decimal("80.00"), "description": "Spicy grilled"},
            {"name": "Idli Sambar",      "price": Decimal("40.00"), "description": "3 pieces"},
            {"name": "Dosa",             "price": Decimal("50.00"), "description": "Plain or masala"},
            {"name": "Filter Coffee",    "price": Decimal("20.00"), "description": None},
            {"name": "Medu Vada",        "price": Decimal("30.00"), "description": "2 pieces"},
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
            "description": "Full meals and tiffin service — near Main Gate",
        },
        "menu": [
            {"name": "Veg Thali",            "price": Decimal("120.00"), "description": "Dal, sabzi, roti, rice"},
            {"name": "Paneer Butter Masala", "price": Decimal("150.00"), "description": "With 3 rotis"},
            {"name": "Dal Makhani",          "price": Decimal("100.00"), "description": None},
            {"name": "Butter Naan",          "price": Decimal("30.00"),  "description": "Per piece"},
            {"name": "Chicken Curry",        "price": Decimal("180.00"), "description": "With rice"},
            {"name": "Jeera Rice",           "price": Decimal("60.00"),  "description": None},
        ],
    },
    {
        "shopkeeper": {
            "email": "cafe24@campus.local",
            "username": "cafe_247",
            "password": "Cafe24@123",
        },
        "shop": {
            "name": "Cafe 24/7",
            "description": "Open 24 hours — coffee, sandwiches, and desserts",
        },
        "menu": [
            {"name": "Espresso",       "price": Decimal("40.00"), "description": None},
            {"name": "Cappuccino",     "price": Decimal("60.00"), "description": None},
            {"name": "Latte",          "price": Decimal("70.00"), "description": None},
            {"name": "Club Sandwich",  "price": Decimal("90.00"), "description": "Triple decker"},
            {"name": "Grilled Cheese", "price": Decimal("70.00"), "description": None},
            {"name": "Brownie",        "price": Decimal("50.00"), "description": "Warm with ice cream"},
            {"name": "Hot Chocolate",  "price": Decimal("65.00"), "description": None},
        ],
    },
    {
        "shopkeeper": {
            "email": "juice@campus.local",
            "username": "juice_junction",
            "password": "Juice@123",
        },
        "shop": {
            "name": "Juice Junction",
            "description": "Fresh juices and shakes — near Library",
        },
        "menu": [
            {"name": "Orange Juice",  "price": Decimal("50.00"), "description": "Fresh squeezed"},
            {"name": "Mango Shake",   "price": Decimal("70.00"), "description": "Seasonal"},
            {"name": "Banana Shake",  "price": Decimal("60.00"), "description": None},
            {"name": "Mixed Fruit",   "price": Decimal("80.00"), "description": None},
            {"name": "Lemon Soda",    "price": Decimal("30.00"), "description": None},
            {"name": "Cold Coffee",   "price": Decimal("55.00"), "description": "With ice cream"},
        ],
    },
    {
        "shopkeeper": {
            "email": "momos@campus.local",
            "username": "momos_point",
            "password": "Momos@123",
        },
        "shop": {
            "name": "Momos Point",
            "description": "Momos, noodles, and Chinese — near Sports Complex",
        },
        "menu": [
            {"name": "Veg Momos",     "price": Decimal("50.00"),  "description": "6 pieces"},
            {"name": "Chicken Momos", "price": Decimal("70.00"),  "description": "6 pieces"},
            {"name": "Paneer Momos",  "price": Decimal("65.00"),  "description": "6 pieces"},
            {"name": "Hakka Noodles", "price": Decimal("80.00"),  "description": "Veg or chicken"},
            {"name": "Fried Rice",    "price": Decimal("90.00"),  "description": None},
            {"name": "Manchurian",    "price": Decimal("100.00"), "description": "Gravy or dry"},
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
        total_items = 0
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
                total_items += 1
            print(f"✅ {shop.name} ready ({len(entry['menu'])} items)")
        db.commit()

        # Final summary
        shop_count = db.query(Shop).count()
        item_count = db.query(MenuItem).count()
        print(f"\n📊 Total: {shop_count} shops, {item_count} menu items")
        print("\n🔑 Shopkeeper credentials:")
        for entry in SHOPS:
            print(f"   {entry['shopkeeper']['email']:25s} / {entry['shopkeeper']['password']}")
    finally:
        db.close()


if __name__ == "__main__":
    main()