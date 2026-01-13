"""
Supabase Storage 서비스
Excel 파일 및 업로드된 청구서 저장
"""
import os
from datetime import datetime
from typing import Optional

from supabase import create_client, Client


class SupabaseStorageService:
    """Supabase Storage 서비스"""

    def __init__(self):
        self.url = os.getenv(
            "SUPABASE_URL",
            "https://kxcvsgecefbzoiczyxsp.supabase.co"
        )
        self.key = os.getenv(
            "SUPABASE_SERVICE_KEY",
            # Service role key for backend
            "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt4Y3ZzZ2VjZWZiem9pY3p5eHNwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODIzNzA0OCwiZXhwIjoyMDgzODEzMDQ4fQ.MB9Sc7Ltc2o1zwDtWWcUvRKN0vc_vXAcO1xhMVvw1j8"
        )
        self.bucket_name = "files"
        self._client: Optional[Client] = None

    @property
    def client(self) -> Client:
        """Lazy initialization of Supabase client"""
        if self._client is None:
            self._client = create_client(self.url, self.key)
        return self._client

    def _sanitize_filename(self, filename: str) -> str:
        """파일명을 S3 호환 형식으로 변환"""
        import re
        import urllib.parse

        # 한글 등 특수문자를 URL 인코딩
        # 또는 단순히 영문/숫자로 변환
        base, ext = filename.rsplit('.', 1) if '.' in filename else (filename, '')

        # 한글을 영문으로 대체 (간단한 매핑)
        replacements = {
            '칠칠기업': '77inc',
            '법인카드': 'card',
        }
        for korean, english in replacements.items():
            base = base.replace(korean, english)

        # 특수문자 제거 (언더스코어, 하이픈은 유지)
        base = re.sub(r'[^\w\-_]', '_', base)

        return f"{base}.{ext}" if ext else base

    def upload_file(
        self,
        file_bytes: bytes,
        filename: str,
        folder: str = "exports",
        content_type: str = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    ) -> dict:
        """
        파일 업로드

        Args:
            file_bytes: 파일 바이트 데이터
            filename: 파일명
            folder: 저장 폴더 (기본: exports)
            content_type: 콘텐츠 타입

        Returns:
            dict: 업로드 결과 (path, url 포함)
        """
        # 파일명 정규화
        safe_filename = self._sanitize_filename(filename)

        # 파일 경로 생성 (folder/YYYY-MM/filename)
        date_folder = datetime.now().strftime("%Y-%m")
        path = f"{folder}/{date_folder}/{safe_filename}"

        # 업로드
        response = self.client.storage.from_(self.bucket_name).upload(
            path=path,
            file=file_bytes,
            file_options={
                "content-type": content_type,
                "upsert": "true"  # 덮어쓰기 허용
            }
        )

        # Public URL 생성
        public_url = self.client.storage.from_(self.bucket_name).get_public_url(path)

        return {
            "path": path,
            "url": public_url,
            "bucket": self.bucket_name
        }

    def upload_excel_export(self, file_bytes: bytes, filename: str) -> dict:
        """Excel 내보내기 파일 업로드"""
        return self.upload_file(
            file_bytes=file_bytes,
            filename=filename,
            folder="exports",
            content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        )

    def upload_billing_statement(self, file_bytes: bytes, filename: str) -> dict:
        """청구명세서 원본 파일 업로드"""
        # 파일 확장자에 따른 content-type 결정
        if filename.endswith('.xlsx'):
            content_type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        elif filename.endswith('.xls'):
            content_type = "application/vnd.ms-excel"
        else:
            content_type = "application/octet-stream"

        return self.upload_file(
            file_bytes=file_bytes,
            filename=filename,
            folder="uploads",
            content_type=content_type
        )

    def download_file(self, path: str) -> bytes:
        """파일 다운로드"""
        response = self.client.storage.from_(self.bucket_name).download(path)
        return response

    def list_files(self, folder: str = "exports") -> list:
        """폴더 내 파일 목록 조회"""
        response = self.client.storage.from_(self.bucket_name).list(folder)
        return response

    def delete_file(self, path: str) -> bool:
        """파일 삭제"""
        try:
            self.client.storage.from_(self.bucket_name).remove([path])
            return True
        except Exception:
            return False

    def get_public_url(self, path: str) -> str:
        """Public URL 조회"""
        return self.client.storage.from_(self.bucket_name).get_public_url(path)


# 싱글톤 인스턴스
_storage_service: Optional[SupabaseStorageService] = None


def get_storage_service() -> SupabaseStorageService:
    """Storage 서비스 인스턴스 반환"""
    global _storage_service
    if _storage_service is None:
        _storage_service = SupabaseStorageService()
    return _storage_service
