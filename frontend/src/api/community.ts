import { apiClient } from './client';
import { Topic, Comment, CursorPaginatedResponse, CreateTopicRequest, CreateCommentRequest } from '../types/community';

const USE_MOCK = true;

export const getTopics = async (cursor?: string, limit: number = 20, anime_id?: number): Promise<{ data: CursorPaginatedResponse<Topic> }> => {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 300));
    return {
      data: {
        items: Array.from({ length: 5 }).map((_, i) => ({
          id: i + 1,
          author_id: 1,
          author_username: 'MockUser',
          anime_id: null,
          anime_title: null,
          title: `Тема обсуждения #${i + 1}`,
          body: 'Текст мок-темы сообщества.',
          comments_count: Math.floor(Math.random() * 50),
          created_at: new Date().toISOString(),
          last_comment_at: new Date().toISOString(),
        })),
        next_cursor: null,
      },
    };
  }
  return apiClient.get<CursorPaginatedResponse<Topic>>('/topics', { params: { cursor, limit, anime_id } });
};

export const createTopic = async (data: CreateTopicRequest): Promise<{ data: Topic }> => {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 400));
    return {
      data: { id: Date.now(), author_id: 1, author_username: 'Me', anime_id: null, anime_title: null, title: data.title, body: data.body, comments_count: 0, created_at: new Date().toISOString(), last_comment_at: new Date().toISOString() },
    };
  }
  return apiClient.post<Topic>('/topics', data);
};

export const getTopicComments = async (topicId: number, cursor?: string, limit: number = 20): Promise<{ data: CursorPaginatedResponse<Comment> }> => {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 200));
    return {
      data: {
        items: [
          { id: 1, topic_id: topicId, author_id: 2, author_username: 'Commenter', parent_id: null, body: 'Отличная тема!', created_at: new Date().toISOString() },
          { id: 2, topic_id: topicId, author_id: 3, author_username: 'AnotherUser', parent_id: 1, body: 'Согласен с предыдущим оратором.', created_at: new Date().toISOString() },
        ],
        next_cursor: null,
      },
    };
  }
  return apiClient.get<CursorPaginatedResponse<Comment>>(`/topics/${topicId}/comments`, { params: { cursor, limit } });
};

export const createComment = async (topicId: number, data: CreateCommentRequest): Promise<{ data: Comment }> => {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 300));
    return {
      data: { id: Date.now(), topic_id: topicId, author_id: 1, author_username: 'Me', parent_id: null, body: data.body, created_at: new Date().toISOString() },
    };
  }
  return apiClient.post<Comment>(`/topics/${topicId}/comments`, data);
};