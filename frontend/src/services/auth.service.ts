import api from './api';
import type { User, AuthTokens } from '../types';

interface LoginResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

interface RegisterResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export const authService = {
  async login(email: string, password: string): Promise<LoginResponse> {
    const response = await api.post('/auth/login', { email, password });
    return response.data;
  },

  async register(email: string, password: string, displayName?: string): Promise<RegisterResponse> {
    const response = await api.post('/auth/register', { email, password, displayName });
    return response.data;
  },

  async sendMagicLink(email: string): Promise<void> {
    await api.post('/auth/magic-link', { email });
  },

  async verifyMagicLink(token: string): Promise<LoginResponse> {
    const response = await api.get(`/auth/magic-link/verify?token=${token}`);
    return response.data;
  },

  async refreshTokens(refreshToken: string): Promise<AuthTokens> {
    const response = await api.post('/auth/refresh', { refreshToken });
    return response.data;
  },

  async logout(refreshToken: string): Promise<void> {
    await api.post('/auth/logout', { refreshToken });
  },

  async getCurrentUser(): Promise<{ user: User }> {
    const response = await api.get('/auth/me');
    return response.data;
  },
};
