import pluginVue from 'eslint-plugin-vue';
import vueTsEslint from '@vue/eslint-config-typescript';

export default [
  ...pluginVue.configs['flat/recommended'],
  ...vueTsEslint(),
  {
    rules: {
      'vue/multi-word-component-names': 'off',
      'vue/require-default-prop': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
  {
    ignores: ['dist/**', 'node_modules/**'],
  },
];
