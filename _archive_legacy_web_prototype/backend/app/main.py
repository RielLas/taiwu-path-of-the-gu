from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.v1 import router as api_v1_router
from app.core.db import init_db, DATABASE_URL

app = FastAPI(
    title="Taiwu: Path of the Gu API",
    description="Backend engine for the Taiwu-inspired Gu Cultivation Sandbox",
    version="0.1.0"
)

@app.on_event("startup")
async def startup_event():
    # Explicitly ensure persistent SQLite DB is initialized without dropping tables
    init_db()
    print(f"🗡️ Persistent SQLite Database connected: {DATABASE_URL}")

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # For dev. In prod, lock this down.
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_v1_router.router, prefix="/api/v1")

@app.get("/health")
async def health_check():
    return {"status": "healthy", "database": DATABASE_URL}
