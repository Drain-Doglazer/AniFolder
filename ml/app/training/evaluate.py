"""Оценка качества рекомендаций: holdout по времени и метрики top-k.

Схема проверки:
1. time_split: у каждого пользователя последние по updated_at записи
   уходят в тест, модель учится на остальных.
2. relevant_items: какие тестовые тайтлы считаются удачной рекомендацией.
3. evaluate: модель выдаёт топ-k для каждого пользователя, считаем
   precision@k, recall@k, NDCG@k и усредняем по пользователям.

updated_at — время последнего изменения записи, а не добавления: если
пользователь поправил оценку старому тайтлу, тот попадёт в тест. Это шум,
но не утечка: модель всё равно не видит тестовых записей.
"""

from __future__ import annotations

import math
from collections.abc import Mapping, Sequence

import pandas as pd


def time_split(df: pd.DataFrame, test_fraction: float = 0.2) -> tuple[pd.DataFrame, pd.DataFrame]:
    """Делит взаимодействия на train и test по времени внутри каждого пользователя.

    В тест уходят последние floor(n * test_fraction) записей пользователя
    (после filter_interactions у всех n >= 5, то есть хотя бы одна).
    При равном updated_at порядок задаёт anime_id, чтобы деление было
    воспроизводимым. Записи без updated_at (у AniList это 17%, видимо
    старые) считаются самыми ранними и всегда остаются в train.
    """
    if not 0 < test_fraction < 1:
        raise ValueError("test_fraction должен быть в (0, 1)")
    ordered = df.sort_values(["user_id", "updated_at", "anime_id"], na_position="first")
    from_end = ordered.groupby("user_id").cumcount(ascending=False)
    # 1e-9 против ошибок округления: 0.29 * 100 = 28.999…, а должно быть 29
    n_test = (ordered["user_id"].map(ordered["user_id"].value_counts()) * test_fraction + 1e-9) // 1
    is_test = from_end < n_test
    return ordered[~is_test].reset_index(drop=True), ordered[is_test].reset_index(drop=True)


def relevant_items(test: pd.DataFrame, min_score: int = 5) -> dict[int, set[int]]:
    """Тестовые тайтлы, которые было бы правильно порекомендовать.

    Не считаются: брошенные (dropped) и с оценкой ниже min_score.
    planned считается: пользователь сам решил, что хочет это посмотреть.
    """
    good = (test["status"] != "dropped") & (test["score"].isna() | (test["score"] >= min_score))
    good = good.fillna(False).astype(bool)
    return test[good].groupby("user_id")["anime_id"].agg(set).to_dict()


def precision_at_k(recommended: Sequence[int], relevant: set[int], k: int) -> float:
    """Доля попаданий среди первых k рекомендаций."""
    hits = sum(item in relevant for item in recommended[:k])
    return hits / k


def recall_at_k(recommended: Sequence[int], relevant: set[int], k: int) -> float:
    """Доля релевантных тайтлов, найденных в первых k рекомендациях."""
    if not relevant:
        return 0.0
    hits = sum(item in relevant for item in recommended[:k])
    return hits / len(relevant)


def ndcg_at_k(recommended: Sequence[int], relevant: set[int], k: int) -> float:
    """NDCG@k с бинарной релевантностью: попадание выше в списке ценится больше.

    DCG = сумма 1 / log2(позиция + 1) по попаданиям; делим на DCG идеального
    списка, где все min(k, |relevant|) попаданий стоят в начале.
    """
    dcg = sum(1 / math.log2(pos + 2) for pos, item in enumerate(recommended[:k]) if item in relevant)
    ideal = sum(1 / math.log2(pos + 2) for pos in range(min(k, len(relevant))))
    return dcg / ideal if ideal else 0.0


def evaluate(
    recommendations: Mapping[int, Sequence[int]],
    relevant: Mapping[int, set[int]],
    k: int = 10,
) -> dict[str, float]:
    """Средние метрики по пользователям, у которых есть релевантные тайтлы в тесте.

    Пользователь без рекомендаций получает нули: модель, которая молчит,
    не должна выглядеть лучше.
    """
    users = [user for user, items in relevant.items() if items]
    if not users:
        raise ValueError("нет пользователей с релевантными тайтлами в тесте")
    totals = {f"precision@{k}": 0.0, f"recall@{k}": 0.0, f"ndcg@{k}": 0.0}
    for user in users:
        recs = recommendations.get(user, [])
        totals[f"precision@{k}"] += precision_at_k(recs, relevant[user], k)
        totals[f"recall@{k}"] += recall_at_k(recs, relevant[user], k)
        totals[f"ndcg@{k}"] += ndcg_at_k(recs, relevant[user], k)
    result = {name: value / len(users) for name, value in totals.items()}
    result["users"] = len(users)
    return result
