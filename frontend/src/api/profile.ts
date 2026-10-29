import { apiClient } from './client';
import { UserListAnime, Recommendation } from '../types/anime';
import { readDemoList, saveDemoItem, deleteDemoItem, demoAnime, ListPatch } from './demo';
const USE_MOCK = true;
export type ListUpdateRequest = ListPatch;
export const getMyList = async (): Promise<{ data: UserListAnime[] }> => USE_MOCK ? { data: readDemoList() } : apiClient.get<UserListAnime[]>('/me/list');
export const getUserList = async (username: string): Promise<{ data: UserListAnime[] }> => USE_MOCK ? { data: [] } : apiClient.get<UserListAnime[]>(`/users/${username}/list`);
export const updateListItem = async (animeId: number, data: ListUpdateRequest) => USE_MOCK ? { data: saveDemoItem(animeId, data) } : apiClient.put(`/me/list/${animeId}`, data);
export const removeFromList = async (animeId: number) => { if (USE_MOCK) { deleteDemoItem(animeId); return { data: { success: true } }; } return apiClient.delete(`/me/list/${animeId}`); };
export const getMyRecommendations = async (): Promise<{ data: Recommendation[] }> => {
  if (!USE_MOCK) return apiClient.get<Recommendation[]>('/me/recommendations');
  const list = readDemoList();
  return { data: demoAnime.filter(anime => !list.some(item => item.id === anime.id)).slice(0, 4).map(anime => ({ anime_id: anime.id, relevance: 0, anime })) };
};
