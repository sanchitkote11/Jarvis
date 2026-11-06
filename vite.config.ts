import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig(() => {
  const isHmrDisabled = process.env.DISABLE_HMR === 'true';
  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
      allowedHosts: true as any,
      hmr: isHmrDisabled ? false : true,
      watch: isHmrDisabled ? null : {},
    },
    preview: {
      allowedHosts: true as any,
    },
    build: {
      target: 'esnext',
    },
    esbuild: {
      tsconfigRaw: {
        compilerOptions: {
          experimentalDecorators: true,
          useDefineForClassFields: false,
        },
      },
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
  };
});
