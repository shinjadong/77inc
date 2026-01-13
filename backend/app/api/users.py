"""
사용자 관리 API
"""
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.repositories.user_repo import UserRepository
from app.repositories.card_repo import CardRepository

router = APIRouter()


class UserCreate(BaseModel):
    """사용자 생성 요청"""
    name: str
    employee_id: Optional[str] = None
    department: Optional[str] = None
    position: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None


class UserUpdate(BaseModel):
    """사용자 수정 요청"""
    name: Optional[str] = None
    employee_id: Optional[str] = None
    department: Optional[str] = None
    position: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    is_active: Optional[bool] = None


class UserResponse(BaseModel):
    """사용자 응답"""
    id: int
    name: str
    employee_id: Optional[str]
    department: Optional[str]
    position: Optional[str]
    phone: Optional[str]
    email: Optional[str]
    is_active: bool


class CardAssign(BaseModel):
    """카드 할당 요청"""
    card_id: int


@router.get("")
async def list_users(
    active_only: bool = True,
    department: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """사용자 목록 조회"""
    user_repo = UserRepository(db)

    if department:
        users = user_repo.get_by_department(department)
    else:
        users = user_repo.get_all(active_only=active_only)

    return {
        "users": [
            {
                "id": u.id,
                "name": u.name,
                "employee_id": u.employee_id,
                "department": u.department,
                "position": u.position,
                "phone": u.phone,
                "email": u.email,
                "is_active": u.is_active,
                "card_count": len(u.cards) if u.cards else 0,
            }
            for u in users
        ]
    }


@router.get("/{user_id}")
async def get_user(
    user_id: int,
    db: Session = Depends(get_db),
):
    """사용자 상세 조회"""
    user_repo = UserRepository(db)
    user = user_repo.get_by_id(user_id)

    if not user:
        raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다")

    return {
        "id": user.id,
        "name": user.name,
        "employee_id": user.employee_id,
        "department": user.department,
        "position": user.position,
        "phone": user.phone,
        "email": user.email,
        "is_active": user.is_active,
        "cards": [
            {
                "id": c.id,
                "card_number": c.card_number,
                "card_name": c.card_name,
                "card_type": c.card_type,
                "is_active": c.is_active,
            }
            for c in user.cards
        ] if user.cards else [],
    }


@router.get("/{user_id}/cards")
async def get_user_cards(
    user_id: int,
    db: Session = Depends(get_db),
):
    """사용자의 카드 목록 조회"""
    user_repo = UserRepository(db)
    user = user_repo.get_by_id(user_id)

    if not user:
        raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다")

    return {
        "user_id": user.id,
        "user_name": user.name,
        "cards": [
            {
                "id": c.id,
                "card_number": c.card_number,
                "card_name": c.card_name,
                "card_type": c.card_type,
                "is_active": c.is_active,
                "transaction_count": len(c.transactions) if c.transactions else 0,
            }
            for c in user.cards
        ] if user.cards else [],
    }


@router.post("")
async def create_user(
    request: UserCreate,
    db: Session = Depends(get_db),
):
    """새 사용자 등록"""
    user_repo = UserRepository(db)

    # 사번 중복 확인
    if request.employee_id:
        existing = user_repo.get_by_employee_id(request.employee_id)
        if existing:
            raise HTTPException(status_code=400, detail="이미 등록된 사번입니다")

    user = user_repo.create(
        name=request.name,
        employee_id=request.employee_id,
        department=request.department,
        position=request.position,
        phone=request.phone,
        email=request.email,
    )

    return {
        "success": True,
        "user": {
            "id": user.id,
            "name": user.name,
            "employee_id": user.employee_id,
            "department": user.department,
            "position": user.position,
        },
    }


@router.put("/{user_id}")
async def update_user(
    user_id: int,
    request: UserUpdate,
    db: Session = Depends(get_db),
):
    """사용자 정보 수정"""
    user_repo = UserRepository(db)

    update_data = request.model_dump(exclude_none=True)
    if not update_data:
        raise HTTPException(status_code=400, detail="수정할 내용이 없습니다")

    # 사번 중복 확인
    if "employee_id" in update_data:
        existing = user_repo.get_by_employee_id(update_data["employee_id"])
        if existing and existing.id != user_id:
            raise HTTPException(status_code=400, detail="이미 사용 중인 사번입니다")

    user = user_repo.update(user_id, **update_data)
    if not user:
        raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다")

    return {
        "success": True,
        "user": {
            "id": user.id,
            "name": user.name,
            "employee_id": user.employee_id,
            "department": user.department,
            "position": user.position,
            "phone": user.phone,
            "email": user.email,
            "is_active": user.is_active,
        },
    }


@router.delete("/{user_id}")
async def deactivate_user(
    user_id: int,
    db: Session = Depends(get_db),
):
    """사용자 비활성화"""
    user_repo = UserRepository(db)
    success = user_repo.deactivate(user_id)

    if not success:
        raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다")

    return {"success": True, "message": "사용자가 비활성화되었습니다"}


@router.post("/{user_id}/cards")
async def assign_card_to_user(
    user_id: int,
    request: CardAssign,
    db: Session = Depends(get_db),
):
    """사용자에게 카드 할당"""
    user_repo = UserRepository(db)
    card_repo = CardRepository(db)

    user = user_repo.get_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다")

    card = card_repo.get_by_id(request.card_id)
    if not card:
        raise HTTPException(status_code=404, detail="카드를 찾을 수 없습니다")

    # 카드에 사용자 할당
    card_repo.update(request.card_id, user_id=user_id)

    return {
        "success": True,
        "message": f"카드 {card.card_number}이(가) {user.name}에게 할당되었습니다",
        "user_id": user_id,
        "card_id": card.id,
    }


@router.delete("/{user_id}/cards/{card_id}")
async def unassign_card_from_user(
    user_id: int,
    card_id: int,
    db: Session = Depends(get_db),
):
    """사용자에게서 카드 할당 해제"""
    user_repo = UserRepository(db)
    card_repo = CardRepository(db)

    user = user_repo.get_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다")

    card = card_repo.get_by_id(card_id)
    if not card:
        raise HTTPException(status_code=404, detail="카드를 찾을 수 없습니다")

    if card.user_id != user_id:
        raise HTTPException(status_code=400, detail="이 카드는 해당 사용자에게 할당되어 있지 않습니다")

    # 카드에서 사용자 할당 해제
    card_repo.update(card_id, user_id=None)

    return {
        "success": True,
        "message": f"카드 {card.card_number}의 할당이 해제되었습니다",
    }


@router.get("/search/{name}")
async def search_users(
    name: str,
    db: Session = Depends(get_db),
):
    """이름으로 사용자 검색"""
    user_repo = UserRepository(db)
    users = user_repo.search_by_name(name)

    return {
        "users": [
            {
                "id": u.id,
                "name": u.name,
                "department": u.department,
                "position": u.position,
            }
            for u in users
        ]
    }
