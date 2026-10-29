import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getMyList, updateListItem, removeFromList } from '../api/profile';
import { useAuthStore } from '../store';
import { UserListAnime } from '../types/anime';
import { RecommendationsBlock } from '../components/RecommendationsBlock';

const STATUS_TABS = [
  { id: 'watching', label: 'Смотрю', color: '#d4845a' },
  { id: 'planned', label: 'В планах', color: '#9b8ec4' },
  { id: 'completed', label: 'Просмотрено', color: '#7a9e7e' },
  { id: 'on_hold', label: 'Отложено', color: '#b0a060' },
  { id: 'dropped', label: 'Брошено', color: '#b07a7a' },
] as const;

type StatusType = typeof STATUS_TABS[number]['id'];

export const ProfilePage = () => {
  const { user, isAuthenticated } = useAuthStore();
  const [activeTab, setActiveTab] = useState<StatusType>('watching');
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['myList'],
    queryFn: getMyList,
    enabled: isAuthenticated,
  });

  const fullList = data?.data || [];

  const updateMutation = useMutation({
    mutationFn: ({ animeId, payload }: { animeId: number; payload: any }) =>
      updateListItem(animeId, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['myList'] }),
  });

  const removeMutation = useMutation({
    mutationFn: (animeId: number) => removeFromList(animeId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['myList'] }),
  });

  const filteredList = fullList.filter((item) => item.status === activeTab);

  const handleScoreChange = (animeId: number, score: number | null) =>
    updateMutation.mutate({ animeId, payload: { score } });

  const handleEpisodesChange = (animeId: number, episodes: number) =>
    updateMutation.mutate({ animeId, payload: { episodes_watched: episodes } });

  const handleStatusChange = (animeId: number, status: StatusType) => {
    updateMutation.mutate({ animeId, payload: { status } });
    setActiveTab(status);
  };

  const handleRemove = (animeId: number) => {
    if (window.confirm('Убрать тайтл из списка?')) removeMutation.mutate(animeId);
  };

  if (!isAuthenticated) {
    return (
      <div className="text-center py-20 text-gray-400">
        <p className="text-lg">Пожалуйста, войдите в систему, чтобы увидеть свой профиль.</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8 p-6 rounded-lg shadow-sm border border-gray-800" style={{ backgroundColor: '#2a2a32' }}>
        <h1 className="text-3xl font-bold text-white mb-2">Привет, {user?.username}!</h1>
        <p className="text-gray-400">
          В вашем списке <span className="font-bold" style={{ color: '#d4845a' }}>{fullList.length}</span> тайтлов
        </p>
      </div>

      <RecommendationsBlock />

      <div className="flex flex-wrap gap-2 mb-6 pb-4">
        {STATUS_TABS.map((tab) => {
          const count = fullList.filter((i) => i.status === tab.id).length;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="px-4 py-2 rounded-lg font-medium transition-colors"
              style={{
                backgroundColor: activeTab === tab.id ? tab.color : '#1e1e24',
                color: activeTab === tab.id ? '#fff' : '#9ca3af',
                border: activeTab === tab.id ? 'none' : '1px solid #374151',
              }}
            >
              {tab.label} <span className="ml-1 text-sm opacity-75">({count})</span>
            </button>
          );
        })}
      </div>

      {isLoading ? (
        <div className="text-center py-20 text-gray-400">Загрузка списков...</div>
      ) : filteredList.length === 0 ? (
        <div className="text-center py-20 rounded-lg border border-gray-800" style={{ backgroundColor: '#2a2a32' }}>
          <p className="text-lg text-gray-300">
            В категории «{STATUS_TABS.find((t) => t.id === activeTab)?.label}» пока пусто
          </p>
          <p className="text-sm text-gray-500 mt-2">Добавьте тайтлы через каталог</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredList.map((item) => (
            <AnimeListItem
              key={item.id}
              item={item}
              onScoreChange={handleScoreChange}
              onEpisodesChange={handleEpisodesChange}
              onStatusChange={handleStatusChange}
              onRemove={handleRemove}
              isUpdating={updateMutation.isPending}
            />
          ))}
        </div>
      )}
    </div>
  );
};

interface AnimeListItemProps {
  item: UserListAnime;
  onScoreChange: (id: number, score: number | null) => void;
  onEpisodesChange: (id: number, episodes: number) => void;
  onStatusChange: (id: number, status: StatusType) => void;
  onRemove: (id: number) => void;
  isUpdating: boolean;
}

const AnimeListItem = ({ item, onScoreChange, onEpisodesChange, onStatusChange, onRemove, isUpdating }: AnimeListItemProps) => (
  <div className="p-4 rounded-lg shadow-sm border border-gray-800 flex gap-4 hover:shadow-md transition-shadow" style={{ backgroundColor: '#2a2a32' }}>
    <img
      src={item.poster_url || 'https://via.placeholder.com/80x120?text=No+Poster'}
      alt={item.title_ru}
      className="w-20 h-28 object-cover rounded flex-shrink-0"
    />
    <div className="flex-grow min-w-0">
      <div className="flex justify-between items-start mb-2">
        <div>
          <h3 className="font-bold text-white truncate">{item.title_ru}</h3>
          <p className="text-xs text-gray-400">
            {item.kind.toUpperCase()} • {item.episodes} эп. • {new Date(item.aired_on).getFullYear()}
          </p>
        </div>
        <button
          onClick={() => onRemove(item.id)}
          disabled={isUpdating}
          className="text-red-400 hover:text-red-300 text-sm font-medium disabled:opacity-50"
        >
          ✕
        </button>
      </div>
      <div className="flex flex-wrap gap-4 items-center">
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-400">Оценка:</label>
          <select
            value={item.score ?? ''}
            onChange={(e) => onScoreChange(item.id, e.target.value ? Number(e.target.value) : null)}
            disabled={isUpdating}
            className="border border-gray-700 rounded px-2 py-1 text-sm outline-none disabled:opacity-50 text-white"
            style={{ backgroundColor: '#1e1e24' }}
          >
            <option value="">—</option>
            {[...Array(10)].map((_, i) => <option key={i + 1} value={i + 1}>{i + 1}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-400">Эпизоды:</label>
          <input
            type="number"
            value={item.episodes_watched}
            onChange={(e) => onEpisodesChange(item.id, Math.min(Math.max(0, Number(e.target.value)), item.episodes))}
            disabled={isUpdating}
            className="border border-gray-700 rounded px-2 py-1 w-16 text-sm outline-none disabled:opacity-50 text-white"
            style={{ backgroundColor: '#1e1e24' }}
          />
          <span className="text-sm text-gray-500">/ {item.episodes || '?'}</span>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-400">Статус:</label>
          <select
            value={item.status}
            onChange={(e) => onStatusChange(item.id, e.target.value as StatusType)}
            disabled={isUpdating}
            className="border border-gray-700 rounded px-2 py-1 text-sm outline-none disabled:opacity-50 text-white"
            style={{ backgroundColor: '#1e1e24' }}
          >
            {STATUS_TABS.map((tab) => <option key={tab.id} value={tab.id}>{tab.label}</option>)}
          </select>
        </div>
      </div>
    </div>
  </div>
);