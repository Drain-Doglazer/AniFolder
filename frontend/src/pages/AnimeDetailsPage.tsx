import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { getAnimeDetails, getAnimeReviews, createReview, updateMyList } from '../api/anime';
import { useAuthStore } from '../store';

export const AnimeDetailsPage = () => {
  const { id } = useParams<{ id: string }>();
  const animeId = Number(id);
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuthStore();

  const [reviewText, setReviewText] = useState('');
  const [reviewScore, setReviewScore] = useState(10);

  const { data: animeData, isLoading: isLoadingAnime } = useQuery({
    queryKey: ['anime', animeId],
    queryFn: () => getAnimeDetails(animeId),
    enabled: !!animeId,
  });
  const anime = animeData?.data;

  const { data: reviewsData, isLoading: isLoadingReviews } = useQuery({
    queryKey: ['reviews', animeId],
    queryFn: () => getAnimeReviews(animeId),
    enabled: !!animeId,
  });
  const reviews = reviewsData?.data || [];

  const reviewMutation = useMutation({
    mutationFn: (data: { score: number; text: string }) => createReview(animeId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reviews', animeId] });
      setReviewText('');
      setReviewScore(10);
    },
  });

  const listMutation = useMutation({
    mutationFn: (status: string) => updateMyList(animeId, { status: status as any }),
    onSuccess: () => {
      alert('Список обновлен!');
    },
  });

  const handleAddToList = (status: string) => {
    if (!isAuthenticated) {
      alert('Пожалуйста, войдите в систему');
      return;
    }
    listMutation.mutate(status);
  };

  const handleReviewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      alert('Пожалуйста, войдите в систему');
      return;
    }
    reviewMutation.mutate({ score: reviewScore, text: reviewText });
  };

  if (isLoadingAnime) {
    return <div className="text-center py-20 text-gray-400">Загрузка тайтла...</div>;
  }

  if (!anime) {
    return <div className="text-center py-20 text-red-400">Тайтл не найден</div>;
  }

  return (
    <div className="max-w-5xl mx-auto rounded-lg shadow-lg overflow-hidden" style={{ backgroundColor: '#2a2a32' }}>
      <div className="md:flex">
        <div className="md:w-1/3">
          <img
            src={anime.poster_url || 'https://via.placeholder.com/400x600?text=No+Poster'}
            alt={anime.title_ru}
            className="w-full h-auto object-cover"
          />
        </div>
        <div className="p-6 md:w-2/3">
          <h1 className="text-3xl font-bold mb-2 text-white">{anime.title_ru}</h1>
          <p className="text-gray-400 mb-4">
            {anime.title_en} • {anime.kind.toUpperCase()} • {new Date(anime.aired_on).getFullYear()}
          </p>
          <p className="mb-6 text-gray-300 leading-relaxed whitespace-pre-line">
            {anime.description}
          </p>

          <div className="flex flex-wrap gap-4 mb-6">
            <button
              onClick={() => handleAddToList('watching')}
              className="text-white px-5 py-2 rounded-lg hover:opacity-90 transition-colors font-medium shadow-sm"
              style={{ backgroundColor: '#d4845a' }}
            >
              Смотрю
            </button>
            <button
              onClick={() => handleAddToList('planned')}
              className="text-white px-5 py-2 rounded-lg hover:opacity-90 transition-colors font-medium shadow-sm"
              style={{ backgroundColor: '#9b8ec4' }}
            >
              В планах
            </button>
            <button
              onClick={() => handleAddToList('completed')}
              className="text-white px-5 py-2 rounded-lg hover:opacity-90 transition-colors font-medium shadow-sm"
              style={{ backgroundColor: '#7a9e7e' }}
            >
              Просмотрено
            </button>
            <button
              onClick={() => handleAddToList('dropped')}
              className="text-white px-5 py-2 rounded-lg hover:opacity-90 transition-colors font-medium shadow-sm"
              style={{ backgroundColor: '#b07a7a' }}
            >
              Брошено
            </button>
          </div>
        </div>
      </div>

      <div className="p-6 border-t border-gray-800">
        <h2 className="text-2xl font-bold mb-4 text-white">
          Отзывы сообщества ({reviews.length})
        </h2>

        {isAuthenticated && (
          <form
            onSubmit={handleReviewSubmit}
            className="mb-8 p-4 rounded-lg border border-gray-800"
            style={{ backgroundColor: '#1e1e24' }}
          >
            <h3 className="font-bold mb-2 text-gray-200">Оставить отзыв</h3>
            <textarea
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              className="w-full border border-gray-700 bg-gray-900 text-white rounded p-2 mb-3 focus:ring-2 outline-none"
              rows={3}
              placeholder="Ваше мнение..."
              required
            />
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-400">Оценка:</label>
                <select
                  value={reviewScore}
                  onChange={(e) => setReviewScore(Number(e.target.value))}
                  className="border border-gray-700 bg-gray-900 text-white rounded p-1 focus:ring-2 outline-none"
                >
                  {[...Array(10)].map((_, i) => (
                    <option key={i + 1} value={i + 1}>
                      {i + 1}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="submit"
                disabled={reviewMutation.isPending || !reviewText}
                className="text-white px-4 py-2 rounded hover:opacity-90 disabled:opacity-50 transition-colors font-medium"
                style={{ backgroundColor: '#d4845a' }}
              >
                {reviewMutation.isPending ? 'Отправка...' : 'Отправить'}
              </button>
            </div>
          </form>
        )}

        <div className="space-y-4">
          {isLoadingReviews ? (
            <div className="text-center py-10 text-gray-400">Загрузка отзывов...</div>
          ) : reviews.length === 0 ? (
            <div className="text-center py-10 text-gray-400">
              Отзывов пока нет. Будьте первым!
            </div>
          ) : (
            reviews.map((review) => (
              <div key={review.id} className="border-b border-gray-800 pb-4 last:border-0">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-bold" style={{ color: '#d4845a' }}>{review.username}</span>
                  <span 
                    className="px-2 py-0.5 rounded text-sm font-bold border"
                    style={{ backgroundColor: '#d4845a20', color: '#d4845a', borderColor: '#d4845a40' }}
                  >
                    {review.score}/10
                  </span>
                </div>
                <p className="text-gray-300 text-sm whitespace-pre-line">{review.text}</p>
                <p className="text-xs text-gray-500 mt-2">
                  {new Date(review.created_at).toLocaleDateString()}
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};