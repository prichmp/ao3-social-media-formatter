import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// On GitHub Pages this is served from a subpath
// (https://<you>.github.io/ao3-social-media-formatter/), so the production
// build needs a matching base. The dev server stays at '/'.
// If your repo name differs, update the base below to '/<repo-name>/'.
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/ao3-social-media-formatter/' : '/',
  plugins: [react()],
}))
