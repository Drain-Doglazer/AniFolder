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

  // Загрузка данных тайтла
  const { data: animeData, isLoading: isLoadingAnime } = useQuery({
    queryKey: ['anime', animeId],
    queryFn: () => getAnimeDetails(animeId),
    enabled: !!animeId,
  });
  const anime = animeData?.data;

  // Загрузка отзывов
  const { data: reviewsData, isLoading: isLoadingReviews } = useQuery({
    queryKey: ['reviews', animeId],
    queryFn: () => getAnimeReviews(animeId),
    enabled: !!animeId,
  });
  const reviews = reviewsData?.data || [];

  // Мутация: Добавить отзыв
  const reviewMutation = useMutation({
    mutationFn: (data: { score: number; text: string }) => createReview(animeId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reviews', animeId] });
      setReviewText('');
      setReviewScore(10);
    },
  });

  // Мутация: Обновить список
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
    return <div className="text-center py-20 text-gray-500">Загрузка тайтла...</div>;
  }

  if (!anime) {
    return <div className="text-center py-20 text-red-500">Тайтл не найден</div>;
  }

  return (
    <div className="max-w-5xl mx-auto bg-white rounded-lg shadow-lg overflow-hidden">
      {/* Шапка тайтла */}
      <div className="md:flex">
        <div className="md:w-1/3">
          <img
            src={anime.poster_url || 'https://via.placeholder.com/400x600?text=No+Poster'}
            alt={anime.title_ru}
            className="w-full h-auto object-cover"
          />
        </div>
        <div className="p-6 md:w-2/3">
          <h1 className="text-3xl font-bold mb-2 text-gray-800">{anime.title_ru}</h1>
          <p className="text-gray-500 mb-4">
            {anime.title_en} • {anime.kind.toUpperCase()} • {new Date(anime.aired_on).getFullYear()}
          </p>
          <p className="mb-6 text-gray-700 leading-relaxed whitespace-pre-line">
            {anime.description}
          </p>

          {/* Кнопки действий */}
          <div className="flex flex-wrap gap-4 mb-6">
            <button
              onClick={() => handleAddToList('watching')}
              className="bg-yellow-500 text-white px-5 py-2 rounded-lg hover:bg-yellow-600 transition-colors font-medium shadow-sm"
            >
              Смотрю
            </button>
            <button
              onClick={() => handleAddToList('planned')}
              className="bg-purple-600 text-white px-5 py-2 rounded-lg hover:bg-purple-700 transition-colors font-medium shadow-sm"
            >
              В планах
            </button>
            <button
              onClick={() => handleAddToList('completed')}
              className="bg-green-600 text-white px-5 py-2 rounded-lg hover:bg-green-700 transition-colors font-medium shadow-sm"
            >
              Просмотрено
            </button>
            <button
              onClick={() => handleAddToList('dropped')}
              className="bg-red-600 text-white px-5 py-2 rounded-lg hover:bg-red-700 transition-colors font-medium shadow-sm"
            >
              Брошено
            </button>
          </div>
        </div>
      </div>

      {/* Блок отзывов */}
      <div className="p-6 border-t border-gray-200">
        <h2 className="text-2xl font-bold mb-4 text-gray-800">
          Отзывы сообщества ({reviews.length})
        </h2>

        {/* Форма отзыва */}
        {isAuthenticated && (
          <form
            onSubmit={handleReviewSubmit}
            className="mb-8 bg-gray-50 p-4 rounded-lg border border-gray-200"
          >
            <h3 className="font-bold mb-2 text-gray-700">Оставить отзыв</h3>
            <textarea
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              className="w-full border border-gray-300 rounded p-2 mb-3 focus:ring-2 focus:ring-blue-500 outline-none"
              rows={3}
              placeholder="Ваше мнение..."
              required
            />
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600">Оценка:</label>
                <select
                  value={reviewScore}
                  onChange={(e) => setReviewScore(Number(e.target.value))}
                  className="border border-gray-300 rounded p-1 focus:ring-2 focus:ring-blue-500 outline-none"
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
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {reviewMutation.isPending ? 'Отправка...' : 'Отправить'}
              </button>
            </div>
          </form>
        )}

        {/* Список отзывов */}
        <div className="space-y-4">
          {isLoadingReviews ? (
            <div className="text-center py-10 text-gray-500">Загрузка отзывов...</div>
          ) : reviews.length === 0 ? (
            <div className="text-center py-10 text-gray-500">
              Отзывов пока нет. Будьте первым!
            </div>
          ) : (
            reviews.map((review) => (
              <div key={review.id} className="border-b border-gray-100 pb-4 last:border-0">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-bold text-blue-600">{review.username}</span>
                  <span className="bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded text-sm font-bold border border-yellow-200">
                    {review.score}/10
                  </span>
                </div>
                <p className="text-gray-700 text-sm whitespace-pre-line">{review.text}</p>
                <p className="text-xs text-gray-400 mt-2">
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