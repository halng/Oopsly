from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.auth import AuthResult, current_auth, current_user_id
from app.db import get_db
from app.schemas import FocusReq, PlantReq, ReviewReq, TestReq, TreeReq, UnlockReq
from app.service import (
    get_or_create_garden,
    harvest_tree,
    plant_seed,
    reward_focus,
    reward_review,
    reward_test,
    to_state,
    unlock_plot,
    water_tree,
)

router = APIRouter(prefix="/v1/game", tags=["game"])


def ok(message: str, data):
    return {"isSuccess": True, "message": message, "data": data}


@router.get("/session")
def session(auth: AuthResult = Depends(current_auth)):
    return ok("Session verified", auth.as_dict())


@router.get("/garden")
def read_garden(
    db: Session = Depends(get_db),
    user_id: str = Depends(current_user_id),
):
    garden = get_or_create_garden(db, user_id)
    db.commit()
    return ok("Garden fetched successfully", to_state(garden).model_dump(by_alias=True))


@router.post("/plants")
def plant(
    body: PlantReq,
    db: Session = Depends(get_db),
    user_id: str = Depends(current_user_id),
):
    state = plant_seed(db, user_id, body.species, body.plot_index, body.nickname)
    return ok("Seed planted in your forest", state.model_dump(by_alias=True))


@router.post("/plants/water")
def water(
    body: TreeReq,
    db: Session = Depends(get_db),
    user_id: str = Depends(current_user_id),
):
    state = water_tree(db, user_id, body.tree_id)
    return ok("Your plant has been watered", state.model_dump(by_alias=True))


@router.post("/plots/unlock")
def unlock(
    body: UnlockReq,
    db: Session = Depends(get_db),
    user_id: str = Depends(current_user_id),
):
    state = unlock_plot(db, user_id, body.plot_index)
    return ok("New land plot unlocked", state.model_dump(by_alias=True))


@router.post("/plants/harvest")
def harvest(
    body: TreeReq,
    db: Session = Depends(get_db),
    user_id: str = Depends(current_user_id),
):
    reward = harvest_tree(db, user_id, body.tree_id)
    return ok("Harvest gathered", reward.model_dump(by_alias=True))


@router.post("/rewards/focus")
def focus_reward(
    body: FocusReq,
    db: Session = Depends(get_db),
    user_id: str = Depends(current_user_id),
):
    reward = reward_focus(db, user_id, body.focus_minutes)
    return ok("Focus session rewarded", reward.model_dump(by_alias=True))


@router.post("/rewards/review")
def review_reward(
    body: ReviewReq,
    db: Session = Depends(get_db),
    user_id: str = Depends(current_user_id),
):
    reward = reward_review(db, user_id, body.cards_reviewed, body.good, body.easy)
    return ok("Review session rewarded", reward.model_dump(by_alias=True))


@router.post("/rewards/test")
def test_reward(
    body: TestReq,
    db: Session = Depends(get_db),
    user_id: str = Depends(current_user_id),
):
    reward = reward_test(db, user_id, body.percentage)
    return ok("Test rewarded", reward.model_dump(by_alias=True))
