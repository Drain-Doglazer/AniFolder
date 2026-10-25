import { useParams } from 'react-router-dom';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { getTopicComments, createComment } from '../api/community';
import { CommentItem } from '../components/CommentItem';
import { useAuthStore } from '../store';

export const TopicDetailsPage = () => {
  const { id } = useParams<{ id: string }>();
  const topicId = Number(id);
  const { isAuthenticated } = useAuthStore();
  const queryClient = useQueryClient();

  const [commentBody, setCommentBody] = useState('');

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useInfiniteQuery({
    queryKey: ['comments', topicId],
    queryFn: ({ pageParam }) => getTopicComments(topicId, pageParam as string | undefined),
    getNextPageParam: (lastPage) => lastPage.data.next_cursor,
    initialPageParam: undefined,
    enabled: !!topicId,
  });

  const comments = data?.pages.flatMap((page) => page.data.items) || [];

  const commentMutation = useMutation({
    mutationFn: (body: string) => createComment(topicId, { body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', topicId] });
      setCommentBody('');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      alert('Пожалуйста, войдите в систему');
      return;
    }
    commentMutation.mutate(commentBody);
  };

  if (isLoading) {
    return <div className="text-center py-20 text-gray-500">Загрузка темы...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Здесь мог бы быть блок с самой темой, если бы мы передавали её данные.
          Для простоты показываем только комментарии, так как эндпоинт /topics/{id} в README не описан, 
          но обычно он возвращает тело темы. */}
      
      <h1 className="text-2xl font-bold mb-6 text-gray-800 border-b pb-4">Обсуждение</h1>

      {/* Форма комментария */}
      {isAuthenticated && (
        <form onSubmit={handleSubmit} className="mb-8 bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <textarea
            value={commentBody}
            onChange={(e) => setCommentBody(e.target.value)}
            placeholder="Написать комментарий..."
            className="w-full border border-gray-300 rounded p-2 mb-3 focus:ring-2 focus:ring-blue-500 outline-none"
            rows={3}
            required
          />
          <button
            type="submit"
            disabled={commentMutation.isPending || !commentBody}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {commentMutation.isPending ? 'Отправка...' : 'Отправить'}
          </button>
        </form>
      )}

      {/* Список комментариев */}
      <div className="space-y-4">
        {comments.map((comment) => (
          <CommentItem key={comment.id} comment={comment} />
        ))}
      </div>

      {comments.length === 0 && !isLoading && (
        <div className="text-center py-10 text-gray-500">Комментариев пока нет.</div>
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
    </div>
  );
};