import { Link } from 'react-router-dom';
import { Topic } from '../types/community';

interface Props {
  topic: Topic;
}

export const TopicCard = ({ topic }: Props) => {
  return (
    <Link 
      to={`/topics/${topic.id}`} 
      className="block bg-white p-5 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
    >
      <div className="flex justify-between items-start mb-2">
        <h3 className="text-xl font-bold text-gray-800 hover:text-blue-600 line-clamp-2">
          {topic.title}
        </h3>
        <span className="text-xs text-gray-400 whitespace-nowrap ml-2">
          {new Date(topic.last_comment_at).toLocaleDateString()}
        </span>
      </div>
      
      {topic.anime_title && (
        <span className="inline-block bg-purple-100 text-purple-700 text-xs px-2 py-1 rounded mb-2">
          {topic.anime_title}
        </span>
      )}

      <div className="flex justify-between items-center text-sm text-gray-500 mt-3">
        <span>Автор: <span className="font-medium text-gray-700">{topic.author_username}</span></span>
        <span className="bg-gray-100 px-2 py-1 rounded text-xs">
          💬 {topic.comments_count} комм.
        </span>
      </div>
    </Link>
  );
};