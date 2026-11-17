# backend/app/api/orders.py
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.app.database.database import get_db
from backend.app.models.shop import Shop
from backend.app.models.order import Order, OrderItem
from backend.app.models.user import User
from backend.app.schemas.order import OrderOut, OrderStatusUpdate
from backend.app.utils.auth import get_current_user

router = APIRouter(prefix="/orders", tags=["Orders"])

# Allowed status transitions per role
SHOP_TRANSITIONS = {
    "pending":   {"accepted", "cancelled"},
    "accepted":  {"preparing", "cancelled"},
    "preparing": {"ready"},
    "ready":     {"completed"},
    "completed": set(),
    "cancelled": set(),
}

STUDENT_TRANSITIONS = {
    "pending": {"cancelled"},
}


def _order_to_dict(order: Order, db: Session):
    items = db.query(OrderItem).filter(OrderItem.order_id == order.id).all()
    return {
        "id": order.id,
        "student_id": order.student_id,
        "shop_id": order.shop_id,
        "status": order.status,
        "total_amount": order.total_amount,
        "note": order.note,
        "created_at": order.created_at,
        "items": [
            {
                "id": i.id,
                "menu_item_id": i.menu_item_id,
                "item_name": i.item_name,
                "quantity": i.quantity,
                "unit_price": i.unit_price,
            }
            for i in items
        ],
    }


# ---------- Student ----------

@router.get("/", response_model=List[OrderOut])
def my_orders(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    orders = (
        db.query(Order)
        .filter(Order.student_id == current_user.id)
        .order_by(Order.created_at.desc())
        .all()
    )
    return [_order_to_dict(o, db) for o in orders]


# ---------- Shopkeeper ----------

@router.get("/incoming", response_model=List[OrderOut])
def incoming_orders(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role != "shopkeeper":
        raise HTTPException(403, "Shopkeeper access required")
    shop = db.query(Shop).filter(Shop.owner_id == current_user.id).first()
    if not shop:
        raise HTTPException(404, "Shop not found")
    orders = (
        db.query(Order)
        .filter(Order.shop_id == shop.id)
        .order_by(Order.created_at.desc())
        .all()
    )
    return [_order_to_dict(o, db) for o in orders]


# ---------- Status updates (both roles) ----------

@router.patch("/{order_id}/status", response_model=OrderOut)
def update_status(
    order_id: int,
    data: OrderStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(404, "Order not found")

    new_status = data.status

    if current_user.role == "shopkeeper":
        shop = db.query(Shop).filter(Shop.owner_id == current_user.id).first()
        if not shop or shop.id != order.shop_id:
            raise HTTPException(403, "Not your order")
        allowed = SHOP_TRANSITIONS.get(order.status, set())
    elif current_user.role == "student":
        if order.student_id != current_user.id:
            raise HTTPException(403, "Not your order")
        allowed = STUDENT_TRANSITIONS.get(order.status, set())
    else:
        raise HTTPException(403, "Admins can't change order status")

    if new_status not in allowed:
        raise HTTPException(
            400,
            f"Cannot change status from '{order.status}' to '{new_status}'. "
            f"Allowed: {sorted(allowed) or 'none'}",
        )

    order.status = new_status
    db.commit()
    db.refresh(order)
    return _order_to_dict(order, db)