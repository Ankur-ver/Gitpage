import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { AIState, AIAnalysis } from '../types';
import aiService from '../services/aiService';

const initialState: AIState = {
  analyses: [],
  chatHistory: [],
  loading: false,
  error: null,
};

export const analyzeCode = createAsyncThunk(
  'ai/analyzeCode',
  async ({ code, language }: { code: string; language: string }, { rejectWithValue }) => {
    try { return await aiService.analyzeCode(code, language); }
    catch (e: any) { return rejectWithValue(e.response?.data?.message || 'AI analysis failed'); }
  }
);

export const sendChat = createAsyncThunk(
  'ai/sendChat',
  async (message: string, { rejectWithValue, getState }) => {
    try {
      const state = getState() as any;
      const history = state.ai.chatHistory;
      return await aiService.chat(message, history);
    } catch (e: any) {
      return rejectWithValue(e.response?.data?.message || 'Chat failed');
    }
  }
);

const aiSlice = createSlice({
  name: 'ai',
  initialState,
  reducers: {
    addUserMessage(state, action: PayloadAction<string>) {
      state.chatHistory.push({ role: 'user', content: action.payload });
    },
    clearChat(state) { state.chatHistory = []; },
    clearAnalyses(state) { state.analyses = []; },
    clearError(state) { state.error = null; },
  },
  extraReducers: builder => {
    builder
      .addCase(analyzeCode.pending,   state => { state.loading = true; })
      .addCase(analyzeCode.fulfilled, (state, { payload }) => {
        state.loading = false;
        state.analyses = payload;
      })
      .addCase(analyzeCode.rejected, (state, { payload }) => {
        state.loading = false;
        state.error = payload as string;
      })
      .addCase(sendChat.pending,   state => { state.loading = true; })
      .addCase(sendChat.fulfilled, (state, { payload }) => {
        state.loading = false;
        state.chatHistory.push({ role: 'assistant', content: payload.reply });
      })
      .addCase(sendChat.rejected, (state, { payload }) => {
        state.loading = false;
        state.error = payload as string;
      });
  },
});

export const { addUserMessage, clearChat, clearAnalyses, clearError } = aiSlice.actions;
export default aiSlice.reducer;