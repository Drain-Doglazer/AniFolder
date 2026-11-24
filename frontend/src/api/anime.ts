import { Page } from '../types/anime';
import { apiClient } from './client';

import { AnimeDetail } from '../types/anime';



export interface Review {
  id: number;
  user_id: number | null;
  username: string | null;
  score: number;
  text: string;
  created_at: string;
}

export interface ReviewCreateRequest {
  score: number;
  text: string;
}

export const getAnimeDetails = (id: number): Promise<{ data: AnimeDetail }> =>
  apiClient.get<AnimeDetail>(`/anime/${id}`);

export const getAnimeReviews = (id:number,page=1) => apiClient.get<Page<Review>>('/anime/'+id+'/reviews',{params:{page}});
export const createReview = (id:number,data:ReviewCreateRequest) => apiClient.post<Review>('/anime/'+id+'/reviews',data);
export const patchReview = (id:number,data:Partial<ReviewCreateRequest>) => apiClient.patch<Review>('/reviews/'+id,data);
export const deleteReview = (id:number) => apiClient.delete('/reviews/'+id);
