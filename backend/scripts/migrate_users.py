"""
사용자 테이블 생성 및 기존 카드와 연결하는 마이그레이션 스크립트

실행: python -m backend.scripts.migrate_users
"""
import sys
from pathlib import Path

# 프로젝트 루트 추가
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from app.database import SessionLocal, init_db
from app.models.user import User
from app.models.card import Card


# 초기 사용자 데이터 (기존 카드 정보 기반)
INITIAL_USERS = [
    {
        "name": "김준교",
        "department": "영업부",
        "position": "과장",
        "phone": None,
        "email": None,
    },
    {
        "name": "김용석",
        "department": "경영진",
        "position": "대표이사",
        "phone": None,
        "email": None,
    },
    {
        "name": "노혜경",
        "department": "경영진",
        "position": "이사",
        "phone": None,
        "email": None,
    },
]

# 카드 데이터 (카드번호, 카드명, 시트명, 사용자명, 타입)
INITIAL_CARDS = [
    {"card_number": "3987", "card_name": "김준교 카드", "sheet_name": "3987", "user_name": "김준교", "card_type": "personal"},
    {"card_number": "4985", "card_name": "김용석 대표님 카드", "sheet_name": "4985", "user_name": "김용석", "card_type": "personal"},
    {"card_number": "6902", "card_name": "하이패스1", "sheet_name": "6902", "user_name": None, "card_type": "vehicle"},
    {"card_number": "6911", "card_name": "하이패스2", "sheet_name": "6911", "user_name": None, "card_type": "vehicle"},
    {"card_number": "6974", "card_name": "노혜경 이사님 카드", "sheet_name": "6974", "user_name": "노혜경", "card_type": "personal"},
    {"card_number": "9980", "card_name": "공용카드", "sheet_name": "9980", "user_name": None, "card_type": "shared"},
]

# 카드-사용자 매핑 (기존 호환용)
CARD_USER_MAPPING = {
    "3987": {"user_name": "김준교", "card_type": "personal"},
    "4985": {"user_name": "김용석", "card_type": "personal"},
    "6902": {"user_name": None, "card_type": "vehicle"},  # 하이패스1 - 차량용
    "6911": {"user_name": None, "card_type": "vehicle"},  # 하이패스2 - 차량용
    "6974": {"user_name": "노혜경", "card_type": "personal"},
    "9980": {"user_name": None, "card_type": "shared"},  # 공용카드
}


def migrate_users():
    """사용자 테이블 생성 및 카드 연결"""
    # DB 초기화 (테이블 생성)
    init_db()

    db = SessionLocal()

    try:
        print("=" * 50)
        print("사용자 및 카드 마이그레이션 시작")
        print("=" * 50)

        # 1. 사용자 생성
        print("\n[1단계] 사용자 생성")
        user_map = {}  # name -> User 객체 매핑

        for user_data in INITIAL_USERS:
            # 기존 사용자 확인
            existing = db.query(User).filter(User.name == user_data["name"]).first()

            if existing:
                print(f"  - {user_data['name']}: 이미 존재함 (ID: {existing.id})")
                user_map[user_data["name"]] = existing
            else:
                user = User(**user_data)
                db.add(user)
                db.flush()  # ID 생성을 위해 flush
                user_map[user_data["name"]] = user
                print(f"  - {user_data['name']}: 생성 완료 (ID: {user.id})")

        db.commit()
        print(f"\n  총 {len(user_map)}명 사용자 처리 완료")

        # 2. 카드 생성 및 사용자 연결
        print("\n[2단계] 카드 생성 및 사용자 연결")

        for card_data in INITIAL_CARDS:
            card_number = card_data["card_number"]
            card = db.query(Card).filter(Card.card_number == card_number).first()

            user_name = card_data.get("user_name")
            user_id = user_map[user_name].id if user_name and user_name in user_map else None

            if card:
                # 기존 카드 업데이트
                card.user_id = user_id
                card.card_type = card_data.get("card_type", "personal")
                print(f"  - 카드 {card_number}: 업데이트 (사용자: {user_name or '미배정'})")
            else:
                # 새 카드 생성
                card = Card(
                    card_number=card_number,
                    card_name=card_data["card_name"],
                    sheet_name=card_data.get("sheet_name"),
                    user_id=user_id,
                    card_type=card_data.get("card_type", "personal"),
                )
                db.add(card)
                print(f"  - 카드 {card_number}: 생성 완료 (사용자: {user_name or '미배정'})")

        db.commit()

        # 3. 결과 확인
        print("\n[3단계] 마이그레이션 결과")
        print("-" * 50)

        users = db.query(User).all()
        print(f"\n등록된 사용자: {len(users)}명")
        for u in users:
            cards = db.query(Card).filter(Card.user_id == u.id).all()
            card_info = ", ".join([c.card_number for c in cards]) if cards else "없음"
            print(f"  - {u.name} ({u.position or '직책미정'}): 카드 [{card_info}]")

        cards = db.query(Card).all()
        print(f"\n등록된 카드: {len(cards)}장")
        for c in cards:
            user_name = c.user.name if c.user else "미배정"
            print(f"  - {c.card_number} ({c.card_name}): {user_name}, 타입: {c.card_type}")

        print("\n" + "=" * 50)
        print("마이그레이션 완료!")
        print("=" * 50)

    except Exception as e:
        db.rollback()
        print(f"\n오류 발생: {e}")
        raise

    finally:
        db.close()


if __name__ == "__main__":
    migrate_users()
