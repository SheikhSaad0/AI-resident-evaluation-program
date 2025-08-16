import nextPlugin from '@next/eslint-plugin-next';
import tseslint from 'typescript-eslint';
import eslint from '@eslint/js';

export default tseslint.config(
  // Apply recommended rules globally
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  
  // Configuration for Next.js
  {
    files: ["**/*.{js,jsx,mjs,cjs,ts,tsx}"],
    plugins: {
      '@next/next': nextPlugin,
    },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs['core-web-vitals'].rules,
      
      // Your custom rule overrides
      'no-unused-vars': 'off', // Disable base rule to use the TypeScript version
      '@typescript-eslint/no-unused-vars': 'warn',
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
  
  // Global ignores
  {
    ignores: ['.next/**', 'node_modules/**'],
  }
);