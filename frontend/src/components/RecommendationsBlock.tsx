import { useQuery } from '@tanstack/react-query';
import { getMyRecommendations } from '../api/profile';
import { AnimeCard } from './AnimeCard';
import { useAuthStore } from '../store';

export const RecommendationsBlock = () => {
  const { isAuthenticated } = useAuthStore();

  const { data, isLoading } = useQuery({
    queryKey: ['recommendations'],
    queryFn: getMyRecommendations,
    enabled: isAuthenticated,
  });

  const recommendations = data?.data || [];

  if (!isAuthenticated) return null;
  
  if (isLoading) {
    return (
      <div className="mb-10">
        <h2 className="text-2xl font-bold mb-4 text-white">Рекомендации для вас</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => <div key={i} className="h-80 rounded-lg animate-pulse" style={{ backgroundColor: '#2a2a32' }}></div>)}
        </div>
      </div>
    );
  }

  if (recommendations.length === 0) {
    return (
      <div className="mb-10 p-6 rounded-lg border" style={{ backgroundColor: '#2a2a32', borderColor: '#d4845a40' }}>
        <h2 className="text-xl font-bold mb-2" style={{ color: '#d4845a' }}>Рекомендации появятся скоро</h2>
        <p className="text-gray-400 text-sm">
          Добавьте хотя бы несколько тайтлов в список и поставьте оценки, чтобы мы могли подобрать что-то интересное.
        </p>
      </div>
    );
  }

  return (
    <div className="mb-10">
      <h2 className="text-2xl font-bold mb-4 text-white">Вам может понравиться</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {recommendations.map((rec) => <AnimeCard key={rec.anime_id} anime={rec.anime} />)}
      </div>
    </div>
  );
};