import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Front-end do CRM Hygia.
// O build sai em `dist-web/` para nao colidir com `dist/`, que e a saida do tsc (backend).
export default defineConfig({
  // O plugin do Tailwind v4 substitui a dupla postcss.config + tailwind.config.
  plugins: [react(), tailwindcss()],
  server: { port: 5173 },
  build: { outDir: 'dist-web' },
});
