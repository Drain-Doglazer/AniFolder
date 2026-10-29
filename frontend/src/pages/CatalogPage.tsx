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

  const debouncedSearch = useDebounce(search, 500);

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

  const { data: genresData } = useQuery({
    queryKey: ['genres'],
    queryFn: getGenres,
  });

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setPage(1);
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

  // Единый стиль для инпутов/селектов
  const inputStyle = {
    backgroundColor: '#1e1e24',
    color: '#f0ece2',
    borderColor: '#374151',
  };

  // Стиль для placeholder
  const placeholderStyle = {
    ...inputStyle,
  };

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6" style={{ color: '#f0ece2' }}>Каталог аниме</h1>

      <div className="mb-8 flex flex-wrap gap-4 p-4 rounded-lg" style={{ backgroundColor: '#2a2a32', border: '1px solid #1f2937' }}>
        <input
          type="text"
          placeholder="Поиск по названию..."
          value={search}
          onChange={handleSearch}
          style={inputStyle}
          className="p-2 rounded w-full md:w-1/3 outline-none"
        />
        <select
          value={selectedGenre || ''}
          onChange={handleGenreChange}
          style={inputStyle}
          className="p-2 rounded outline-none"
        >
          <option value="">Все жанры</option>
          {genresData?.data.map((g) => (
            <option key={g.id} value={g.id} style={{ backgroundColor: '#1e1e24', color: '#f0ece2' }}>
              {g.name_ru}
            </option>
          ))}
        </select>
        <select
          value={status || ''}
          onChange={handleStatusChange}
          style={inputStyle}
          className="p-2 rounded outline-none"
        >
          <option value="">Любой статус</option>
          <option value="ongoing" style={{ backgroundColor: '#1e1e24', color: '#f0ece2' }}>Онгоинг</option>
          <option value="finished" style={{ backgroundColor: '#1e1e24', color: '#f0ece2' }}>Завершен</option>
          <option value="announced" style={{ backgroundColor: '#1e1e24', color: '#f0ece2' }}>Анонс</option>
        </select>
      </div>

      {isLoading ? (
        <div className="text-center py-20" style={{ color: '#9ca3af' }}>Загрузка каталога...</div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {animeList.map((anime) => (
              <AnimeCard key={anime.id} anime={anime} />
            ))}
          </div>

          {animeList.length === 0 && (
            <div className="text-center py-20 rounded-lg" style={{ backgroundColor: '#2a2a32', border: '1px solid #1f2937' }}>
              <p className="text-lg" style={{ color: '#d1d5db' }}>Ничего не найдено</p>
              <p className="text-sm mt-2" style={{ color: '#6b7280' }}>Попробуйте изменить параметры поиска</p>
            </div>
          )}

          {animeList.length > 0 && (
            <div className="mt-10 flex justify-center gap-4">
              <button
                disabled={currentPage === 1}
                onClick={() => setPage((p) => p - 1)}
                className="px-6 py-2 rounded-md transition-colors disabled:cursor-not-allowed"
                style={{ 
                  backgroundColor: '#2a2a32', 
                  border: '1px solid #374151',
                  color: '#d1d5db'
                }}
              >
                ← Назад
              </button>
              <span 
                className="px-4 py-2 rounded-md"
                style={{ 
                  backgroundColor: '#2a2a32', 
                  border: '1px solid #374151',
                  color: '#f0ece2'
                }}
              >
                Страница {currentPage}
              </span>
              <button
                disabled={animeList.length < 12}
                onClick={() => setPage((p) => p + 1)}
                className="px-6 py-2 rounded-md transition-colors disabled:cursor-not-allowed"
                style={{ 
                  backgroundColor: '#2a2a32', 
                  border: '1px solid #374151',
                  color: '#d1d5db'
                }}
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