import { configureStore } from '@reduxjs/toolkit';
import authReducer from './authSlice';
import repoReducer from './repoSlice';
import aiReducer   from './aiSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    repo: repoReducer,
    ai:   aiReducer,
  },
  middleware: getDefault => getDefault({ serializableCheck: false }),
});

export type RootState   = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;