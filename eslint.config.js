export default [{
  languageOptions: {
    ecmaVersion: 'latest',
    globals: {
      'google': 'readonly'
    },
  },
  rules: {
    'no-console': 'off',
    'key-spacing': ['error', { beforeColon: false, afterColon: true }],
    'template-curly-spacing': ['error', 'always'],
    'no-inner-declarations': 'off',
    'require-atomic-updates': 'off',
    'no-async-promise-executor': 'off',
    'no-unused-vars': [
      'error',
      {
        ignoreRestSiblings: true,
        argsIgnorePattern: '[cycle|executingUser]'
      }
    ],
    'no-empty': ['error', { allowEmptyCatch: true }],
    indent: ['error', 2, { 'ignoredNodes': ['TemplateLiteral *'] }],
    'linebreak-style': [
      'error',
      'unix'
    ],
    quotes: [
      'error',
      'single'
    ],
    semi: [
      'error',
      'always'
    ],
    'no-console': [
      'error',
      {
        allow: ['debug', 'warn', 'error', 'log']
      }
    ]
  }
}];
