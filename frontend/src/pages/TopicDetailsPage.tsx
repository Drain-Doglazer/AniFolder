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

  if (isLoading) return <div className="text-center py-20 text-gray-400">Загрузка темы...</div>;

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6 text-white border-b pb-4" style={{ borderColor: '#374151' }}>Обсуждение</h1>

      {isAuthenticated && (
        <form onSubmit={handleSubmit} className="mb-8 p-4 rounded-lg shadow-sm border border-gray-800" style={{ backgroundColor: '#2a2a32' }}>
          <textarea
            value={commentBody}
            onChange={(e) => setCommentBody(e.target.value)}
            placeholder="Написать комментарий..."
            className="w-full border border-gray-700 rounded p-2 mb-3 outline-none text-white"
            style={{ backgroundColor: '#1e1e24' }}
            rows={3}
            required
          />
          <button
            type="submit"
            disabled={commentMutation.isPending || !commentBody}
            className="text-white px-4 py-2 rounded hover:opacity-90 disabled:opacity-50 font-medium"
            style={{ backgroundColor: '#d4845a' }}
          >
            {commentMutation.isPending ? 'Отправка...' : 'Отправить'}
          </button>
        </form>
      )}

      <div className="space-y-4">
        {comments.map((comment) => <CommentItem key={comment.id} comment={comment} />)}
      </div>

      {comments.length === 0 && !isLoading && (
        <div className="text-center py-10 text-gray-400">Комментариев пока нет.</div>
      )}

      {hasNextPage && (
        <div className="text-center mt-8">
          <button
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
            className="border border-gray-700 px-6 py-2 rounded-md shadow-sm hover:bg-gray-800 disabled:opacity-50 text-gray-300"
            style={{ backgroundColor: '#2a2a32' }}
          >
            {isFetchingNextPage ? 'Загрузка...' : 'Загрузить еще'}
          </button>
        </div>
      )}
    </div>
  );
};