import React          from 'react';
import ReactDOM       from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Provider }   from 'react-redux';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster }    from 'react-hot-toast';
import App            from './App';
import { store }      from './store';
import { AuthProvider } from './context/AuthContext';  // ← add this
import './styles/globals.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 5 * 60 * 1000 },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Provider store={store}>              {/* 1. Redux first */}
      <AuthProvider>                      {/* 2. Auth context (uses useDispatch) */}
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <App />
            <Toaster
              position="bottom-right"
              toastOptions={{
                style: {
                  background  : '#13131a',
                  color       : '#e8e8f0',
                  border      : '1px solid #2a2a3a',
                  borderRadius: '12px',
                  fontSize    : '14px',
                },
                success: {
                  iconTheme: { primary: '#10b981', secondary: '#13131a' },
                },
                error: {
                  iconTheme: { primary: '#ef4444', secondary: '#13131a' },
                },
              }}
            />
          </BrowserRouter>
        </QueryClientProvider>
      </AuthProvider>
    </Provider>
  </React.StrictMode>
);