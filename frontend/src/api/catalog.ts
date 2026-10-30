import { apiClient } from './client';
import { AnimeListResponse, Genre } from '../types/anime';
import { demoAnime, demoGenres } from './demo';
const USE_MOCK = true;
interface GetAnimeParams { page?: number; limit?: number; search?: string; genre_id?: number; status?: string; }
export const getAnimeList = async (params: GetAnimeParams): Promise<{ data: AnimeListResponse }> => {
  if (USE_MOCK) {
    const page = params.page || 1, limit = params.limit || 12;
    const items = demoAnime.filter(anime => (!params.search || anime.title_ru.toLowerCase().includes(params.search.toLowerCase().trim())) && (!params.status || anime.status === params.status) && (!params.genre_id || (anime.id - 1) % 3 + 1 === params.genre_id));
    return { data: { items: items.slice((page - 1) * limit, page * limit), total: items.length, page, limit } };
  }
  return apiClient.get<AnimeListResponse>('/anime', { params });
};
export const getGenres = async (): Promise<{ data: Genre[] }> => USE_MOCK ? { data: demoGenres } : apiClient.get<Genre[]>('/genres');
