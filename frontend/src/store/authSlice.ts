import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { AuthState, User } from '../types';
import authService from '../services/authService';

const initialState: AuthState = {
  isAuthenticated: !!localStorage.getItem('token'),
  user: JSON.parse(localStorage.getItem('user') || 'null'),
  token: localStorage.getItem('token'),
  loading: false,
  error: null,
};

export const login = createAsyncThunk(
  'auth/login',
  async (creds: { email: string; password: string }, { rejectWithValue }) => {
    try {
      const data = await authService.login(creds.email, creds.password);
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      return data;
    } catch (e: any) {
      return rejectWithValue(e.response?.data?.message || 'Login failed');
    }
  }
);

export const register = createAsyncThunk(
  'auth/register',
  async (payload: { username: string; email: string; password: string }, { rejectWithValue }) => {
    try {
      const data = await authService.register(payload.username, payload.email, payload.password);
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      return data;
    } catch (e: any) {
      return rejectWithValue(e.response?.data?.message || 'Registration failed');
    }
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logout(state) {
      state.isAuthenticated = false;
      state.user  = null;
      state.token = null;
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    },

    // ✅ Add this — used by AuthContext after OAuth / token login
    setUser(state, action: PayloadAction<{ user: User; token: string }>) {
      state.isAuthenticated = true;
      state.user            = action.payload.user;
      state.token           = action.payload.token;
      localStorage.setItem('token', action.payload.token);
      localStorage.setItem('user',  JSON.stringify(action.payload.user));
    },

    updateUser(state, action: PayloadAction<Partial<User>>) {
      if (state.user) state.user = { ...state.user, ...action.payload };
    },

    clearError(state) { state.error = null; },
  },
  extraReducers: builder => {
    builder
      .addCase(login.pending,   state => { state.loading = true;  state.error = null; })
      .addCase(login.fulfilled, (state, { payload }) => {
        state.loading         = false;
        state.isAuthenticated = true;
        state.user            = payload.user;
        state.token           = payload.token;
      })
      .addCase(login.rejected,  (state, { payload }) => {
        state.loading = false;
        state.error   = payload as string;
      })
      .addCase(register.pending,   state => { state.loading = true;  state.error = null; })
      .addCase(register.fulfilled, (state, { payload }) => {
        state.loading         = false;
        state.isAuthenticated = true;
        state.user            = payload.user;
        state.token           = payload.token;
      })
      .addCase(register.rejected,  (state, { payload }) => {
        state.loading = false;
        state.error   = payload as string;
      });
  },
});

export const { logout, setUser, updateUser, clearError } = authSlice.actions;
export default authSlice.reducer;