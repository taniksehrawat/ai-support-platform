# backend/app/api/shops.py
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.app.database.database import get_db
from backend.app.models.shop import Shop
from backend.app.models.menu_item import MenuItem
from backend.app.models.user import User
from backend.app.schemas.shop import (
    ShopOut, ShopUpdate, MenuItemOut, MenuItemCreate, MenuItemUpdate,
)
from backend.app.utils.auth import get_current_user, get_current_shopkeeper

router = APIRouter(prefix="/shops", tags=["Shops"])


# ---------- Public (students can browse) ----------

@router.get("/", response_model=List[ShopOut])
def list_open_shops(db: Session = Depends(get_db), _=Depends(get_current_user)):
    return db.query(Shop).filter(Shop.is_open.is_(True)).order_by(Shop.name).all()


@router.get("/{shop_id}/menu", response_model=List[MenuItemOut])
def get_shop_menu(shop_id: int, db: Session = Depends(get_db), _=Depends(get_current_user)):
    shop = db.query(Shop).filter(Shop.id == shop_id).first()
    if not shop:
        raise HTTPException(404, "Shop not found")
    return (
        db.query(MenuItem)
        .filter(MenuItem.shop_id == shop_id, MenuItem.is_available.is_(True))
        .order_by(MenuItem.name)
        .all()
    )


# ---------- Shopkeeper (own shop) ----------

@router.get("/me", response_model=ShopOut)
def my_shop(db: Session = Depends(get_db), current_user: User = Depends(get_current_shopkeeper)):
    shop = db.query(Shop).filter(Shop.owner_id == current_user.id).first()
    if not shop:
        raise HTTPException(404, "You don't have a shop yet. Contact admin.")
    return shop


@router.patch("/me", response_model=ShopOut)
def update_my_shop(
    data: ShopUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_shopkeeper),
):
    shop = db.query(Shop).filter(Shop.owner_id == current_user.id).first()
    if not shop:
        raise HTTPException(404, "Shop not found")
    if data.description is not None:
        shop.description = data.description
    if data.is_open is not None:
        shop.is_open = data.is_open
    db.commit()
    db.refresh(shop)
    return shop


@router.get("/me/menu", response_model=List[MenuItemOut])
def my_menu(db: Session = Depends(get_db), current_user: User = Depends(get_current_shopkeeper)):
    shop = db.query(Shop).filter(Shop.owner_id == current_user.id).first()
    if not shop:
        raise HTTPException(404, "Shop not found")
    return (
        db.query(MenuItem)
        .filter(MenuItem.shop_id == shop.id)
        .order_by(MenuItem.name)
        .all()
    )


@router.post("/me/menu", response_model=MenuItemOut, status_code=201)
def add_menu_item(
    data: MenuItemCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_shopkeeper),
):
    shop = db.query(Shop).filter(Shop.owner_id == current_user.id).first()
    if not shop:
        raise HTTPException(404, "Shop not found")
    item = MenuItem(
        shop_id=shop.id,
        name=data.name.strip(),
        description=data.description,
        price=data.price,
        is_available=data.is_available,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.patch("/me/menu/{item_id}", response_model=MenuItemOut)
def update_menu_item(
    item_id: int,
    data: MenuItemUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_shopkeeper),
):
    shop = db.query(Shop).filter(Shop.owner_id == current_user.id).first()
    if not shop:
        raise HTTPException(404, "Shop not found")
    item = db.query(MenuItem).filter(MenuItem.id == item_id, MenuItem.shop_id == shop.id).first()
    if not item:
        raise HTTPException(404, "Menu item not found")
    if data.name is not None:
        item.name = data.name.strip()
    if data.description is not None:
        item.description = data.description
    if data.price is not None:
        item.price = data.price
    if data.is_available is not None:
        item.is_available = data.is_available
    db.commit()
    db.refresh(item)
    return item


@router.delete("/me/menu/{item_id}", status_code=204)
def delete_menu_item(
    item_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_shopkeeper),
):
    shop = db.query(Shop).filter(Shop.owner_id == current_user.id).first()
    if not shop:
        raise HTTPException(404, "Shop not found")
    item = db.query(MenuItem).filter(MenuItem.id == item_id, MenuItem.shop_id == shop.id).first()
    if not item:
        raise HTTPException(404, "Menu item not found")
    db.delete(item)
    db.commit()