import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages base: /new-tense_identifier_app/
// GoDaddy base:      /new_tense_identifier/
const base = process.env.DEPLOY_TARGET === 'godaddy'
  ? '/new_tense_identifier/'
  : '/new-tense_identifier_app/';

export default defineConfig({
  plugins: [react()],
  base,
});
