import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Front-end do CRM Hygia.
// O build sai em `dist-web/` para nao colidir com `dist/`, que e a saida do tsc (backend).
export default defineConfig({
  plugins: [react()],
  server: { port: 5173 },
  build: { outDir: 'dist-web' },
});
