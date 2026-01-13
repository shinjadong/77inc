"""
기존 JSON 데이터를 SQLite DB로 마이그레이션하는 스크립트
"""
import json
import sys
from pathlib import Path

# 프로젝트 루트 추가
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from app.database import engine, SessionLocal, Base
from app.models import Card, Pattern
from app.models.pattern import MatchType


# 카드 정보 정의
CARDS_DATA = [
    {"card_number": "3987", "card_name": "김준교", "sheet_name": "김준교"},
    {"card_number": "4985", "card_name": "김용석 대표님", "sheet_name": "김용석"},
    {"card_number": "6902", "card_name": "하이패스1", "sheet_name": "하이패스"},
    {"card_number": "6911", "card_name": "하이패스2", "sheet_name": "하이패스"},
    {"card_number": "6974", "card_name": "노혜경 이사님", "sheet_name": "노혜경"},
    {"card_number": "9980", "card_name": "공용카드", "sheet_name": "공용"},
]


def load_json(filepath: Path) -> dict:
    """JSON 파일 로드"""
    if filepath.exists():
        with open(filepath, "r", encoding="utf-8") as f:
            return json.load(f)
    return {}


def migrate_cards(db) -> dict:
    """카드 정보 마이그레이션"""
    print("\n📇 카드 정보 마이그레이션...")
    card_map = {}  # card_number -> Card object

    for card_data in CARDS_DATA:
        existing = db.query(Card).filter(Card.card_number == card_data["card_number"]).first()
        if existing:
            print(f"  ⏭️  {card_data['card_number']} ({card_data['card_name']}) - 이미 존재")
            card_map[card_data["card_number"]] = existing
        else:
            card = Card(**card_data)
            db.add(card)
            db.flush()
            card_map[card_data["card_number"]] = card
            print(f"  ✅ {card_data['card_number']} ({card_data['card_name']}) 생성")

    db.commit()
    print(f"  총 {len(card_map)}개 카드 처리 완료")
    return card_map


def migrate_exact_patterns(db, data_dir: Path) -> int:
    """정확 매칭 패턴 마이그레이션"""
    print("\n📋 정확 매칭 패턴 마이그레이션...")
    patterns = load_json(data_dir / "patterns_exact.json")

    count = 0
    for merchant_name, info in patterns.items():
        # 중복 체크
        existing = db.query(Pattern).filter(
            Pattern.merchant_name == merchant_name,
            Pattern.card_id == None,
            Pattern.match_type == MatchType.EXACT.value,
        ).first()

        if existing:
            continue

        pattern = Pattern(
            merchant_name=merchant_name,
            usage_description=info["usage"],
            card_id=None,  # 공통 패턴
            match_type=MatchType.EXACT.value,
            priority=0,
            use_count=info.get("count", 0),
            created_by="migration",
        )
        db.add(pattern)
        count += 1

    db.commit()
    print(f"  ✅ {count}개 정확 매칭 패턴 생성")
    return count


def migrate_card_patterns(db, data_dir: Path, card_map: dict) -> int:
    """카드별 특수 패턴 마이그레이션"""
    print("\n💳 카드별 특수 패턴 마이그레이션...")
    patterns = load_json(data_dir / "patterns_card.json")

    count = 0
    for merchant_name, card_usages in patterns.items():
        for card_number, usage in card_usages.items():
            card = card_map.get(card_number)
            if not card:
                print(f"  ⚠️  카드 {card_number} 없음: {merchant_name}")
                continue

            # 중복 체크
            existing = db.query(Pattern).filter(
                Pattern.merchant_name == merchant_name,
                Pattern.card_id == card.id,
            ).first()

            if existing:
                continue

            pattern = Pattern(
                merchant_name=merchant_name,
                usage_description=usage,
                card_id=card.id,
                match_type=MatchType.EXACT.value,
                priority=10,  # 카드 전용은 우선순위 높음
                use_count=0,
                created_by="migration",
            )
            db.add(pattern)
            count += 1

    db.commit()
    print(f"  ✅ {count}개 카드별 패턴 생성")
    return count


def migrate_rules(db, data_dir: Path, card_map: dict) -> int:
    """규칙 기반 패턴 마이그레이션"""
    print("\n📜 규칙 기반 패턴 마이그레이션...")
    data = load_json(data_dir / "patterns_rules.json")
    rules = data.get("rules", [])

    count = 0
    for rule in rules:
        condition = rule.get("condition", {})
        contains = condition.get("contains", "")
        cards = condition.get("cards", [])
        usage = rule.get("usage", "")

        if not contains or not usage:
            continue

        if cards:
            # 특정 카드에만 적용되는 규칙
            for card_number in cards:
                card = card_map.get(card_number)
                if not card:
                    continue

                # 중복 체크
                existing = db.query(Pattern).filter(
                    Pattern.merchant_name == contains,
                    Pattern.card_id == card.id,
                    Pattern.match_type == MatchType.CONTAINS.value,
                ).first()

                if existing:
                    continue

                pattern = Pattern(
                    merchant_name=contains,
                    usage_description=usage,
                    card_id=card.id,
                    match_type=MatchType.CONTAINS.value,
                    priority=5,
                    use_count=0,
                    created_by="migration",
                )
                db.add(pattern)
                count += 1
        else:
            # 공통 규칙
            existing = db.query(Pattern).filter(
                Pattern.merchant_name == contains,
                Pattern.card_id == None,
                Pattern.match_type == MatchType.CONTAINS.value,
            ).first()

            if existing:
                continue

            pattern = Pattern(
                merchant_name=contains,
                usage_description=usage,
                card_id=None,
                match_type=MatchType.CONTAINS.value,
                priority=5,
                use_count=0,
                created_by="migration",
            )
            db.add(pattern)
            count += 1

    db.commit()
    print(f"  ✅ {count}개 규칙 패턴 생성")
    return count


def main():
    """메인 마이그레이션 실행"""
    print("=" * 60)
    print("🚀 JSON → SQLite 마이그레이션 시작")
    print("=" * 60)

    # 프로젝트 루트 찾기
    project_root = Path(__file__).parent.parent.parent
    data_dir = project_root / "data"

    print(f"\n📁 데이터 디렉토리: {data_dir}")

    # 테이블 생성
    print("\n🏗️  데이터베이스 테이블 생성...")
    Base.metadata.create_all(bind=engine)
    print("  ✅ 테이블 생성 완료")

    # 세션 생성
    db = SessionLocal()

    try:
        # 마이그레이션 실행
        card_map = migrate_cards(db)
        exact_count = migrate_exact_patterns(db, data_dir)
        card_count = migrate_card_patterns(db, data_dir, card_map)
        rule_count = migrate_rules(db, data_dir, card_map)

        # 결과 요약
        print("\n" + "=" * 60)
        print("📊 마이그레이션 결과 요약")
        print("=" * 60)
        print(f"  • 카드: {len(card_map)}개")
        print(f"  • 정확 매칭 패턴: {exact_count}개")
        print(f"  • 카드별 패턴: {card_count}개")
        print(f"  • 규칙 패턴: {rule_count}개")
        print(f"  • 총 패턴: {exact_count + card_count + rule_count}개")
        print("=" * 60)
        print("✅ 마이그레이션 완료!")

    except Exception as e:
        db.rollback()
        print(f"\n❌ 오류 발생: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
