import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { RepoState, Repository } from '../types';
import { repositoryService } from '../services/repoService';

const initialState: RepoState = {
  repositories : [],
  currentRepo  : null,
  branches     : [],
  currentBranch: '',
  files        : [],
  commits      : [],
  stats        : null,
  loading      : false,
  error        : null,
};

export const fetchUserRepos = createAsyncThunk(
  'repo/fetchUserRepos',
  async (username: string, { rejectWithValue }) => {
    try { return await repositoryService.getUserRepositories(username); }
    catch (e: any) { return rejectWithValue(e.response?.data?.message || 'Failed to fetch repos'); }
  }
);

export const fetchRepo = createAsyncThunk(
  'repo/fetchRepo',
  async ({ owner, repo }: { owner: string; repo: string }, { rejectWithValue }) => {
    try { return await repositoryService.getRepository(owner, repo); }
    catch (e: any) { return rejectWithValue(e.response?.data?.message || 'Failed to fetch repo'); }
  }
);

const repoSlice = createSlice({
  name: 'repo',
  initialState,
  reducers: {
    setCurrentRepo(state, action: PayloadAction<Repository | null>) {
      state.currentRepo = action.payload;
    },
    clearError(state) { state.error = null; },
  },
  extraReducers: builder => {
    builder
      .addCase(fetchUserRepos.pending,   state => { state.loading = true; })
      .addCase(fetchUserRepos.fulfilled, (state, { payload }) => {
        state.loading = false;
        state.repositories = payload.repositories;
      })
      .addCase(fetchUserRepos.rejected, (state, { payload }) => {
        state.loading = false;
        state.error = payload as string;
      })
      .addCase(fetchRepo.pending,   state => { state.loading = true; })
      .addCase(fetchRepo.fulfilled, (state, { payload }) => {
        state.loading = false;
        state.currentRepo = payload;
      })
      .addCase(fetchRepo.rejected, (state, { payload }) => {
        state.loading = false;
        state.error = payload as string;
      });
  },
});

export const { setCurrentRepo, clearError } = repoSlice.actions;
export default repoSlice.reducer;