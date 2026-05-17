"""pytest 공통 설정.

src 모듈을 import할 수 있도록 sys.path를 조정합니다.
"""
import sys
from pathlib import Path

# 프로젝트 루트를 sys.path에 추가
ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))
