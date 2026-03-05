import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { nodePolyfills, type PolyfillOptions } from 'vite-plugin-node-polyfills'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env vars - supports both VITE_ and REACT_APP_ prefixes
  const env = loadEnv(mode, process.cwd(), ['VITE_', 'REACT_APP_'])
  
  // Build process.env object for REACT_APP_ vars (to maintain compatibility)
  // Note: Values are JSON.stringified because Vite's define does direct replacement
  const processEnv: Record<string, string> = {
    NODE_DEBUG: JSON.stringify('false'),
    platform: JSON.stringify('win32'),
    version: JSON.stringify('v16.0.0'),
  }
  
  // Map all REACT_APP_ and VITE_ vars to process.env for compatibility
  // Each value must be JSON.stringified for proper replacement
  Object.keys(env).forEach(key => {
    if (key.startsWith('REACT_APP_') || key.startsWith('VITE_')) {
      processEnv[key] = JSON.stringify(env[key] || '')
    }
  })
  
  return {
    plugins: [
      react(),
      nodePolyfills({
        include: ['buffer', 'process', 'util', 'stream'],
        globals: {
          Buffer: true,
          global: true,
          process: true
        }
      } as PolyfillOptions)
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      }
    },
    optimizeDeps: {
      exclude: [
        '@react-aria/interactions',
        '@react-aria/focus',
        '@msgpack/msgpack',
      ],
      // Pre-bundle deps that Vite fails to resolve (entry/main/exports)
      include: [
        'react',
        'react-dom',
        'react-router-dom',
        '@tanstack/react-query',
        'lucide-react',
        'axios',
        'zustand',
        'hls.js',
        '@react-three/fiber',
        '@react-three/drei',
      ],
    },
    define: Object.fromEntries(
      Object.entries(processEnv).map(([key, value]) => [
        `process.env.${key}`,
        value
      ])
    ),
    server: {
      port: 5173,
      host: true,
      open: true,
      proxy: {
        '/api': { target: 'http://localhost:3001', changeOrigin: true },
        '/uploads': { target: 'http://localhost:3001', changeOrigin: true },
      },
    }
  }
}) 