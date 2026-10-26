import { Link } from 'react-router-dom';
import { Anime } from '../types/anime';

interface Props {
  anime: Anime;
}

export const AnimeCard = ({ anime }: Props) => {
  return (
    <Link
      to={`/anime/${anime.id}`}
      className="block rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-shadow group"
      style={{ backgroundColor: '#2a2a32' }}
    >
      <div className="relative h-64 bg-gray-900 overflow-hidden">
        <img
          src={anime.poster_url || 'https://via.placeholder.com/300x450?text=No+Poster'}
          alt={anime.title_ru}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        <span 
          style={{ backgroundColor: '#d4845a' }}
          className="absolute top-2 right-2 text-white text-xs px-2 py-1 rounded shadow font-medium"
        >
          {anime.kind.toUpperCase()}
        </span>
      </div>
      <div className="p-4">
        <h3 className="font-bold text-lg truncate text-white">{anime.title_ru}</h3>
        <p className="text-sm text-gray-400">
          {new Date(anime.aired_on).getFullYear()} • {anime.episodes} эп.
        </p>
        <p className="text-xs text-gray-500 mt-2 line-clamp-2 h-8">{anime.description}</p>
      </div>
    </Link>
  );
};