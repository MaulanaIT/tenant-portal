import base from './jest.config.js';

export default {
  ...base,
  testMatch: ['<rootDir>/test/**/*.e2e-spec.ts'],
  setupFiles: ['<rootDir>/test/e2e-env.ts'],
};
