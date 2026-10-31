import math

import pandas as pd
import pytest

from app.training.evaluate import (
    evaluate,
    ndcg_at_k,
    precision_at_k,
    recall_at_k,
    relevant_items,
    time_split,
)


def interactions(rows):
    """rows: (user_id, anime_id, status, score, день)."""
    df = pd.DataFrame(rows, columns=["user_id", "anime_id", "status", "score", "day"])
    df["score"] = df["score"].astype("Int8")
    df["updated_at"] = pd.Timestamp("2026-01-01", tz="UTC") + pd.to_timedelta(df.pop("day"), unit="D")
    return df


# Пример из объяснения: в тесте у Ани {Clannad, Mushishi, Monster},
# модель советует Monster, Naruto, Mushishi, Bleach, One Piece.
CLANNAD, MUSHISHI, MONSTER, NARUTO, BLEACH, ONE_PIECE = 1, 2, 3, 4, 5, 6
ANYA_RELEVANT = {CLANNAD, MUSHISHI, MONSTER}
ANYA_RECS = [MONSTER, NARUTO, MUSHISHI, BLEACH, ONE_PIECE]


def test_metrics_on_hand_example():
    assert precision_at_k(ANYA_RECS, ANYA_RELEVANT, 5) == pytest.approx(2 / 5)
    assert recall_at_k(ANYA_RECS, ANYA_RELEVANT, 5) == pytest.approx(2 / 3)
    # DCG = 1/log2(2) + 1/log2(4) = 1.5; идеал: три попадания в начале
    ideal = 1 + 1 / math.log2(3) + 1 / math.log2(4)
    assert ndcg_at_k(ANYA_RECS, ANYA_RELEVANT, 5) == pytest.approx(1.5 / ideal)
    assert ndcg_at_k(ANYA_RECS, ANYA_RELEVANT, 5) == pytest.approx(0.704, abs=1e-3)


def test_ndcg_rewards_hits_higher_in_list():
    top = ndcg_at_k([MONSTER, NARUTO, BLEACH], {MONSTER}, 3)
    bottom = ndcg_at_k([NARUTO, BLEACH, MONSTER], {MONSTER}, 3)
    assert top == pytest.approx(1.0)
    assert bottom == pytest.approx(0.5)


def test_perfect_and_empty_recommendations():
    assert precision_at_k([1, 2], {1, 2}, 2) == 1.0
    assert recall_at_k([1, 2], {1, 2}, 2) == 1.0
    assert ndcg_at_k([1, 2], {1, 2}, 2) == pytest.approx(1.0)
    assert precision_at_k([3, 4], {1, 2}, 2) == 0.0
    assert ndcg_at_k([], {1, 2}, 2) == 0.0


def test_only_first_k_recommendations_count():
    assert precision_at_k([NARUTO, MONSTER], {MONSTER}, 1) == 0.0
    assert recall_at_k([NARUTO, MONSTER], {MONSTER}, 1) == 0.0


def test_ndcg_is_one_when_fewer_relevant_than_k_all_found():
    # Идеальный список для одного релевантного тайтла — одно попадание на 1-м месте
    assert ndcg_at_k([MONSTER, NARUTO, BLEACH], {MONSTER}, 3) == pytest.approx(1.0)


def test_short_recommendation_list_is_penalized_in_precision():
    # Модель вернула 1 тайтл вместо 5: пустые места считаются промахами
    assert precision_at_k([MONSTER], {MONSTER}, 5) == pytest.approx(1 / 5)


def test_time_split_moves_latest_records_to_test():
    df = interactions(
        [(1, anime, "completed", 8, day) for anime, day in zip(range(10, 20), range(10))]
        + [(2, anime, "completed", 8, day) for anime, day in zip(range(10, 15), [4, 3, 2, 1, 0])]
    )
    train, test = time_split(df, test_fraction=0.2)

    assert sorted(test[test.user_id == 1].anime_id) == [18, 19]  # 2 из 10, самые поздние
    assert sorted(test[test.user_id == 2].anime_id) == [10]  # 1 из 5; у пользователя 2 даты в обратном порядке
    assert len(train) + len(test) == len(df)
    assert not set(zip(train.user_id, train.anime_id)) & set(zip(test.user_id, test.anime_id))


def test_time_split_test_is_never_older_than_train():
    df = interactions([(1, anime, "completed", 8, (anime * 7) % 11) for anime in range(11)])
    train, test = time_split(df, test_fraction=0.3)
    assert len(test) == 3
    assert test.updated_at.min() >= train.updated_at.max()


def test_time_split_breaks_ties_by_anime_id():
    df = interactions([(1, anime, "completed", 8, 0) for anime in [5, 3, 9, 1, 7]])
    first = time_split(df)[1]
    second = time_split(df.sample(frac=1, random_state=0))[1]
    assert list(first.anime_id) == list(second.anime_id) == [9]


def test_time_split_handles_float_rounding():
    # 100 * 0.29 = 28.999… в float, должно получиться 29
    df = interactions([(1, anime, "completed", 8, anime) for anime in range(100)])
    assert len(time_split(df, test_fraction=0.29)[1]) == 29


def test_time_split_rejects_bad_fraction():
    df = interactions([(1, 1, "completed", 8, 0)])
    with pytest.raises(ValueError):
        time_split(df, test_fraction=1.0)


def test_relevant_items_excludes_dropped_and_low_scores():
    test = interactions(
        [
            (1, 10, "completed", 9, 0),
            (1, 11, "completed", None, 0),  # без оценки — считается
            (1, 12, "planned", None, 0),  # в планах — считается
            (1, 13, "dropped", None, 0),  # брошено
            (1, 14, "completed", 4, 0),  # низкая оценка
            (1, 15, "watching", 5, 0),  # ровно порог — считается
            (2, 20, "dropped", 9, 0),  # брошено даже с высокой оценкой
        ]
    )
    assert relevant_items(test) == {1: {10, 11, 12, 15}}


def test_evaluate_averages_over_users_and_penalizes_missing():
    relevant = {1: ANYA_RELEVANT, 2: {MONSTER}, 3: set()}
    recommendations = {1: ANYA_RECS, 3: [MONSTER]}  # пользователю 2 модель ничего не дала

    result = evaluate(recommendations, relevant, k=5)

    assert result["users"] == 2  # у пользователя 3 нечего угадывать, он не считается
    assert result["precision@5"] == pytest.approx((2 / 5 + 0) / 2)
    assert result["recall@5"] == pytest.approx((2 / 3 + 0) / 2)
    assert result["ndcg@5"] == pytest.approx(ndcg_at_k(ANYA_RECS, ANYA_RELEVANT, 5) / 2)


def test_evaluate_without_relevant_users_fails():
    with pytest.raises(ValueError):
        evaluate({1: [1]}, {1: set()}, k=5)
