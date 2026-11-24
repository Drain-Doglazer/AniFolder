import {useCursorFeed} from '../hooks/useCursorFeed';
import { useParams } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { getTopicComments, createComment } from '../api/community';
import { authorName, type Comment } from '../types/community';
import { CommentItem } from '../components/CommentItem';
import { useAuthStore } from '../store';

export const TopicDetailsPage = () => {
  const { id } = useParams<{ id: string }>();
  const topicId = Number(id);
  const { isAuthenticated } = useAuthStore();
  const queryClient = useQueryClient();
  const [commentBody, setCommentBody] = useState('');

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useCursorFeed(['comments', topicId], cursor => getTopicComments(topicId, cursor));

  const [parent, setParent] = useState<Comment | null>(null);
  const replyTo = parent?.topic_id === topicId ? parent : null;
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const comments = data?.pages.flatMap((page) => page.data.items) || [];

  const commentsById = new Map(comments.map(comment => [comment.id, comment] as const));
  function startReply(comment: Comment) {
    setParent(comment);
    inputRef.current?.focus();
  }

  const commentMutation = useMutation({
    mutationFn: (body: string) => createComment(topicId, { body, parent_id: replyTo?.id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', topicId] });
      setParent(null);
      queryClient.invalidateQueries({queryKey:['topics']});
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
      <h1 className="text-2xl font-bold mb-6 text-white border-b pb-4" style={{ borderColor: '#3d3442' }}>Обсуждение</h1>

      {isAuthenticated && (
        <form onSubmit={handleSubmit} className="mb-8 p-4 rounded-lg shadow-sm border border-gray-800" style={{ backgroundColor: '#27222b' }}>
          {replyTo && (
            <div className="mb-3 border-l-2 border-purple-400 pl-3 text-sm">
              <strong>Ответ на комментарий · {authorName(replyTo.username)}</strong>
              <p className="truncate">{replyTo.body}</p>
              <button type="button" className="underline" onClick={() => setParent(null)}>Отменить ответ</button>
            </div>
          )}
          <textarea
            ref={inputRef}
            value={commentBody}
            onChange={(e) => setCommentBody(e.target.value)}
            aria-label={replyTo ? "Текст ответа" : "Текст комментария"}
            placeholder={replyTo ? "Написать ответ..." : "Написать комментарий..."}
            className="w-full border border-gray-700 rounded p-2 mb-3 outline-none text-white"
            style={{ backgroundColor: '#1c191f' }}
            rows={3}
            required
          />
          <button
            type="submit"
            disabled={commentMutation.isPending || !commentBody}
            className="text-white px-4 py-2 rounded hover:opacity-90 disabled:opacity-50 font-medium"
            style={{ backgroundColor: '#a884b5', color: '#211926' }}
          >
            {commentMutation.isPending ? 'Отправка...' : 'Отправить'}
          </button>
        </form>
      )}

      <div className="space-y-4">
        {comments.map(comment => (
          <CommentItem
            key={comment.id}
            comment={comment}
            parent={comment.parent_id == null ? undefined : commentsById.get(comment.parent_id)}
            onReply={isAuthenticated ? startReply : undefined}
          />
        ))}
      </div>

      {commentMutation.isError && <p role="alert">Не удалось отправить комментарий</p>}
      {comments.length === 0 && !isLoading && (
        <div className="text-center py-10 text-gray-400">Комментариев пока нет.</div>
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
    </div>
  );
};
