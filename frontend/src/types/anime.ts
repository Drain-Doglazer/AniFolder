export interface Anime {
  id: number;
  shikimori_id: number;
  title_ru: string;
  title_en: string;
  kind: string; // tv, movie, ova, ona, special
  status: string; // finished, ongoing, announced
  episodes: number;
  aired_on: string;
  description: string;
  poster_url: string;
}

export interface Genre {
  id: number;
  name_ru: string;
  name_en: string;
}

export interface AnimeListResponse {
  items: Anime[];
  total: number;
  page: number;
  limit: number;
}

// Тип для элемента списка пользователя (с расширенными полями)
export interface UserListAnime extends Anime {
  status: 'watching' | 'planned' | 'completed' | 'dropped' | 'on_hold';
  score: number | null;
  episodes_watched: number;
  updated_at: string;
}

// Тип для рекомендации
export interface Recommendation {
  anime_id: number;
  relevance: number;
  anime: Anime;
}

// Тип для элемента активности
export interface ActivityItem {
  id: number;
  type: 'added_to_list' | 'score_changed' | 'progress_updated' | 'review_created';
  anime_id: number;
  payload: {
    status?: string;
    score?: number;
    episodes_watched?: number;
    review_text?: string;
  };
  created_at: string;
  anime?: Anime;
}