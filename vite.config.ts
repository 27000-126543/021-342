import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import electron from 'vite-plugin-electron'
import renderer from 'vite-plugin-electron-renderer'

const useElectron = process.env.USE_ELECTRON === 'true'

export default defineConfig({
  plugins: useElectron
    ? [
        react(),
        electron([
          {
            entry: 'electron/main.ts',
            onstart(options) {
              options.startup()
            },
            vite: {
              build: {
                outDir: 'dist-electron',
              },
            },
          },
          {
            entry: 'electron/preload.ts',
            onstart(options) {
              options.reload()
            },
            vite: {
              build: {
                outDir: 'dist-electron',
              },
            },
          },
        ]),
        renderer(),
      ]
    : [react()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
})
