import { apiClient } from './client';

const USE_MOCK = true;

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  user: {
    id: number;
    username: string;
    email: string;
  };
}

export const loginApi = async (data: LoginRequest): Promise<{ data: AuthResponse }> => {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 400));
    return {
      data: {
        access_token: 'mock-access-token-123',
        refresh_token: 'mock-refresh-token-456',
        user: { id: 1, username: data.username, email: `${data.username}@mock.com` },
      },
    };
  }
  return apiClient.post<AuthResponse>('/auth/login', data);
};

export const registerApi = async (data: RegisterRequest): Promise<{ data: AuthResponse }> => {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 400));
    return {
      data: {
        access_token: 'mock-access-token-123',
        refresh_token: 'mock-refresh-token-456',
        user: { id: 1, username: data.username, email: data.email },
      },
    };
  }
  return apiClient.post<AuthResponse>('/auth/register', data);
};