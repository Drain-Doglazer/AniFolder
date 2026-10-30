import { Comment } from '../types/community';

interface Props {
  comment: Comment;
}

export const CommentItem = ({ comment }: Props) => (
  <div className="p-4 rounded-lg border border-gray-800" style={{ backgroundColor: '#27222b' }}>
    <div className="flex justify-between items-center mb-2">
      <span className="font-bold text-sm" style={{ color: '#a884b5' }}>{comment.author_username}</span>
      <span className="text-xs text-gray-500">
        {new Date(comment.created_at).toLocaleString()}
      </span>
    </div>
    <p className="text-gray-300 text-sm whitespace-pre-line">{comment.body}</p>
  </div>
);
