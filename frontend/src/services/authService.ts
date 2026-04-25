import api from './api';

const authService = {
  async login(email: string, password: string) {
    const { data } = await api.post('/auth/login', { email, password });
    return data;
  },
  async register(username: string, email: string, password: string) {
    const { data } = await api.post('/auth/register', { username, email, password });
    return data;
  },
  async logout() {
    await api.post('/auth/logout');
  },
  async getMe() {
    const { data } = await api.get('/auth/me');
    return data;
  },
  async refreshToken() {
    const { data } = await api.post('/auth/refresh');
    return data;
  },
};

export default authService;