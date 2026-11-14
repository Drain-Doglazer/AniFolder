"""Публичная выдача рекомендаций: JWT, карточки и актуальный список в PostgreSQL."""

from dataclasses import dataclass

import pytest
import pytest_asyncio

from app.core.security import create_access_token
from app.models.anime import Anime
from app.models.enums import ListStatus
from app.models.library import Recommendation, UserAnime
from app.models.user import User
from tests.api_context import ApiTestContext

URL = "/api/v1/me/recommendations"


def _headers(user: User) -> dict[str, str]:
    return {"Authorization": f"Bearer {create_access_token(user.id)}"}


@dataclass
class RecommendationData:
    user: User
    other_user: User
    empty_user: User
    ranked_titles: list[Anime]
    other_title: Anime


@pytest_asyncio.fixture
async def recommendations(api: ApiTestContext) -> RecommendationData:
    users = [
        User(username=name, email=f"{name}@example.com", password_hash="unused")
        for name in ("recs_user", "recs_other", "recs_empty")
    ]
    titles = [
        Anime(anilist_id=i + 1, title_en=f"Title {i}", status="released")
        for i in range(56)
    ]
    api.session.add_all(users + titles)
    await api.session.flush()
    # Первые два места имеют равный relevance; порядок отличается от порядка ID.
    ranked = [titles[1], titles[2], titles[0], *titles[3:55]]
    api.session.add_all([
        Recommendation(user_id=users[0].id, anime_id=title.id,
                       relevance=1.0 if rank < 2 else 1 / rank,
                       model_version="test-model")
        for rank, title in reversed(list(enumerate(ranked)))
    ])
    api.session.add(Recommendation(
        user_id=users[1].id, anime_id=titles[55].id,
        relevance=10.0, model_version="other-model",
    ))
    # Чужой список не должен исключать тайтл из выдачи текущего пользователя.
    api.session.add(UserAnime(
        user_id=users[1].id, anime_id=ranked[0].id, status=ListStatus.COMPLETED,
    ))
    await api.session.flush()
    return RecommendationData(*users, ranked, titles[55])


@pytest.mark.parametrize("headers", [{}, {"Authorization": "Bearer invalid-token"}])
async def test_recommendations_require_authentication(api: ApiTestContext, headers: dict) -> None:
    response = await api.client.get(URL, headers=headers)
    assert response.status_code == 401


async def test_recommendations_are_scoped_sorted_and_include_card(
    api: ApiTestContext, recommendations: RecommendationData,
) -> None:
    data = recommendations
    response = await api.client.get(URL, headers=_headers(data.user))
    assert response.status_code == 200
    items = response.json()
    assert [item["anime_id"] for item in items] == [t.id for t in data.ranked_titles[:20]]
    title = data.ranked_titles[0]
    assert items[0] == {
        "anime_id": title.id,
        "relevance": 1.0,
        "anime": {
            "id": title.id, "anilist_id": title.anilist_id, "mal_id": None,
            "title_ru": None, "title_en": title.title_en, "kind": None,
            "status": "released", "episodes": None, "aired_on": None, "poster_url": None,
        },
    }
    other_response = await api.client.get(URL, headers=_headers(data.other_user))
    assert other_response.status_code == 200
    assert [item["anime_id"] for item in other_response.json()] == [data.other_title.id]


@pytest.mark.parametrize("limit", [1, 50])
async def test_recommendations_limit_boundaries(
    api: ApiTestContext, recommendations: RecommendationData, limit: int,
) -> None:
    response = await api.client.get(URL, headers=_headers(recommendations.user), params={"limit": limit})
    assert response.status_code == 200
    assert [item["anime_id"] for item in response.json()] == [
        t.id for t in recommendations.ranked_titles[:limit]
    ]


@pytest.mark.parametrize("limit", [0, 51, "abc"])
async def test_recommendations_reject_invalid_limit(
    api: ApiTestContext, recommendations: RecommendationData, limit: int | str,
) -> None:
    response = await api.client.get(URL, headers=_headers(recommendations.user), params={"limit": limit})
    assert response.status_code == 422


async def test_user_without_recommendations_gets_empty_list(
    api: ApiTestContext, recommendations: RecommendationData,
) -> None:
    response = await api.client.get(URL, headers=_headers(recommendations.empty_user))
    assert response.status_code == 200
    assert response.json() == []


@pytest.mark.parametrize("status", list(ListStatus))
async def test_current_list_is_filtered_before_limit_without_retraining(
    api: ApiTestContext, recommendations: RecommendationData, status: ListStatus,
) -> None:
    data = recommendations
    headers = _headers(data.user)
    before = await api.client.get(URL, headers=headers, params={"limit": 1})
    assert before.status_code == 200
    assert before.json()[0]["anime_id"] == data.ranked_titles[0].id

    # Меняется только список после публикации: recommendations остаётся прежней.
    api.session.add(UserAnime(
        user_id=data.user.id, anime_id=data.ranked_titles[0].id, status=status, score=1,
    ))
    await api.session.flush()
    after = await api.client.get(URL, headers=headers, params={"limit": 1})
    assert after.status_code == 200
    assert [item["anime_id"] for item in after.json()] == [data.ranked_titles[1].id]
