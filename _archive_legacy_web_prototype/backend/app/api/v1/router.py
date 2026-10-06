from fastapi import APIRouter
from app.api.v1 import world
from app.api.v1 import gu
from app.api.v1 import overworld
from app.api.v1 import vault
from app.api.v1 import cultivator
from app.api.v1 import combat

router = APIRouter()

router.include_router(world.router, prefix="/world", tags=["world"])
router.include_router(gu.router, prefix="/gu", tags=["gu"])
router.include_router(overworld.router, prefix="/overworld", tags=["overworld"])
router.include_router(vault.router, prefix="/vault", tags=["vault"])
router.include_router(cultivator.router, prefix="/cultivator", tags=["cultivator"])
router.include_router(combat.router, prefix="/combat", tags=["combat"])
