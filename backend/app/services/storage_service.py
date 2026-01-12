"""
Storage Service for CrewInventurKI
Supports both local filesystem and Cloudflare R2 storage.
Based on CrewChecker implementation for consistency.
"""

import logging
import mimetypes
import uuid
from datetime import datetime
from pathlib import Path
from typing import BinaryIO, Optional

import boto3
from botocore.config import Config as BotoConfig
from botocore.exceptions import ClientError

from app.core.config import settings

logger = logging.getLogger(__name__)


class StorageService:
    """
    Unified storage interface for local and R2 storage.

    Features:
    - S3-compatible R2 API (boto3)
    - Fallback to local filesystem
    - Key generation with user isolation
    - Pre-signed URLs for secure access
    """

    def __init__(self):
        self.provider = settings.STORAGE_PROVIDER
        self._s3_client = None
        self._local_base = Path(__file__).parent.parent / "static" / "uploads"

        if self.provider == "r2":
            self._init_r2_client()
        else:
            # Ensure local upload directory exists
            self._local_base.mkdir(parents=True, exist_ok=True)
            logger.info(f"Using local storage at {self._local_base}")

    def _init_r2_client(self):
        """Initialize the R2 (S3-compatible) client."""
        if not all(
            [
                settings.R2_ACCOUNT_ID,
                settings.R2_ACCESS_KEY_ID,
                settings.R2_SECRET_ACCESS_KEY,
            ]
        ):
            raise ValueError(
                "R2 credentials not configured. Set R2_ACCOUNT_ID, "
                "R2_ACCESS_KEY_ID, and R2_SECRET_ACCESS_KEY"
            )

        endpoint_url = f"https://{settings.R2_ACCOUNT_ID}.r2.cloudflarestorage.com"

        self._s3_client = boto3.client(
            "s3",
            endpoint_url=endpoint_url,
            aws_access_key_id=settings.R2_ACCESS_KEY_ID,
            aws_secret_access_key=settings.R2_SECRET_ACCESS_KEY,
            config=BotoConfig(
                signature_version="s3v4", s3={"addressing_style": "path"}
            ),
            region_name="auto",
        )
        logger.info(f"Initialized R2 client for bucket: {settings.R2_BUCKET_NAME}")

    def generate_key(
        self, user_id: str, category: str, filename: str, include_date: bool = True
    ) -> str:
        """
        Generate a storage key with user isolation.

        Args:
            user_id: User's UUID for isolation
            category: File category (invoices, products, etc.)
            filename: Original filename (extension will be preserved)
            include_date: Include year/month in path for organization

        Returns:
            Storage key like: user_{uuid}/invoices/2025/01/abc123.pdf
        """
        ext = Path(filename).suffix.lower() or ".bin"
        unique_name = f"{uuid.uuid4().hex[:12]}{ext}"

        if include_date:
            now = datetime.now()
            return f"user_{user_id}/{category}/{now.year}/{now.month:02d}/{unique_name}"
        else:
            return f"user_{user_id}/{category}/{unique_name}"

    async def upload(
        self, file: bytes | BinaryIO, key: str, content_type: str | None = None
    ) -> str:
        """
        Upload file to storage.

        Args:
            file: File content as bytes or file-like object
            key: Storage key from generate_key()
            content_type: MIME type (auto-detected if not provided)

        Returns:
            Public URL for the uploaded file
        """
        # Auto-detect content type if not provided
        if not content_type:
            content_type, _ = mimetypes.guess_type(key)
            content_type = content_type or "application/octet-stream"

        # Convert BinaryIO to bytes if needed
        if hasattr(file, "read"):
            file_bytes = file.read()
        else:
            file_bytes = file

        if self.provider == "r2":
            return await self._upload_r2(file_bytes, key, content_type)
        else:
            return await self._upload_local(file_bytes, key)

    async def _upload_r2(self, content: bytes, key: str, content_type: str) -> str:
        """Upload to Cloudflare R2."""
        try:
            self._s3_client.put_object(
                Bucket=settings.R2_BUCKET_NAME,
                Key=key,
                Body=content,
                ContentType=content_type,
            )
            logger.info(f"Uploaded to R2: {key}")
            return self.get_url(key)
        except ClientError as e:
            logger.error(f"R2 upload failed: {e}")
            raise

    async def _upload_local(self, content: bytes, key: str) -> str:
        """Upload to local filesystem."""
        file_path = self._local_base / key
        file_path.parent.mkdir(parents=True, exist_ok=True)
        file_path.write_bytes(content)
        logger.info(f"Saved locally: {file_path}")
        return self.get_url(key)

    def get_url(self, key: str) -> str:
        """Get the public URL for a stored file."""
        if self.provider == "r2":
            if settings.R2_PUBLIC_URL:
                return f"{settings.R2_PUBLIC_URL.rstrip('/')}/{key}"
            else:
                # R2.dev URL format
                return f"https://{settings.R2_BUCKET_NAME}.{settings.R2_ACCOUNT_ID}.r2.dev/{key}"
        else:
            return f"/static/uploads/{key}"

    def get_presigned_url(
        self, key: str, expires_in: int = 3600, for_upload: bool = False
    ) -> str:
        """
        Generate a pre-signed URL for secure access.

        Args:
            key: Storage key
            expires_in: URL expiration in seconds (default 1 hour)
            for_upload: True for upload URL, False for download

        Returns:
            Pre-signed URL
        """
        if self.provider != "r2":
            return self.get_url(key)

        method = "put_object" if for_upload else "get_object"

        url = self._s3_client.generate_presigned_url(
            method,
            Params={"Bucket": settings.R2_BUCKET_NAME, "Key": key},
            ExpiresIn=expires_in,
        )
        return url

    async def download(self, key: str) -> bytes:
        """
        Download file from storage.

        Args:
            key: Storage key

        Returns:
            File content as bytes

        Raises:
            FileNotFoundError: If file doesn't exist
            ClientError: If R2 download fails
        """
        if self.provider == "r2":
            try:
                response = self._s3_client.get_object(
                    Bucket=settings.R2_BUCKET_NAME, Key=key
                )
                return response["Body"].read()
            except ClientError as e:
                logger.error(f"R2 download failed for {key}: {e}")
                raise FileNotFoundError(f"File not found in R2: {key}") from e
        else:
            file_path = self._local_base / key
            if not file_path.exists():
                logger.error(f"File not found locally: {file_path}")
                raise FileNotFoundError(f"File not found: {key}")
            try:
                return file_path.read_bytes()
            except OSError as e:
                logger.error(f"Failed to read file {file_path}: {e}")
                raise FileNotFoundError(f"Failed to read file: {key}") from e

    async def delete(self, key: str) -> bool:
        """Delete a file from storage."""
        try:
            if self.provider == "r2":
                self._s3_client.delete_object(Bucket=settings.R2_BUCKET_NAME, Key=key)
            else:
                file_path = self._local_base / key
                if file_path.exists():
                    file_path.unlink()
            logger.info(f"Deleted: {key}")
            return True
        except Exception as e:
            logger.error(f"Delete failed for {key}: {e}")
            return False

    async def exists(self, key: str) -> bool:
        """Check if a file exists in storage."""
        try:
            if self.provider == "r2":
                self._s3_client.head_object(Bucket=settings.R2_BUCKET_NAME, Key=key)
                return True
            else:
                return (self._local_base / key).exists()
        except ClientError:
            return False


# Singleton instance
_storage_service: Optional[StorageService] = None


def get_storage_service() -> StorageService:
    """Get the storage service singleton."""
    global _storage_service
    if _storage_service is None:
        _storage_service = StorageService()
    return _storage_service
