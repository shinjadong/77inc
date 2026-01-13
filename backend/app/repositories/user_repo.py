"""
사용자 Repository
"""
from typing import Optional, List
from sqlalchemy.orm import Session

from app.models.user import User


class UserRepository:
    """사용자 CRUD 연산"""

    def __init__(self, db: Session):
        self.db = db

    def get_all(self, active_only: bool = True) -> List[User]:
        """모든 사용자 조회"""
        query = self.db.query(User)
        if active_only:
            query = query.filter(User.is_active == True)
        return query.order_by(User.name).all()

    def get_by_id(self, user_id: int) -> Optional[User]:
        """ID로 사용자 조회"""
        return self.db.query(User).filter(User.id == user_id).first()

    def get_by_employee_id(self, employee_id: str) -> Optional[User]:
        """사번으로 사용자 조회"""
        return self.db.query(User).filter(User.employee_id == employee_id).first()

    def get_by_name(self, name: str) -> Optional[User]:
        """이름으로 사용자 조회"""
        return self.db.query(User).filter(User.name == name).first()

    def search_by_name(self, name: str) -> List[User]:
        """이름으로 사용자 검색 (부분 일치)"""
        return self.db.query(User).filter(User.name.contains(name)).all()

    def get_by_department(self, department: str) -> List[User]:
        """부서별 사용자 조회"""
        return self.db.query(User).filter(User.department == department).all()

    def create(
        self,
        name: str,
        employee_id: Optional[str] = None,
        department: Optional[str] = None,
        position: Optional[str] = None,
        phone: Optional[str] = None,
        email: Optional[str] = None,
    ) -> User:
        """새 사용자 생성"""
        user = User(
            name=name,
            employee_id=employee_id,
            department=department,
            position=position,
            phone=phone,
            email=email,
        )
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)
        return user

    def update(self, user_id: int, **kwargs) -> Optional[User]:
        """사용자 정보 수정"""
        user = self.get_by_id(user_id)
        if not user:
            return None
        for key, value in kwargs.items():
            if hasattr(user, key) and key not in ['id', 'created_at']:
                setattr(user, key, value)
        self.db.commit()
        self.db.refresh(user)
        return user

    def deactivate(self, user_id: int) -> bool:
        """사용자 비활성화"""
        user = self.get_by_id(user_id)
        if not user:
            return False
        user.is_active = False
        self.db.commit()
        return True

    def activate(self, user_id: int) -> bool:
        """사용자 활성화"""
        user = self.get_by_id(user_id)
        if not user:
            return False
        user.is_active = True
        self.db.commit()
        return True

    def get_or_create(self, name: str, **kwargs) -> User:
        """사용자 조회 또는 생성"""
        user = self.get_by_name(name)
        if not user:
            user = self.create(name=name, **kwargs)
        return user

    def get_with_cards(self, user_id: int) -> Optional[User]:
        """사용자와 연결된 카드 함께 조회"""
        return self.db.query(User).filter(User.id == user_id).first()
