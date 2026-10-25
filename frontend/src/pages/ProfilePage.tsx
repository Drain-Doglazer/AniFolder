import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getMyList, updateListItem, removeFromList } from '../api/profile';
import { useAuthStore } from '../store';
import { UserListAnime } from '../types/anime';
import { RecommendationsBlock } from '../components/RecommendationsBlock';

const STATUS_TABS = [
  { id: 'watching', label: 'Смотрю', color: 'bg-green-100 text-green-800' },
  { id: 'planned', label: 'В планах', color: 'bg-blue-100 text-blue-800' },
  { id: 'completed', label: 'Просмотрено', color: 'bg-gray-100 text-gray-800' },
  { id: 'on_hold', label: 'Отложено', color: 'bg-yellow-100 text-yellow-800' },
  { id: 'dropped', label: 'Брошено', color: 'bg-red-100 text-red-800' },
] as const;

type StatusType = typeof STATUS_TABS[number]['id'];

export const ProfilePage = () => {
  const { user, isAuthenticated } = useAuthStore();
  const [activeTab, setActiveTab] = useState<StatusType>('watching');
  const queryClient = useQueryClient();

  // Загрузка списка
  const { data, isLoading } = useQuery({
    queryKey: ['myList'],
    queryFn: getMyList,
    enabled: isAuthenticated,
  });

  const fullList = data?.data || [];

  // Мутация: обновить элемент списка
  const updateMutation = useMutation({
    mutationFn: ({ animeId, payload }: { animeId: number; payload: any }) =>
      updateListItem(animeId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myList'] });
    },
  });

  // Мутация: удалить из списка
  const removeMutation = useMutation({
    mutationFn: (animeId: number) => removeFromList(animeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myList'] });
    },
  });

  const filteredList = fullList.filter((item) => item.status === activeTab);

  const handleScoreChange = (animeId: number, score: number | null) => {
    updateMutation.mutate({ animeId, payload: { score } });
  };

  const handleEpisodesChange = (animeId: number, episodes: number) => {
    updateMutation.mutate({ animeId, payload: { episodes_watched: episodes } });
  };

  const handleStatusChange = (animeId: number, status: StatusType) => {
    updateMutation.mutate({ animeId, payload: { status } });
    setActiveTab(status);
  };

  const handleRemove = (animeId: number) => {
    if (window.confirm('Убрать тайтл из списка?')) {
      removeMutation.mutate(animeId);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500 text-lg">Пожалуйста, войдите в систему, чтобы увидеть свой профиль.</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Шапка профиля */}
      <div className="mb-8 bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Привет, {user?.username}!</h1>
        <p className="text-gray-500">
          В вашем списке <span className="font-bold text-blue-600">{fullList.length}</span> тайтлов
        </p>
      </div>

      {/* Блок рекомендаций */}
      <RecommendationsBlock />

      {/* Табы статусов */}
      <div className="flex flex-wrap gap-2 mb-6 border-b border-gray-200 pb-4">
        {STATUS_TABS.map((tab) => {
          const count = fullList.filter((i) => i.status === tab.id).length;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === tab.id
                  ? `${tab.color} ring-2 ring-offset-1 ring-blue-400`
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {tab.label} <span className="ml-1 text-sm opacity-75">({count})</span>
            </button>
          );
        })}
      </div>

      {/* Список тайтлов */}
      {isLoading ? (
        <div className="text-center py-20 text-gray-500">Загрузка списков...</div>
      ) : filteredList.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-lg border border-gray-200">
          <p className="text-gray-500 text-lg">
            В категории «{STATUS_TABS.find((t) => t.id === activeTab)?.label}» пока пусто
          </p>
          <p className="text-gray-400 text-sm mt-2">Добавьте тайтлы через каталог</p>
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

// Компонент отдельного элемента списка
interface AnimeListItemProps {
  item: UserListAnime;
  onScoreChange: (id: number, score: number | null) => void;
  onEpisodesChange: (id: number, episodes: number) => void;
  onStatusChange: (id: number, status: StatusType) => void;
  onRemove: (id: number) => void;
  isUpdating: boolean;
}

const AnimeListItem = ({
  item,
  onScoreChange,
  onEpisodesChange,
  onStatusChange,
  onRemove,
  isUpdating,
}: AnimeListItemProps) => {
  return (
    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex gap-4 hover:shadow-md transition-shadow">
      {/* Постер */}
      <img
        src={item.poster_url || 'https://via.placeholder.com/80x120?text=No+Poster'}
        alt={item.title_ru}
        className="w-20 h-28 object-cover rounded flex-shrink-0"
      />

      {/* Информация */}
      <div className="flex-grow min-w-0">
        <div className="flex justify-between items-start mb-2">
          <div>
            <h3 className="font-bold text-gray-800 truncate">{item.title_ru}</h3>
            <p className="text-xs text-gray-500">
              {item.kind.toUpperCase()} • {item.episodes} эп. • {new Date(item.aired_on).getFullYear()}
            </p>
          </div>
          <button
            onClick={() => onRemove(item.id)}
            disabled={isUpdating}
            className="text-red-500 hover:text-red-700 text-sm font-medium disabled:opacity-50"
            title="Убрать из списка"
          >
            ✕
          </button>
        </div>

        {/* Контролы */}
        <div className="flex flex-wrap gap-4 items-center">
          {/* Оценка */}
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">Оценка:</label>
            <select
              value={item.score ?? ''}
              onChange={(e) => onScoreChange(item.id, e.target.value ? Number(e.target.value) : null)}
              disabled={isUpdating}
              className="border border-gray-300 rounded px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 outline-none disabled:opacity-50"
            >
              <option value="">—</option>
              {[...Array(10)].map((_, i) => (
                <option key={i + 1} value={i + 1}>
                  {i + 1}
                </option>
              ))}
            </select>
          </div>

          {/* Прогресс эпизодов */}
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">Эпизоды:</label>
            <input
              type="number"
              value={item.episodes_watched}
              onChange={(e) => {
                const val = Math.min(Math.max(0, Number(e.target.value)), item.episodes);
                onEpisodesChange(item.id, val);
              }}
              disabled={isUpdating}
              min={0}
              max={item.episodes}
              className="border border-gray-300 rounded px-2 py-1 w-16 text-sm focus:ring-2 focus:ring-blue-500 outline-none disabled:opacity-50"
            />
            <span className="text-sm text-gray-400">/ {item.episodes || '?'}</span>
          </div>

          {/* Смена статуса */}
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">Статус:</label>
            <select
              value={item.status}
              onChange={(e) => onStatusChange(item.id, e.target.value as StatusType)}
              disabled={isUpdating}
              className="border border-gray-300 rounded px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 outline-none disabled:opacity-50"
            >
              {STATUS_TABS.map((tab) => (
                <option key={tab.id} value={tab.id}>
                  {tab.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </div>
  );
};