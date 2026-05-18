module.exports = {
  env: {
    commonjs: true,
    es2022: true,
    node: true,
    jest: true,
  },
  extends: ['airbnb-base'],
  parserOptions: {
    ecmaVersion: 'latest',
  },
  rules: {
    'no-underscore-dangle': 'off',
    'consistent-return': 'off',
    'no-param-reassign': 'off',
    'no-restricted-syntax': 'off',
    'no-continue': 'off',
    'default-param-last': 'off',
    'no-await-in-loop': 'off',
    'max-len': 'off',
    'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
  },
};
