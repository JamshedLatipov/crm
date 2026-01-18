/// <reference types='vitest' />
import { defineConfig } from 'vite';
import angular from '@analogjs/vite-plugin-angular';
import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin';
import { nxCopyAssetsPlugin } from '@nx/vite/plugins/nx-copy-assets.plugin';
import * as path from 'path';

export default defineConfig(() => ({
  root: __dirname,
  cacheDir: '../node_modules/.vite/libs',
  plugins: [angular(), nxViteTsPaths(), nxCopyAssetsPlugin(['*.md'])],
  
  // Library build configuration
  build: {
    outDir: './dist',
    emptyOutDir: true,
    lib: {
      entry: path.resolve(__dirname, 'src/index.ts'),
      name: 'StoUI',
      fileName: (format) => `sto-ui.${format}.js`,
      formats: ['es', 'cjs'],
    },
    rollupOptions: {
      external: [
        '@angular/core',
        '@angular/common',
        '@angular/common/http',
        '@angular/router',
        '@angular/platform-browser',
        '@angular/forms',
        'rxjs',
        'rxjs/operators',
        'socket.io-client',
      ],
      output: {
        globals: {
          '@angular/core': 'ng.core',
          '@angular/common': 'ng.common',
          '@angular/common/http': 'ng.common.http',
          '@angular/router': 'ng.router',
          '@angular/platform-browser': 'ng.platformBrowser',
          '@angular/forms': 'ng.forms',
          'rxjs': 'rxjs',
          'rxjs/operators': 'rxjs.operators',
          'socket.io-client': 'io',
        },
      },
    },
    sourcemap: true,
    minify: 'esbuild',
  },
  
  // Uncomment this if you are using workers.
  // worker: {
  //  plugins: [ nxViteTsPaths() ],
  // },
  
  test: {
    watch: false,
    globals: true,
    environment: 'jsdom',
    include: ['{src,tests}/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    setupFiles: ['src/test-setup.ts'],
    reporters: ['default'],
    coverage: {
      reportsDirectory: '../coverage/libs',
      provider: 'v8' as const,
    },
  },
})); 