from contextlib import asynccontextmanager
import logging

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .routers import agent, attractions, auth, decision, itinerary, matches, safety, trips, tti, users
from .seed import seed

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    await seed()
    yield


app = FastAPI(title="OddTrip API", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in settings.cors_origins.split(",") if origin.strip()],
    allow_origin_regex=settings.cors_origin_regex,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(users.router, prefix="/api/users", tags=["users"])
app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(tti.router, prefix="/api/tti", tags=["tti"])
app.include_router(matches.router, prefix="/api/matches", tags=["matches"])
app.include_router(trips.router, prefix="/api/trips", tags=["trips"])
app.include_router(decision.router, prefix="/api/trips", tags=["decision"])
app.include_router(attractions.router, prefix="/api/trips", tags=["attractions"])
app.include_router(itinerary.router, prefix="/api/trips", tags=["itinerary"])
app.include_router(safety.router, prefix="/api/trips", tags=["safety"])
app.include_router(agent.router, prefix="/api/trips", tags=["agent"])


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    logger.exception("Unhandled API error on %s %s", request.method, request.url.path)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"},
    )
