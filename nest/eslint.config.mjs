import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['dist/**', 'node_modules/**', 'drizzle/**', '*.mjs'],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // 未使用变量/参数：以下划线开头或 catch 绑定可忽略
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      // jsonb / unknown 数据落库与排序白名单等场景需显式类型断言，
      // 纳入规则将导致大量误报，关闭该规则（业务代码仍以严格类型为主）。
      '@typescript-eslint/no-explicit-any': 'off',
      // Promise 链式 void 调用（fire-and-forget 日志/异步写库）允许
      '@typescript-eslint/no-floating-promises': 'off',
      // 依赖注入构造参数命名约定（Nest 惯用 private readonly）
      '@typescript-eslint/parameter-properties': 'off',
    },
  },
);