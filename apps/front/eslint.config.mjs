import nx from '@nx/eslint-plugin';
import baseConfig from '../../eslint.config.mjs';

export default [
  ...baseConfig,
  ...nx.configs['flat/angular'],
  ...nx.configs['flat/angular-template'],
  {
    files: ['**/*.ts'],
    rules: {
      '@angular-eslint/directive-selector': [
        'error',
        {
          type: 'attribute',
          prefix: 'app',
          style: 'camelCase',
        },
      ],
      '@angular-eslint/component-selector': [
        'error',
        {
          type: 'element',
          prefix: 'app',
          style: 'kebab-case',
        },
      ],
      // Angular лучшие практики
      '@angular-eslint/no-empty-lifecycle-method': 'error',
      '@angular-eslint/use-lifecycle-interface': 'error',
      '@angular-eslint/prefer-on-push-component-change-detection': 'warn',
      '@angular-eslint/no-output-on-prefix': 'error',
      '@angular-eslint/no-input-rename': 'error',
      '@angular-eslint/no-output-rename': 'error',
      '@angular-eslint/use-pipe-transform-interface': 'error',
      
      // Standalone компоненты
      '@angular-eslint/sort-lifecycle-methods': 'warn',
      '@angular-eslint/no-conflicting-lifecycle': 'error',
      
      // TypeScript улучшения для Angular
      '@typescript-eslint/member-ordering': [
        'error',
        {
          default: [
            'signature',
            'public-static-field',
            'protected-static-field',
            'private-static-field',
            'public-decorated-field',
            'protected-decorated-field',
            'private-decorated-field',
            'public-instance-field',
            'protected-instance-field',
            'private-instance-field',
            'public-abstract-field',
            'protected-abstract-field',
            'public-field',
            'protected-field',
            'private-field',
            'static-field',
            'instance-field',
            'abstract-field',
            'field',
            'constructor',
            'public-static-method',
            'protected-static-method',
            'private-static-method',
            'public-decorated-method',
            'protected-decorated-method',
            'private-decorated-method',
            'public-instance-method',
            'protected-instance-method',
            'private-instance-method',
            'public-abstract-method',
            'protected-abstract-method',
            'public-method',
            'protected-method',
            'private-method',
            'static-method',
            'instance-method',
            'abstract-method',
            'method',
          ],
        },
      ],
    },
  },
  {
    files: ['**/*.html'],
    rules: {
      // Angular template лучшие практики
      '@angular-eslint/template/banana-in-box': 'error',
      '@angular-eslint/template/conditional-complexity': ['error', { maxComplexity: 3 }],
      '@angular-eslint/template/cyclomatic-complexity': ['error', { maxComplexity: 5 }],
      '@angular-eslint/template/no-negated-async': 'error',
      '@angular-eslint/template/use-track-by-function': 'warn',
      '@angular-eslint/template/no-duplicate-attributes': 'error',
      '@angular-eslint/template/no-distracting-elements': 'error',
      
      // Accessibility
      '@angular-eslint/template/accessibility-alt-text': 'error',
      '@angular-eslint/template/accessibility-elements-content': 'error',
      '@angular-eslint/template/accessibility-label-has-associated-control': 'error',
      '@angular-eslint/template/click-events-have-key-events': 'error',
      '@angular-eslint/template/mouse-events-have-key-events': 'error',
      '@angular-eslint/template/accessibility-role-has-required-aria': 'error',
      '@angular-eslint/template/accessibility-valid-aria': 'error',
    },
  },
];
