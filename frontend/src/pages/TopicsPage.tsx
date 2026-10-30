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

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useInfiniteQuery({
    queryKey: ['topics'],
    queryFn: ({ pageParam }) => getTopics(pageParam as string | undefined),
    getNextPageParam: (lastPage) => lastPage.data.next_cursor,
    initialPageParam: undefined as string | undefined,
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
        <h1 className="text-3xl font-bold text-white">Сообщество</h1>
        {isAuthenticated && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="text-white px-4 py-2 rounded-lg hover:opacity-90 transition-colors font-medium"
            style={{ backgroundColor: '#a884b5', color: '#211926' }}
          >
            {showForm ? 'Отмена' : 'Создать тему'}
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="mb-8 p-6 rounded-lg shadow-sm border border-gray-800" style={{ backgroundColor: '#27222b' }}>
          <h2 className="text-xl font-bold mb-4 text-gray-200">Новая тема</h2>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Заголовок темы"
            className="w-full border border-gray-700 rounded p-2 mb-3 outline-none text-white"
            style={{ backgroundColor: '#1c191f' }}
            required
          />
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Описание..."
            className="w-full border border-gray-700 rounded p-2 mb-3 outline-none text-white"
            style={{ backgroundColor: '#1c191f' }}
            rows={4}
            required
          />
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="text-white px-4 py-2 rounded hover:opacity-90 disabled:opacity-50 font-medium"
            style={{ backgroundColor: '#829885' }}
          >
            {createMutation.isPending ? 'Создание...' : 'Опубликовать'}
          </button>
        </form>
      )}

      {isLoading ? (
        <div className="text-center py-20 text-gray-400">Загрузка тем...</div>
      ) : (
        <>
          <div className="space-y-4">
            {topics.map((topic) => <TopicCard key={topic.id} topic={topic} />)}
          </div>

          {topics.length === 0 && (
            <div className="text-center py-20 text-gray-400">Тем пока нет. Будьте первым!</div>
          )}

          {hasNextPage && (
            <div className="text-center mt-8">
              <button
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
                className="border border-gray-700 px-6 py-2 rounded-md shadow-sm hover:bg-gray-800 disabled:opacity-50 text-gray-300"
                style={{ backgroundColor: '#27222b' }}
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


