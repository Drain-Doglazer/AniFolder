import { Link } from 'react-router-dom';
import { DiscussionAuthor } from './Compatibility';
import { Topic } from '../types/community';

interface Props {
  topic: Topic;
}

export const TopicCard = ({ topic }: Props) => (
  <article
    className="relative block p-5 rounded-lg shadow-sm border border-gray-800 hover:shadow-md transition-shadow"
    style={{ backgroundColor: '#27222b' }}
  >
    <div className="flex justify-between items-start mb-2">
      <h3 className="text-xl font-bold text-white hover:underline line-clamp-2" style={{ color: '#f1ebf2' }}>
        <Link to={`/topics/${topic.id}`} className="after:absolute after:inset-0">{topic.title}</Link>
      </h3>
      <span className="text-xs text-gray-500 whitespace-nowrap ml-2">
        {new Date(topic.last_comment_at).toLocaleDateString()}
      </span>
    </div>
    
    <p className="line-clamp-3">{topic.body}</p>

    <div className="flex justify-between items-center text-sm text-gray-400 mt-3">
      <div className="relative z-10"><DiscussionAuthor name={topic.username} /></div>
      <span className="px-2 py-1 rounded text-xs" style={{ backgroundColor: '#1c191f' }}>
        💬 {topic.comments_count} комм.
      </span>
    </div>
  </article>
);
