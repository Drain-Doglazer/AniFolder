import { Link } from 'react-router-dom';
import { Topic } from '../types/community';

interface Props {
  topic: Topic;
}

export const TopicCard = ({ topic }: Props) => (
  <Link 
    to={`/topics/${topic.id}`} 
    className="block p-5 rounded-lg shadow-sm border border-gray-800 hover:shadow-md transition-shadow"
    style={{ backgroundColor: '#27222b' }}
  >
    <div className="flex justify-between items-start mb-2">
      <h3 className="text-xl font-bold text-white hover:underline line-clamp-2" style={{ color: '#f1ebf2' }}>
        {topic.title}
      </h3>
      <span className="text-xs text-gray-500 whitespace-nowrap ml-2">
        {new Date(topic.last_comment_at).toLocaleDateString()}
      </span>
    </div>
    
    {topic.anime_title && (
      <span className="inline-block text-xs px-2 py-1 rounded mb-2 font-medium" style={{ backgroundColor: '#947a9e30', color: '#947a9e' }}>
        {topic.anime_title}
      </span>
    )}

    <div className="flex justify-between items-center text-sm text-gray-400 mt-3">
      <span>Автор: <span className="font-medium text-gray-200">{topic.author_username}</span></span>
      <span className="px-2 py-1 rounded text-xs" style={{ backgroundColor: '#1c191f' }}>
        💬 {topic.comments_count} комм.
      </span>
    </div>
  </Link>
);
