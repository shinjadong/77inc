#!/usr/bin/env python3
"""
사용용도 매칭 모듈
3단계 우선순위: 카드별 특수 → 정확 매칭 → 규칙 기반
"""
import json
from dataclasses import dataclass
from typing import Optional, Dict, Any
from pathlib import Path


@dataclass
class MatchResult:
    """매칭 결과"""
    usage: Optional[str]     # 사용용도 (None이면 미분류)
    match_type: str          # 매칭 타입
    confidence: float        # 신뢰도 (0.0 ~ 1.0)
    source: str              # 매칭 근거


class UsageMatcher:
    """사용용도 매칭 엔진"""

    def __init__(self, data_dir: str = "/home/tlswk/77corp/data"):
        self.data_dir = Path(data_dir)
        self._load_patterns()

    def _load_patterns(self):
        """패턴 DB 로드"""
        # 1. 정확 매칭 패턴 (가맹점명 → 사용용도)
        exact_file = self.data_dir / "patterns_exact.json"
        if exact_file.exists():
            with open(exact_file, "r", encoding="utf-8") as f:
                self.exact_patterns = json.load(f)
        else:
            self.exact_patterns = {}

        # 2. 카드별 특수 매핑 (동일 가맹점, 카드별 다른 용도)
        card_file = self.data_dir / "patterns_card.json"
        if card_file.exists():
            with open(card_file, "r", encoding="utf-8") as f:
                self.card_patterns = json.load(f)
        else:
            self.card_patterns = {}

        # 3. 규칙 기반 매핑
        rules_file = self.data_dir / "patterns_rules.json"
        if rules_file.exists():
            with open(rules_file, "r", encoding="utf-8") as f:
                self.rules = json.load(f).get("rules", [])
        else:
            self.rules = []

        print(f"패턴 로드: 정확매칭 {len(self.exact_patterns)}개, "
              f"카드별 {len(self.card_patterns)}개, "
              f"규칙 {len(self.rules)}개")

    def match(self, merchant: str, card: str, industry: str = "") -> MatchResult:
        """
        사용용도 매칭 (3단계 우선순위)

        Args:
            merchant: 가맹점명
            card: 카드 시트명 (끝 4자리)
            industry: 가맹점업종

        Returns:
            MatchResult 객체
        """
        merchant = merchant.strip()

        # Level 1: 카드별 특수 매핑 (최우선)
        result = self._match_card_specific(merchant, card)
        if result:
            return result

        # Level 2: 정확 매칭
        result = self._match_exact(merchant)
        if result:
            return result

        # Level 3: 규칙 기반 매칭
        result = self._match_rules(merchant, card, industry)
        if result:
            return result

        # 미분류
        return MatchResult(
            usage=None,
            match_type="MANUAL",
            confidence=0.0,
            source="no_match"
        )

    def _match_card_specific(self, merchant: str, card: str) -> Optional[MatchResult]:
        """카드별 특수 매핑"""
        if merchant in self.card_patterns:
            mapping = self.card_patterns[merchant]
            if card in mapping:
                return MatchResult(
                    usage=mapping[card],
                    match_type="CARD_SPECIFIC",
                    confidence=1.0,
                    source=f"card:{merchant}:{card}"
                )
        return None

    def _match_exact(self, merchant: str) -> Optional[MatchResult]:
        """정확 매칭"""
        if merchant in self.exact_patterns:
            data = self.exact_patterns[merchant]
            return MatchResult(
                usage=data["usage"],
                match_type="EXACT",
                confidence=1.0,
                source=f"exact:{merchant}"
            )
        return None

    def _match_rules(self, merchant: str, card: str, industry: str) -> Optional[MatchResult]:
        """규칙 기반 매칭"""
        for rule in self.rules:
            if self._evaluate_rule(rule, merchant, card, industry):
                return MatchResult(
                    usage=rule["usage"],
                    match_type="RULE",
                    confidence=0.9,
                    source=f"rule:{rule['id']}"
                )
        return None

    def _evaluate_rule(self, rule: Dict[str, Any], merchant: str, card: str, industry: str) -> bool:
        """규칙 평가"""
        condition = rule.get("condition", {})

        # contains 조건
        if "contains" in condition:
            keyword = condition["contains"]
            if keyword not in merchant:
                return False

        # cards 조건 (특정 카드에서만 적용)
        if "cards" in condition:
            if card not in condition["cards"]:
                return False

        # industry 조건
        if "industry" in condition:
            if condition["industry"] not in industry:
                return False

        return True

    def add_pattern(self, merchant: str, usage: str, card: str = None):
        """
        새 패턴 추가 (학습)

        Args:
            merchant: 가맹점명
            usage: 사용용도
            card: 카드 시트명 (카드별 특수 매핑 시)
        """
        if card:
            # 카드별 특수 매핑
            if merchant not in self.card_patterns:
                self.card_patterns[merchant] = {}
            self.card_patterns[merchant][card] = usage
        else:
            # 정확 매칭
            if merchant in self.exact_patterns:
                self.exact_patterns[merchant]["count"] += 1
            else:
                self.exact_patterns[merchant] = {"usage": usage, "count": 1}

    def save_patterns(self):
        """패턴 DB 저장"""
        # 정확 매칭
        exact_file = self.data_dir / "patterns_exact.json"
        with open(exact_file, "w", encoding="utf-8") as f:
            json.dump(self.exact_patterns, f, ensure_ascii=False, indent=2)

        # 카드별 특수 매핑
        card_file = self.data_dir / "patterns_card.json"
        with open(card_file, "w", encoding="utf-8") as f:
            json.dump(self.card_patterns, f, ensure_ascii=False, indent=2)

        print(f"패턴 저장 완료: {exact_file.name}, {card_file.name}")


if __name__ == "__main__":
    # 테스트
    matcher = UsageMatcher()

    test_cases = [
        ("맥도날드 안산고잔DT점", "3987", ""),
        ("쿠팡(주)-쿠팡(주)", "6974", ""),
        ("쿠팡(주)-쿠팡(주)", "9980", ""),
        ("한국도로공사 하이패스", "6902", ""),
        ("새로운가게", "3987", "일반한식"),
    ]

    print("\n매칭 테스트:")
    for merchant, card, industry in test_cases:
        result = matcher.match(merchant, card, industry)
        status = "✓" if result.usage else "✗"
        print(f"  {status} [{card}] {merchant}")
        print(f"      → {result.usage or '미분류'} ({result.match_type}, {result.confidence})")
