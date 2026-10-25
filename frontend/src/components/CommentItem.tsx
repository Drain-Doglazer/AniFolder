import { Comment } from '../types/community';

interface Props {
  comment: Comment;
}

export const CommentItem = ({ comment }: Props) => {
  return (
    <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
      <div className="flex justify-between items-center mb-2">
        <span className="font-bold text-blue-600 text-sm">{comment.author_username}</span>
        <span className="text-xs text-gray-400">
          {new Date(comment.created_at).toLocaleString()}
        </span>
      </div>
      <p className="text-gray-700 text-sm whitespace-pre-line">{comment.body}</p>
    </div>
  );
};