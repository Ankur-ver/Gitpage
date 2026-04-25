/// <reference types="vitest" />
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    // ── Plugins ────────────────────────────────────────────────────
    plugins: [
      react({
        fastRefresh: true,
      }),
    ],

    // ── Path Aliases ───────────────────────────────────────────────
    resolve: {
      alias: {
        '@':           path.resolve(__dirname, './src'),
        '@components': path.resolve(__dirname, './src/components'),
        '@pages':      path.resolve(__dirname, './src/pages'),
        '@hooks':      path.resolve(__dirname, './src/hooks'),
        '@store':      path.resolve(__dirname, './src/store'),
        '@services':   path.resolve(__dirname, './src/services'),
        '@utils':      path.resolve(__dirname, './src/utils'),
        '@types':      path.resolve(__dirname, './src/types'),
        '@styles':     path.resolve(__dirname, './src/styles'),
        '@assets':     path.resolve(__dirname, './src/assets'),
      },
    },

    // ── Dev Server ─────────────────────────────────────────────────
    server: {
      port:       3000,
      strictPort: true,
      open:       true,
      cors:       true,
      proxy: {
        '/api': {
          target:       env.VITE_API_URL || 'http://localhost:5000',
          changeOrigin: true,
          secure:       false,
          // rewrite is a no-op here since /api stays /api — removed
        },
        '/socket.io': {
          target:       env.VITE_SOCKET_URL || 'http://localhost:5000',
          ws:           true,
          changeOrigin: true,
        },
      },
    },

    // ── Production Build ───────────────────────────────────────────
    build: {
      outDir:                'dist',
      sourcemap:             mode === 'development',
      minify:                'esbuild',
      chunkSizeWarningLimit: 1500,
      rollupOptions: {
        output: {
          manualChunks(id) {
            // React core
            if (id.includes('node_modules/react/') ||
                id.includes('node_modules/react-dom/') ||
                id.includes('node_modules/react-router-dom/')) {
              return 'react-vendor';
            }
            // UI / animation
            if (id.includes('node_modules/framer-motion/') ||
                id.includes('node_modules/@headlessui/') ||
                id.includes('node_modules/@heroicons/')) {
              return 'ui-vendor';
            }
            // Monaco editor
            if (id.includes('node_modules/@monaco-editor/') ||
                id.includes('node_modules/monaco-editor/')) {
              return 'editor-vendor';
            }
            // State management
            if (id.includes('node_modules/@reduxjs/') ||
                id.includes('node_modules/react-redux/') ||
                id.includes('node_modules/@tanstack/')) {
              return 'state-vendor';
            }
            // Charts
            if (id.includes('node_modules/recharts/')) {
              return 'chart-vendor';
            }
            // Socket
            if (id.includes('node_modules/socket.io-client/') ||
                id.includes('node_modules/engine.io-client/')) {
              return 'socket-vendor';
            }
            // General utils
            if (id.includes('node_modules/axios/') ||
                id.includes('node_modules/date-fns/') ||
                id.includes('node_modules/dayjs/') ||
                id.includes('node_modules/zod/')) {
              return 'utils-vendor';
            }
          },
        },
      },
    },

    // ── Dependency Pre-bundling ────────────────────────────────────
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'react-router-dom',
        'framer-motion',
        '@heroicons/react/24/outline',
        '@heroicons/react/24/solid',
        'axios',
        'date-fns',
        'react-hot-toast',
        'socket.io-client',
        '@reduxjs/toolkit',
        'react-redux',
        'zod',
        'clsx',
      ],
      exclude: [
        '@monaco-editor/react',
        'monaco-editor',
      ],
    },

    // ── Preview Server ─────────────────────────────────────────────
    preview: {
      port:       3000,
      strictPort: true,
    },

    // ── Global Constants ───────────────────────────────────────────
    define: {
      // Must be stringified for vite define
      __APP_VERSION__: JSON.stringify(process.env.npm_package_version ?? '1.0.0'),
      // Boolean values must NOT be JSON.stringify'd — vite replaces them as-is
      __DEV__: mode === 'development',
    },

    // ── Vitest Config ──────────────────────────────────────────────
    test: {
      globals:     true,
      environment: 'jsdom',
      // Must be an array
      setupFiles:  ['./src/test/setup.ts'],
      css:         true,
      coverage: {
        provider: 'v8',
        reporter: ['text', 'json', 'html'],
        exclude: [
          'node_modules/',
          'src/test/',
          '**/*.d.ts',
          '**/*.config.*',
          'src/main.tsx',
        ],
      },
    },
  };
});