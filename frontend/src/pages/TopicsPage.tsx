import { useState } from 'react';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getTopics, createTopic } from '../api/community';
import { TopicCard } from '../components/TopicCard';
import { useAuthStore } from '../store';

export const TopicsPage = () => {
  const { isAuthenticated } = useAuthStore();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');

  // Бесконечная загрузка тем (курсорная пагинация)
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useInfiniteQuery({
    queryKey: ['topics'],
    queryFn: ({ pageParam }) => getTopics(pageParam as string | undefined),
    getNextPageParam: (lastPage) => lastPage.data.next_cursor,
    initialPageParam: undefined,
  });

  const topics = data?.pages.flatMap((page) => page.data.items) || [];

  const createMutation = useMutation({
    mutationFn: createTopic,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['topics'] });
      setShowForm(false);
      setTitle('');
      setBody('');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({ title, body });
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Сообщество</h1>
        {isAuthenticated && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
          >
            {showForm ? 'Отмена' : 'Создать тему'}
          </button>
        )}
      </div>

      {/* Форма создания темы */}
      {showForm && (
        <form onSubmit={handleSubmit} className="mb-8 bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h2 className="text-xl font-bold mb-4 text-gray-700">Новая тема</h2>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Заголовок темы"
            className="w-full border border-gray-300 rounded p-2 mb-3 focus:ring-2 focus:ring-blue-500 outline-none"
            required
          />
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Описание..."
            className="w-full border border-gray-300 rounded p-2 mb-3 focus:ring-2 focus:ring-blue-500 outline-none"
            rows={4}
            required
          />
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50"
          >
            {createMutation.isPending ? 'Создание...' : 'Опубликовать'}
          </button>
        </form>
      )}

      {/* Список тем */}
      {isLoading ? (
        <div className="text-center py-20 text-gray-500">Загрузка тем...</div>
      ) : (
        <>
          <div className="space-y-4">
            {topics.map((topic) => (
              <TopicCard key={topic.id} topic={topic} />
            ))}
          </div>

          {topics.length === 0 && (
            <div className="text-center py-20 text-gray-500">Тем пока нет. Будьте первым!</div>
          )}

          {hasNextPage && (
            <div className="text-center mt-8">
              <button
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
                className="bg-white border border-gray-300 px-6 py-2 rounded-md shadow-sm hover:bg-gray-50 disabled:opacity-50"
              >
                {isFetchingNextPage ? 'Загрузка...' : 'Загрузить еще'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};