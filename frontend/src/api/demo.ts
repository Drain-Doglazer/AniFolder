import { Anime, UserListAnime } from '../types/anime';
import { useAuthStore } from '../store';

// Fictional fixtures for frontend development; no server persistence.
const titles = ['Сад забытых звёзд', 'Последний поезд домой', 'Клуб маленьких открытий', 'Письма из другого лета', 'Хранители бумажного города', 'За горизонтом тишины', 'Кофейня на краю осени', 'Легенда о лунном мосте', 'Мелодия дождя', 'Три дня до рассвета', 'Дом, где живёт ветер', 'Созвездие наших встреч'];
const descriptions = ['Юная хранительница сада собирает упавшие звёзды и истории людей, которые загадали на них желание.', 'Случайная встреча в ночном поезде превращается в путешествие по воспоминаниям незнакомого города.', 'Трое друзей решают каждый день открывать что-то новое — даже если для этого придётся перевернуть школьную жизнь.', 'Письмо без обратного адреса возвращает героиню в лето, которое она давно пыталась забыть.'];
export const demoAnime: Anime[] = titles.map((title, index) => ({ id: index + 1, shikimori_id: 0, title_ru: title, title_en: '', kind: index % 4 === 0 ? 'movie' : 'tv', status: index % 5 === 0 ? 'announced' : index % 3 === 0 ? 'ongoing' : 'finished', episodes: index % 4 === 0 ? 1 : index % 2 ? 12 : 24, aired_on: `${2022 + index % 5}-04-01`, description: descriptions[index % descriptions.length], poster_url: `/demo-posters/${index + 1}.svg` }));
export const demoGenres = [{ id: 1, name_ru: 'Приключения', name_en: 'Adventure' }, { id: 2, name_ru: 'Повседневность', name_en: 'Slice of life' }, { id: 3, name_ru: 'Драма', name_en: 'Drama' }];
export const listKey = () => ['myList', useAuthStore.getState().user?.username || 'guest'];
const storageKey = () => `anifolder:collection:v1:${useAuthStore.getState().user?.username || 'guest'}`;
export const readDemoList = (): UserListAnime[] => {
  const raw = localStorage.getItem(storageKey());
  if (raw) { try { const value = JSON.parse(raw); if (Array.isArray(value) && value.every(item => Number.isInteger(item.id) && typeof item.status === 'string' && Number.isFinite(item.episodes_watched))) return value; } catch { /* Reset invalid demo data. */ } }
  return demoAnime.slice(1, 4).map((anime, i) => ({ ...anime, status: i === 0 ? 'watching' : i === 1 ? 'planned' : 'completed', episodes_watched: i === 0 ? 4 : i === 1 ? 0 : anime.episodes, score: i === 2 ? 9 : null, updated_at: new Date().toISOString() }));
};
export type ListPatch = { status?: UserListAnime['status']; score?: number | null; episodes_watched?: number };
export const saveDemoItem = (id: number, patch: ListPatch) => {
  const list = readDemoList();
  const previous = list.find(item => item.id === id);
  const anime = demoAnime.find(item => item.id === id);
  if (!anime) throw new Error('Тайтл не найден');
  const item: UserListAnime = { ...anime, status: 'planned', episodes_watched: 0, score: null, ...previous, ...patch, updated_at: new Date().toISOString() };
  item.episodes_watched = Math.max(0, Math.min(item.episodes || Infinity, Math.trunc(item.episodes_watched)));
  localStorage.setItem(storageKey(), JSON.stringify([...list.filter(entry => entry.id !== id), item]));
  return item;
};
export const deleteDemoItem = (id: number) => localStorage.setItem(storageKey(), JSON.stringify(readDemoList().filter(item => item.id !== id)));
