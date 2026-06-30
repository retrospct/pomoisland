import { resolve } from 'node:path'
import { defineConfig } from 'electron-vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  main: {
    build: {
      outDir: 'out/main',
      lib: { entry: resolve(__dirname, 'electron/main.ts') },
      rollupOptions: {
        output: { entryFileNames: '[name].js' },
      },
    },
  },
  preload: {
    build: {
      outDir: 'out/preload',
      lib: { entry: resolve(__dirname, 'electron/preload.ts') },
      rollupOptions: {
        output: { entryFileNames: '[name].js' },
      },
    },
  },
  renderer: {
    root: '.',
    plugins: [react()],
    resolve: {
      alias: {
        '@shared': resolve(__dirname, 'src/shared'),
      },
    },
    build: {
      outDir: 'out/renderer',
      rollupOptions: {
        input: {
          island: resolve(__dirname, 'index.html'),
          settings: resolve(__dirname, 'settings.html'),
          'snap-overlay': resolve(__dirname, 'snap-overlay.html'),
        },
      },
    },
  },
})
