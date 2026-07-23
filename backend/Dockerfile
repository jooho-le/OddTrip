# OddTrip FastAPI 백엔드 이미지
# 빌드 컨텍스트는 backend/ 디렉터리 (docker-compose.yml 참고)
FROM python:3.11-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

# 의존성 먼저 복사 → 코드만 바뀔 때 pip 레이어 캐시 재사용
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# 앱 소스 복사
COPY . ./

EXPOSE 8000

# Caddy 리버스 프록시 뒤에 있으므로 proxy-headers 신뢰
CMD ["uvicorn", "app.main:app", \
     "--host", "0.0.0.0", "--port", "8000", \
     "--proxy-headers", "--forwarded-allow-ips=*"]
