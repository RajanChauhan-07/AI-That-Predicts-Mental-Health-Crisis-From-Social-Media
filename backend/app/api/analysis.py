from fastapi import APIRouter

router = APIRouter()

@router.get("/")
async def analysis_root():
    return {"message": "Analysis router working"}