import { DiscussionAuthor } from './Compatibility';
import { Comment, authorName } from '../types/community';

interface Props {
  comment: Comment;
  parent?: Comment;
  onReply?: (comment: Comment) => void;
}

export const CommentItem = ({ comment, parent, onReply }: Props) => (
  <article id={`comment-${comment.id}`} className="scroll-mt-24 p-4 rounded-lg border border-gray-800" style={{ backgroundColor: '#27222b' }}>
    <div className="flex justify-between items-center mb-2">
      <DiscussionAuthor name={comment.username} />
      <span className="text-xs text-gray-500">
        {new Date(comment.created_at).toLocaleString()}
      </span>
    </div>
    {comment.parent_id != null && (
      <div className="mb-3 border-l-2 border-purple-400 pl-3 text-sm text-gray-300">
        {parent ? (
          <a href={`#comment-${parent.id}`} className="block hover:underline">
            <strong>В ответ на комментарий · {authorName(parent.username)}</strong>
            <span className="block truncate">«{parent.body}»</span>
          </a>
        ) : (
          <span>В ответ на комментарий №{comment.parent_id}</span>
        )}
      </div>
    )}
    <p className="text-gray-300 text-sm whitespace-pre-line">{comment.body}</p>
    {onReply && (
      <button type="button" onClick={() => onReply(comment)} className="mt-3 text-sm text-purple-300 hover:underline">
        Ответить
      </button>
    )}
  </article>
);
