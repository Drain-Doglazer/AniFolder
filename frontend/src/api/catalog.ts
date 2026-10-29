import { apiClient } from './client';
import { AnimeListResponse, Genre } from '../types/anime';

// ВРЕМЕННЫЙ МОК ДЛЯ ПРОВЕРКИ UI БЕЗ БЭКЕНДА
const USE_MOCK = true; 

interface GetAnimeParams {
  page?: number;
  limit?: number;
  search?: string;
  genre_id?: number;
  status?: string;
}

export const getAnimeList = async (params: GetAnimeParams): Promise<{ data: AnimeListResponse }> => {
  if (USE_MOCK) {
    // Имитация задержки сети
    await new Promise(r => setTimeout(r, 300)); 
    
    return {
      data: {
        items: Array.from({ length: params.limit || 12 }).map((_, i) => ({
          id: i + 1,
          shikimori_id: 1000 + i,
          title_ru: `Тестовое аниме #${i + 1}`,
          title_en: `Test Anime ${i + 1}`,
          kind: 'tv',
          status: 'finished',
          episodes: 12 + i,
          aired_on: '2024-01-01',
          description: 'Это тестовое описание тайтла для проверки верстки каталога без подключения к реальному бэкенду.',
          poster_url: 'https://via.placeholder.com/300x450?text=Poster',
        })),
        total: 100,
        page: params.page || 1,
        limit: params.limit || 12,
      }
    };
  }

  // Реальный запрос к API
  return apiClient.get<AnimeListResponse>('/anime', { params });
};

export const getGenres = async (): Promise<{ data: Genre[] }> => {
  if (USE_MOCK) {
    await new Promise(r => setTimeout(r, 100));
    return {
      data: [
        { id: 1, name_ru: 'Экшен', name_en: 'Action' },
        { id: 2, name_ru: 'Комедия', name_en: 'Comedy' },
        { id: 3, name_ru: 'Драма', name_en: 'Drama' },
      ]
    };
  }
  return apiClient.get<Genre[]>('/genres');
};