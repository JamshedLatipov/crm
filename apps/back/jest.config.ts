export default {
  displayName: 'back',
  preset: '../../jest.preset.js',
  testEnvironment: 'node',
  
  transform: {
    '^.+\\.[tj]s$': ['ts-jest', { 
      tsconfig: '<rootDir>/tsconfig.spec.json',
      isolatedModules: true,
    }],
  },
  
  moduleFileExtensions: ['ts', 'js', 'html'],
  
  collectCoverageFrom: [
    'src/**/*.{ts,js}',
    '!src/**/*.spec.ts',
    '!src/**/*.test.ts',
    '!src/main.ts',
    '!src/**/*.interface.ts',
    '!src/**/*.dto.ts',
    '!src/**/*.entity.ts',
    '!src/**/*.enum.ts',
    '!src/**/*.config.ts',
  ],
  
  coverageDirectory: '../../coverage/apps/back',
  coverageReporters: ['text', 'lcov', 'html'],
  
  coverageThresholds: {
    global: {
      branches: 60,
      functions: 60,
      lines: 60,
      statements: 60,
    },
  },
  
  testMatch: [
    '<rootDir>/src/**/*.spec.ts',
    '<rootDir>/src/**/*.test.ts',
  ],
  
  setupFilesAfterEnv: ['<rootDir>/src/test-setup.ts'],
  
  testTimeout: 10000,
  
  clearMocks: true,
  restoreMocks: true,
  
  verbose: true,
  
  moduleNameMapping: {
    '^@crm/back/(.*)$': '<rootDir>/src/$1',
    '^@crm/shared/(.*)$': '<rootDir>/../../libs/shared/src/$1',
  },
};
