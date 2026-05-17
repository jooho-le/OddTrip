"""환경 설정 (Standalone 버전).

──────────────────────────────────────
설계 의도
──────────────────────────────────────
이 모듈은 OddTrip backend의 config.py에 의존하지 않습니다.
환경변수에서 직접 키를 읽어 자체 동작합니다.

팀장님 통합 시:
  이 파일은 삭제하시고, src/clients/*.py 와 src/planner/*.py의
  `from ..config import settings` 만 OddTrip backend의 config로 바꾸시면 됩니다.
  (예: `from app.config import settings`)

──────────────────────────────────────
환경변수
──────────────────────────────────────
필수:
  OPENAI_API_KEY     OpenAI API 키 (LLM narrator + 운영시간 추론에 사용)

선택 (없으면 mock 모드로 자동 동작):
  KAKAO_REST_API_KEY  카카오 좌표/길찾기
  KMA_API_KEY         기상청 날씨
  MOIS_API_KEY        행정안전부 재난문자
"""
from __future__ import annotations

import os
from dataclasses import dataclass


@dataclass
class Settings:
    """전역 설정 객체.

    OddTrip backend의 Pydantic BaseSettings와 동일한 인터페이스를 제공해서,
    팀장님이 통합하실 때 코드 변경 없이 바로 교체 가능합니다.
    """
    openai_api_key: str = ""
    kakao_rest_api_key: str = ""
    kma_api_key: str = ""
    mois_api_key: str = ""

    @classmethod
    def from_env(cls) -> "Settings":
        """환경변수에서 설정을 로드.

        .env 파일이 있으면 자동으로 로드합니다 (python-dotenv 사용).
        없으면 OS 환경변수만 사용.
        """
        # .env 파일 자동 로드 (있으면)
        try:
            from dotenv import load_dotenv
            # demo/ 디렉토리의 .env를 우선 찾고, 없으면 cwd의 .env
            for candidate in ("demo/.env", ".env"):
                if os.path.exists(candidate):
                    load_dotenv(candidate)
                    break
        except ImportError:
            # python-dotenv 미설치 시 그냥 OS 환경변수만 사용
            pass

        return cls(
            openai_api_key=os.environ.get("OPENAI_API_KEY", ""),
            kakao_rest_api_key=os.environ.get("KAKAO_REST_API_KEY", ""),
            kma_api_key=os.environ.get("KMA_API_KEY", ""),
            mois_api_key=os.environ.get("MOIS_API_KEY", ""),
        )


# 모듈 import 시 한 번만 환경변수를 읽음
settings = Settings.from_env()
