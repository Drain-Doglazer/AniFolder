import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getAnimeList, getGenres } from '../api/catalog';
import { AnimeCard } from '../components/AnimeCard';
import { useDebounce } from '../hooks/useDebounce';

export const CatalogPage = () => {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [selectedGenre, setSelectedGenre] = useState<number | undefined>(undefined);
  const [status, setStatus] = useState<string | undefined>(undefined);

  // Используем debounce для поиска, чтобы не дёргать API на каждое нажатие клавиши
  const debouncedSearch = useDebounce(search, 500);

  // Загрузка списка аниме
  const { data, isLoading } = useQuery({
    queryKey: ['anime', page, debouncedSearch, selectedGenre, status],
    queryFn: () =>
      getAnimeList({
        page,
        limit: 12,
        search: debouncedSearch || undefined,
        genre_id: selectedGenre,
        status: status,
      }),
  });

  // Загрузка жанров для фильтра
  const { data: genresData } = useQuery({
    queryKey: ['genres'],
    queryFn: getGenres,
  });

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setPage(1); // Сброс страницы при новом поиске
  };

  const handleGenreChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedGenre(e.target.value ? Number(e.target.value) : undefined);
    setPage(1);
  };

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setStatus(e.target.value || undefined);
    setPage(1);
  };

  const animeList = data?.data.items || [];
  const currentPage = data?.data.page || 1;

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6 text-gray-800">Каталог аниме</h1>

      {/* Панель фильтров */}
      <div className="mb-8 flex flex-wrap gap-4 bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <input
          type="text"
          placeholder="Поиск по названию..."
          value={search}
          onChange={handleSearch}
          className="border border-gray-300 p-2 rounded w-full md:w-1/3 focus:ring-2 focus:ring-blue-500 outline-none"
        />
        <select
          value={selectedGenre || ''}
          onChange={handleGenreChange}
          className="border border-gray-300 p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none"
        >
          <option value="">Все жанры</option>
          {genresData?.data.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name_ru}
            </option>
          ))}
        </select>
        <select
          value={status || ''}
          onChange={handleStatusChange}
          className="border border-gray-300 p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none"
        >
          <option value="">Любой статус</option>
          <option value="ongoing">Онгоинг</option>
          <option value="finished">Завершен</option>
          <option value="announced">Анонс</option>
        </select>
      </div>

      {/* Основной контент */}
      {isLoading ? (
        <div className="text-center py-20 text-gray-500">Загрузка каталога...</div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {animeList.map((anime) => (
              <AnimeCard key={anime.id} anime={anime} />
            ))}
          </div>

          {animeList.length === 0 && (
            <div className="text-center py-20 text-gray-500 bg-white rounded-lg border border-gray-200">
              <p className="text-lg">Ничего не найдено</p>
              <p className="text-sm text-gray-400 mt-2">Попробуйте изменить параметры поиска</p>
            </div>
          )}

          {/* Пагинация */}
          {animeList.length > 0 && (
            <div className="mt-10 flex justify-center gap-4">
              <button
                disabled={currentPage === 1}
                onClick={() => setPage((p) => p - 1)}
                className="px-6 py-2 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                ← Назад
              </button>
              <span className="px-4 py-2 text-gray-600 bg-white border border-gray-200 rounded-md">
                Страница {currentPage}
              </span>
              <button
                disabled={animeList.length < 12}
                onClick={() => setPage((p) => p + 1)}
                className="px-6 py-2 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Вперед →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};