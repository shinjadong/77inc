#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
홈택스 매입 전자세금계산서 목록 → 내부용 매입 파일 변환 프로그램

입력: 매입전자세금계산서목록(1~156).xls
출력: 매입_YYYYMMDD_YYYYMMDD.xlsx (작성일 기준 시작일_마지막일)
"""

import pandas as pd
from datetime import datetime
import openpyxl
from openpyxl.styles import Alignment, Font
import sys


def read_hometax_data(filepath):
    """
    홈택스 매입 전자세금계산서 파일 읽기

    Args:
        filepath: 홈택스 파일 경로

    Returns:
        DataFrame: 읽어온 데이터
    """
    print(f"📂 파일 읽기: {filepath}")

    # 헤더는 5번째 행(인덱스 5)에 있음
    df = pd.read_excel(filepath, header=5)

    print(f"✅ 총 {len(df)}건의 데이터를 읽었습니다.")
    return df


def get_date_range(df):
    """
    작성일자 컬럼에서 시작일과 마지막일 추출

    Args:
        df: 홈택스 데이터프레임

    Returns:
        tuple: (시작일, 마지막일) 문자열 형식 YYYYMMDD
    """
    dates = pd.to_datetime(df['작성일자'])
    start_date = dates.min().strftime('%Y%m%d')
    end_date = dates.max().strftime('%Y%m%d')

    print(f"📅 작성일 범위: {start_date} ~ {end_date}")
    return start_date, end_date


def get_year_month(date_str):
    """
    날짜에서 년월 추출 (헤더용)

    Args:
        date_str: 날짜 문자열 또는 datetime

    Returns:
        str: YYYY.MM월 형식 (예: 2025.04월)
    """
    date = pd.to_datetime(date_str)
    return date.strftime('%Y.%m월')


def group_by_month(df):
    """
    작성일자를 기준으로 월별로 데이터 그룹화

    Args:
        df: 홈택스 데이터프레임

    Returns:
        dict: {년월: 데이터프레임} 형식의 딕셔너리
    """
    print("📅 월별 데이터 그룹화 중...")

    # 작성일자를 datetime으로 변환
    df['작성일자_dt'] = pd.to_datetime(df['작성일자'])

    # 년월 컬럼 추가 (YYYY-MM 형식)
    df['년월'] = df['작성일자_dt'].dt.to_period('M')

    # 월별로 그룹화
    monthly_data = {}
    for period, group in df.groupby('년월'):
        year_month_key = period.strftime('%Y-%m')
        monthly_data[year_month_key] = group.copy()
        print(f"   - {year_month_key}: {len(group)}건")

    return monthly_data


def convert_to_internal_format(df):
    """
    홈택스 형식 → 내부용 형식으로 변환

    Args:
        df: 홈택스 데이터프레임

    Returns:
        DataFrame: 내부용 형식 데이터프레임
    """
    print("🔄 데이터 변환 중...")

    # 필요한 컬럼만 선택 및 매핑
    result = pd.DataFrame()

    # 발급일자 → 일자 (YYYY-MM-DD 형식)
    result['일     자'] = pd.to_datetime(df['발급일자']).dt.strftime('%Y-%m-%d')

    # 공급자 정보 (매입이므로 공급자 = 거래처)
    result['상     호'] = df['상호']
    result['사업자등록번호'] = df['공급자사업자등록번호']

    # 품목명 → 적요
    result['적     요'] = df['품목명']

    # 금액 정보
    result['공급가액'] = df['품목공급가액']
    result['세  금'] = df['품목세액']
    result['합  계'] = df['합계금액']

    # 비고는 모두 "전자"
    result['비고'] = '전자'

    # (226면) 컬럼은 빈 값
    result['(226면)'] = ''

    # 일련번호 추가
    result['Unnamed: 9'] = range(1, len(result) + 1)

    print(f"✅ {len(result)}건 변환 완료")
    return result


def apply_duplicate_marker(df):
    """
    연속된 같은 상호/사업자번호를 " 기호로 처리

    Args:
        df: 데이터프레임

    Returns:
        DataFrame: " 처리된 데이터프레임
    """
    print("🔄 중복 상호/사업자번호 처리 중...")

    df = df.copy()

    # 상호와 사업자등록번호에 대해 처리
    for col in ['상     호', '사업자등록번호']:
        prev_value = None
        for idx in df.index:
            current_value = df.at[idx, col]
            if prev_value is not None and current_value == prev_value:
                df.at[idx, col] = '"'
            else:
                prev_value = current_value

    return df


def create_output_excel(monthly_data_dict, output_filepath):
    """
    내부용 형식으로 월별 시트가 있는 Excel 파일 생성

    Args:
        monthly_data_dict: {년월: 데이터프레임} 딕셔너리
        output_filepath: 출력 파일 경로
    """
    print(f"📝 Excel 파일 생성 중: {output_filepath}")

    # ExcelWriter로 작성
    with pd.ExcelWriter(output_filepath, engine='openpyxl') as writer:

        # 월별로 시트 생성 (정렬된 순서로)
        for year_month in sorted(monthly_data_dict.keys()):
            df = monthly_data_dict[year_month]

            # 시트명 생성 (예: 2025.04)
            sheet_name = year_month.replace('-', '.')

            # 년월 헤더 문자열 (예: 2025.04월)
            year_month_header = get_year_month(year_month + '-01')

            print(f"   - {sheet_name} 시트 생성 중... ({len(df)}건)")

            # 빈 행 2개 추가 후 데이터 작성 (헤더 공간)
            df.to_excel(writer, sheet_name=sheet_name, startrow=2, index=False)

            # 워크시트 가져오기
            worksheet = writer.sheets[sheet_name]

            # 제목 행 추가
            worksheet['A1'] = year_month_header
            worksheet['C1'] = '                                  매입 세금계산서 목록'

            # 제목 행 스타일
            worksheet['A1'].font = Font(size=11)
            worksheet['C1'].font = Font(size=11)

    print(f"✅ 파일 생성 완료: {output_filepath}")


def main():
    """메인 실행 함수"""
    print("=" * 80)
    print("홈택스 매입 전자세금계산서 → 내부용 매입 파일 변환 프로그램")
    print("=" * 80)
    print()

    # 입력 파일
    input_file = '매입전자세금계산서목록(1~156).xls'

    try:
        # 1. 홈택스 파일 읽기
        df_hometax = read_hometax_data(input_file)

        # 2. 날짜 범위 확인
        start_date, end_date = get_date_range(df_hometax)

        # 3. 월별로 데이터 그룹화
        monthly_groups = group_by_month(df_hometax)

        # 4. 월별로 내부용 형식으로 변환 및 중복 처리
        monthly_data = {}
        total_count = 0

        print("\n🔄 월별 데이터 변환 중...")
        for year_month in sorted(monthly_groups.keys()):
            df_month = monthly_groups[year_month]

            # 내부용 형식으로 변환
            df_internal = convert_to_internal_format(df_month)

            # 중복 상호/사업자번호 처리 (각 월별로 독립적으로)
            df_internal = apply_duplicate_marker(df_internal)

            monthly_data[year_month] = df_internal
            total_count += len(df_internal)
            print(f"   - {year_month}: {len(df_internal)}건 변환 완료")

        # 5. 출력 파일명 생성
        output_file = f'매입_{start_date}_{end_date}.xlsx'

        # 6. 월별 시트로 Excel 파일 생성
        create_output_excel(monthly_data, output_file)

        print()
        print("=" * 80)
        print(f"✨ 변환 완료!")
        print(f"   입력: {input_file} ({len(df_hometax)}건)")
        print(f"   출력: {output_file} ({len(monthly_groups)}개 시트, 총 {total_count}건)")
        print(f"   시트 목록: {', '.join(sorted(monthly_data.keys()))}")
        print("=" * 80)

        return 0

    except FileNotFoundError:
        print(f"❌ 오류: 파일을 찾을 수 없습니다 - {input_file}")
        print(f"   현재 디렉토리에 파일이 있는지 확인해주세요.")
        return 1

    except Exception as e:
        print(f"❌ 오류 발생: {e}")
        import traceback
        traceback.print_exc()
        return 1


if __name__ == '__main__':
    sys.exit(main())
