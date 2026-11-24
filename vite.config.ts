import { defineConfig } from 'vite';

// BASE_PATH permite publicar em subpasta (ex.: GitHub Pages → /formulario-patricia/).
export default defineConfig({
  base: process.env.BASE_PATH ?? '/',
});
