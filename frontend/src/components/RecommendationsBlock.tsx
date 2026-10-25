import { useQuery } from '@tanstack/react-query';
import { getMyRecommendations } from '../api/profile';
import { AnimeCard } from './AnimeCard';
import { useAuthStore } from '../store';

export const RecommendationsBlock = () => {
  const { isAuthenticated } = useAuthStore();

  const { data, isLoading } = useQuery({
    queryKey: ['recommendations'],
    queryFn: getMyRecommendations,
    enabled: isAuthenticated, // Запрашиваем только если авторизован
  });

  const recommendations = data?.data || [];

  if (!isAuthenticated) return null;
  if (isLoading) {
    return (
      <div className="mb-10">
        <h2 className="text-2xl font-bold mb-4 text-gray-800">Рекомендации для вас</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-80 bg-gray-200 rounded-lg animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  if (recommendations.length === 0) {
    return (
      <div className="mb-10 p-6 bg-blue-50 border border-blue-200 rounded-lg">
        <h2 className="text-xl font-bold mb-2 text-blue-800">Рекомендации появятся скоро</h2>
        <p className="text-blue-700 text-sm">
          Добавьте хотя бы несколько тайтлов в список и поставьте оценки, чтобы мы могли подобрать что-то интересное для вас.
        </p>
      </div>
    );
  }

  return (
    <div className="mb-10">
      <h2 className="text-2xl font-bold mb-4 text-gray-800">Вам может понравиться</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {recommendations.map((rec) => (
          <AnimeCard key={rec.anime_id} anime={rec.anime} />
        ))}
      </div>
    </div>
  );
};