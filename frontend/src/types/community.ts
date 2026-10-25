export interface Topic {
  id: number;
  author_id: number;
  author_username: string;
  anime_id: number | null;
  anime_title: string | null;
  title: string;
  body: string;
  comments_count: number;
  created_at: string;
  last_comment_at: string;
}

export interface Comment {
  id: number;
  topic_id: number;
  author_id: number;
  author_username: string;
  parent_id: number | null;
  body: string;
  created_at: string;
}

// Формат ответа для курсорной пагинации
export interface CursorPaginatedResponse<T> {
  items: T[];
  next_cursor: string | null;
}

export interface CreateTopicRequest {
  title: string;
  body: string;
  anime_id?: number; // Опционально, если тема привязана к тайтлу
}

export interface CreateCommentRequest {
  body: string;
  parent_id?: number; // Для ответов на комментарии
}