import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { getActivity, getProfile, getUserList } from '../api/profile';
import { useCursorFeed } from '../hooks/useCursorFeed';
import { ActivityItem, displayTitle } from '../types/anime';
import { Compatibility } from '../components/Compatibility';
import { collectionStatuses } from '../components/CollectionControl';

function eventText(event: ActivityItem) {
  switch (event.type) {
    case 'list_added': return 'Добавлено в список «' + collectionStatuses[event.payload.status] + '»';
    case 'status_changed': return collectionStatuses[event.payload.from] + ' → ' + collectionStatuses[event.payload.to];
    case 'progress_updated': return 'Просмотрено серий: ' + event.payload.episodes_watched;
    case 'scored': return event.payload.score === null ? 'Оценка снята' : 'Оценка: ' + event.payload.score;
    case 'reviewed': return 'Опубликован отзыв';
    case 'topic_created': return <Link to={'/topics/'+event.payload.topic_id}>Создана тема</Link>;
    case 'commented': return <Link to={'/topics/'+event.payload.topic_id}>Добавлен комментарий</Link>;
  }
}

export function PublicProfile() {
  const {username = ''} = useParams();
  return <Profile key={username} name={username}/>;
}
function Profile({name}:{name:string}) {
  const [page,setPage] = useState(1);
  const profile = useQuery({queryKey:['profile',name],queryFn:()=>getProfile(name)});
  const list = useQuery({queryKey:['publicList',name,page],queryFn:()=>getUserList(name,page)});
  const feed = useCursorFeed(['activity',name], cursor=>getActivity(name,cursor));
  if (profile.isError) return <p role="alert">Не удалось загрузить профиль</p>;
  const user = profile.data?.data;
  if (!user) return <p>Загрузка профиля…</p>;
  return <section className="space-y-5">
    <h1 className="text-3xl font-semibold">{user.username}</h1>
    {user.bio && <p>{user.bio}</p>}
    <p>Оценок: {user.stats.scores_count} · Средняя оценка: {user.stats.mean_score ?? '—'}</p>
    <Compatibility name={user.username} />
    <h2 className="text-xl">Список аниме</h2>
    {list.isError && <p role="alert">Не удалось загрузить список</p>}
    {list.data?.data.items.map(item=><p key={item.id}><Link to={'/anime/'+item.id}>{displayTitle(item)}</Link> · {collectionStatuses[item.status]} · Оценка: {item.score ?? '—'}</p>)}
    {page>1 && <button className="button-secondary" onClick={()=>setPage(page-1)}>Назад</button>}
    {list.data && page*list.data.data.limit<list.data.data.total && <button className="button-secondary" onClick={()=>setPage(page+1)}>Дальше</button>}
    <h2 className="text-xl">Активность</h2>
    {feed.isError && <p role="alert">Не удалось загрузить активность</p>}
    {feed.data?.pages.flatMap(p=>p.data.items).map(event=><p key={event.id}>{eventText(event)} {event.anime && <Link to={'/anime/'+event.anime.id}>{displayTitle(event.anime)}</Link>} · {new Date(event.created_at).toLocaleString()}</p>)}
    {feed.hasNextPage && <button className="button-secondary" disabled={feed.isFetchingNextPage} onClick={()=>feed.fetchNextPage()}>Загрузить ещё</button>}
  </section>;
}
