import { defineConfig } from 'vite'
import { devtools } from '@tanstack/devtools-vite'
import contentCollections from '@content-collections/vite'
import tsconfigPaths from 'vite-tsconfig-paths'

import { tanstackStart } from '@tanstack/react-start/plugin/vite'

import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { nitro } from 'nitro/vite'
const config = defineConfig({
  server: {
    host: true,
    port: 3000,
  },
  plugins: [
    devtools({ eventBusConfig: { enabled: false } }),
    nitro({ rollupConfig: { external: [/^@sentry\//] } }),
    contentCollections(),
    tsconfigPaths({ projects: ['./tsconfig.json'] }),
    tailwindcss(),
    tanstackStart({
      router: {
        routeFileIgnorePattern: "\\.test\\.(ts|tsx)$",
      },
    }),
    viteReact(),
  ],
})

export default config
