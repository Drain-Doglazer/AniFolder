import { apiClient } from './client';
import { Topic, Comment, CursorPaginatedResponse, CreateTopicRequest, CreateCommentRequest } from '../types/community';

import {Page} from '../types/anime';
export const getTopics = (page=1) => apiClient.get<Page<Topic>>('/topics',{params:{page}});
export const createTopic = (data:CreateTopicRequest) => apiClient.post<Topic>('/topics',data);
export const getTopicComments = (id:number,cursor?:string) => apiClient.get<CursorPaginatedResponse<Comment>>('/topics/'+id+'/comments',{params:{cursor}});
export const createComment = (id:number,data:CreateCommentRequest) => apiClient.post<Comment>('/topics/'+id+'/comments',data);
