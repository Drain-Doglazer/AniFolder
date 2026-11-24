import {apiClient} from './client';
import {ActivityItem, Recommendation, UserListAnime, UserProfile, Page} from '../types/anime';
import {CursorPaginatedResponse} from '../types/community';
import {useAuthStore} from '../store';

export type ListPatch = Partial<Pick<UserListAnime,'status'|'score'|'episodes_watched'>>;
export type ListUpdateRequest = ListPatch;
export const listKey = () => ['myList', useAuthStore.getState().user?.username];
const profileUrl = (name: string) => '/users/' + encodeURIComponent(name);
export const getProfile = (name: string) => apiClient.get<UserProfile>(profileUrl(name));
export const getActivity = (name: string, cursor?: string) => apiClient.get<CursorPaginatedResponse<ActivityItem>>(profileUrl(name) + '/activity', {params:{cursor}});
export const getCompatibility = (name: string) => apiClient.get<{common_titles:number; compatibility:number|null}>(profileUrl(name) + '/compatibility');
export const getUserList = (name: string,page = 1) => apiClient.get<Page<UserListAnime>>(profileUrl(name) + '/list',{params:{page,limit:50}});
export async function getMyList() {
  const name = useAuthStore.getState().user!.username;
  const items: UserListAnime[] = [];
  for (let page = 1; ; page++) {
    const {data} = await getUserList(name,page);
    items.push(...data.items);
    if (!data.items.length || page * data.limit >= data.total) return {data:items};
  }
}
export const updateListItem = (id:number, patch: ListPatch, status: UserListAnime['status']) =>
  apiClient.put('/me/list/' + id, {status, ...patch});
export const removeFromList = (id:number) => apiClient.delete('/me/list/' + id);
export const getMyRecommendations = () => apiClient.get<Recommendation[]>('/me/recommendations');
