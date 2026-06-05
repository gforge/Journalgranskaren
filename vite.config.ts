import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  base: '/Journalgranskaren/',
  plugins: [react()],
  resolve: {
    alias: {
      src: path.resolve(__dirname, './src'),
      components: path.resolve(__dirname, './src/components'),
      parser: path.resolve(__dirname, './src/parser'),
      types: path.resolve(__dirname, './src/types'),
    },
  },
});
