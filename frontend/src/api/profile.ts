import { apiClient } from './client';
import { UserListAnime, Recommendation } from '../types/anime';

const USE_MOCK = true;

export interface ListUpdateRequest {
  status?: 'watching' | 'planned' | 'completed' | 'dropped' | 'on_hold';
  score?: number;
  episodes_watched?: number;
}

export const getMyList = async (): Promise<{ data: UserListAnime[] }> => {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 300));
    return {
      data: [
        { id: 1, shikimori_id: 1, title_ru: 'Атака Титанов', title_en: 'Attack on Titan', kind: 'tv', status: 'watching', episodes: 25, episodes_watched: 10, score: 9, aired_on: '2013-04-07', description: '', poster_url: 'https://via.placeholder.com/80x120', updated_at: new Date().toISOString() },
        { id: 2, shikimori_id: 2, title_ru: 'Ван-Пис', title_en: 'One Piece', kind: 'tv', status: 'planned', episodes: 1000, episodes_watched: 0, score: null, aired_on: '1999-10-20', description: '', poster_url: 'https://via.placeholder.com/80x120', updated_at: new Date().toISOString() },
        { id: 3, shikimori_id: 3, title_ru: 'Тетрадь смерти', title_en: 'Death Note', kind: 'tv', status: 'completed', episodes: 37, episodes_watched: 37, score: 10, aired_on: '2006-10-04', description: '', poster_url: 'https://via.placeholder.com/80x120', updated_at: new Date().toISOString() },
      ],
    };
  }
  return apiClient.get<UserListAnime[]>('/me/list');
};

export const getUserList = async (username: string): Promise<{ data: UserListAnime[] }> => {
  if (USE_MOCK) return getMyList(); // Возвращаем то же самое для теста
  return apiClient.get<UserListAnime[]>(`/users/${username}/list`);
};

export const updateListItem = async (animeId: number, data: ListUpdateRequest): Promise<{ data: any }> => {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 300));
    return { data: { success: true } };
  }
  return apiClient.put(`/me/list/${animeId}`, data);
};

export const removeFromList = async (animeId: number): Promise<{ data: any }> => {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 300));
    return { data: { success: true } };
  }
  return apiClient.delete(`/me/list/${animeId}`);
};

export const getMyRecommendations = async (): Promise<{ data: Recommendation[] }> => {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 400));
    return {
      data: [
        { anime_id: 101, relevance: 0.95, anime: { id: 101, shikimori_id: 101, title_ru: 'Рекомендация 1', title_en: 'Rec 1', kind: 'movie', status: 'finished', episodes: 1, aired_on: '2020-01-01', description: 'Мок рекомендация', poster_url: 'https://via.placeholder.com/300x450?text=Rec+1' } },
        { anime_id: 102, relevance: 0.88, anime: { id: 102, shikimori_id: 102, title_ru: 'Рекомендация 2', title_en: 'Rec 2', kind: 'tv', status: 'ongoing', episodes: 12, aired_on: '2024-01-01', description: 'Мок рекомендация', poster_url: 'https://via.placeholder.com/300x450?text=Rec+2' } },
      ],
    };
  }
  return apiClient.get<Recommendation[]>('/me/recommendations');
};