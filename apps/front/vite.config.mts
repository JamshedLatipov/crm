/// <reference types='vitest' />
import { defineConfig } from 'vite';
import angular from '@analogjs/vite-plugin-angular';
import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin';
import { nxCopyAssetsPlugin } from '@nx/vite/plugins/nx-copy-assets.plugin';

export default defineConfig(({ mode }) => {
  const isProduction = mode === 'production';
  
  return {
    root: __dirname,
    cacheDir: '../../node_modules/.vite/apps/front',
    
    plugins: [
      angular({
        tsconfig: 'tsconfig.app.json',
        jit: true,
      }),
      nxViteTsPaths(),
      nxCopyAssetsPlugin(['*.md']),
    ],
    
    css: {
      postcss: '../../postcss.config.js',
      devSourcemap: !isProduction,
    },
    
    build: {
      outDir: '../../dist/apps/front',
      emptyOutDir: true,
      reportCompressedSize: true,
      sourcemap: !isProduction,
      minify: isProduction ? 'esbuild' : false,
      target: 'ES2022',
      rollupOptions: {
        onwarn(warning, warn) {
          // Игнорируем TypeScript warnings при сборке
          if (warning.code === 'TS2532' || warning.code === 'TS2322' || warning.code === 'TS18048') {
            return;
          }
          warn(warning);
        },
        output: {
          manualChunks: {
            vendor: ['@angular/core', '@angular/common', '@angular/material'],
            rxjs: ['rxjs'],
          },
        },
      },
    },
    
    server: {
      port: 4200,
      host: 'localhost',
      strictPort: true,
      open: false,
      cors: true,
    },
    
    preview: {
      port: 4300,
      host: 'localhost',
    },
    
    optimizeDeps: {
      include: [
        '@angular/core',
        '@angular/common',
        '@angular/material',
        'rxjs',
        'rxjs/operators',
      ],
    },
    
    define: {
      'process.env.NODE_ENV': JSON.stringify(mode),
    },
    
    test: {
      watch: false,
      globals: true,
      environment: 'jsdom',
      include: ['{src,tests}/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
      exclude: [
        '**/node_modules/**',
        '**/dist/**',
        '**/e2e/**',
        '**/.{idea,git,cache,output,temp}/**',
      ],
      setupFiles: ['src/test-setup.ts'],
      reporters: ['default'],
      coverage: {
        reportsDirectory: '../../coverage/apps/front',
        provider: 'v8' as const,
        reporter: ['text', 'json', 'html'],
        exclude: [
          'node_modules/',
          'src/test-setup.ts',
          '**/*.spec.ts',
          '**/*.test.ts',
        ],
        thresholds: {
          global: {
            branches: 70,
            functions: 70,
            lines: 70,
            statements: 70,
          },
        },
      },
    },
  };
});
