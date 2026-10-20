/** @type {import('@commitlint/types').UserConfig} */
export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'header-max-length': [2, 'always', 100],
    'body-max-line-length': [0],
    'scope-enum': [
      1,
      'always',
      ['app', 'auth', 'ui', 'lib', 'config', 'deps', 'ci', 'test', 'docs', 'build', 'release'],
    ],
  },
};
