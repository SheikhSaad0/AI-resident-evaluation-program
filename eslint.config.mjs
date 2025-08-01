import next from '@next/eslint-plugin-next';
import tseslint from 'typescript-eslint';
import eslint from '@eslint/js';

export default tseslint.config(
  // Globally applies recommended rules
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    // Applies Next.js recommended rules
    plugins: {
      '@next': next,
    },
    rules: {
      ...next.configs.recommended.rules,
      ...next.configs['core-web-vitals'].rules,
    },
  },
  {
    // Overrides for specific rules
    rules: {
      'no-unused-vars': 'off', // Must disable base rule
      '@typescript-eslint/no-unused-vars': 'warn',
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
  {
    // Ignores the .next directory
    ignores: ['.next/**'],
  }
);