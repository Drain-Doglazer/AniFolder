import { useId, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { getCompatibility } from '../api/profile';
import { useAuthStore } from '../store';
import { authorName } from '../types/community';

export function Compatibility({ name }: { name: string }) {
  const viewer = useAuthStore(state => state.user?.username);
  const match = useQuery({
    queryKey: ['compatibility', viewer, name],
    queryFn: () => getCompatibility(name),
    enabled: Boolean(viewer && viewer !== name),
    staleTime: 30_000,
  });
  if (!viewer || viewer === name) return null;
  const result = match.data?.data;
  return (
    <section className="rounded-lg border border-gray-700 bg-[#27222b] p-4 text-sm text-gray-200">
      <h2 className="mb-2 text-lg font-semibold">Совместимость с {name}</h2>
      {result ? (
        <>
          <p>Общих оценённых тайтлов: {result.common_titles}</p>
          {result.compatibility !== null ? (
            <p className="mt-1 font-semibold">Совпадение вкусов: {Math.round((result.compatibility + 1) * 50)}%</p>
          ) : (
            <p className="mt-1">{result.common_titles < 5
              ? 'Для расчёта нужно хотя бы 5 тайтлов, которым вы оба поставили оценки.'
              : 'Рассчитать совпадение пока нельзя: у одного из вас все оценки общих тайтлов одинаковые.'}</p>
          )}
        </>
      ) : match.isError ? (
        <p role="alert">Не удалось загрузить совместимость. <button type="button" className="underline" onClick={() => match.refetch()}>Повторить</button></p>
      ) : <p role="status">Загрузка совместимости…</p>}
    </section>
  );
}

export function DiscussionAuthor({ name }: { name: string | null }) {
  const viewer = useAuthStore(state => state.user?.username);
  const [expanded, setExpanded] = useState(false);
  const panelId = useId();
  if (!name || name === 'deleted_user') return <span>{authorName(name)}</span>;
  return (
    <div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <Link className="font-semibold text-purple-300 underline" to={'/users/' + encodeURIComponent(name)}>{name}</Link>
        {viewer && viewer !== name && (
          <button type="button" className="text-sm underline" aria-expanded={expanded} aria-controls={panelId} onClick={() => setExpanded(!expanded)}>
            {expanded ? 'Скрыть совместимость' : 'Совместимость'}
          </button>
        )}
      </div>
      <div id={panelId}>{expanded && viewer && viewer !== name && <Compatibility name={name} />}</div>
    </div>
  );
}
