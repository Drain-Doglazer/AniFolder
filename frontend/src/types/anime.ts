export interface Anime {
  id: number;
  anilist_id: number;
  mal_id: number | null;
  title_ru: string | null;
  title_en: string;
  kind: string | null;
  status: string;
  episodes: number | null;
  aired_on: string | null;
  poster_url: string | null;
}

export interface Genre {
  id: number;
  name_ru: string | null;
  name_en: string;
}

export interface AnimeDetail extends Anime {
  description: string | null;
  genres: Genre[];
  stats: {
    scores_count: number;
    avg_score: string | null;
    in_lists_count: number;
  } | null;
}

export const displayTitle = (anime: Anime) => anime.title_ru ?? anime.title_en;
export const displayGenre = (genre: Genre) => genre.name_ru ?? genre.name_en;

export interface AnimeListResponse {
  items: Anime[];
  total: number;
  page: number;
  limit: number;
}

export interface UserListAnime extends Anime {
  status: 'watching' | 'planned' | 'completed' | 'dropped' | 'on_hold';
  score: number | null;
  episodes_watched: number;
  updated_at: string;
}

export interface Recommendation {
  anime_id: number;
  relevance: number;
  anime: Anime;
}

export interface Page<T> { items:T[]; total:number; page:number; limit:number }
export interface UserProfile {
  id:number; username:string; avatar_url:string|null; bio:string|null; created_at:string;
  stats: Record<UserListAnime['status'], number> & { scores_count:number; mean_score:string|null };
}
type Status = UserListAnime['status'];
type Events = {
  list_added:{status:Status}; status_changed:{from:Status;to:Status};
  progress_updated:{episodes_watched:number}; scored:{score:number|null};
  reviewed:{review_id:number}; topic_created:{topic_id:number}; commented:{topic_id:number;comment_id:number};
};
export type ActivityItem = {id:number; created_at:string; anime_id:number|null; anime:Anime|null} &
  { [K in keyof Events]: {type:K;payload:Events[K]} }[keyof Events];
