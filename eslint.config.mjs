// ESLint 10 — flat config. Las reglas de abajo no son estilo: son SOLID hecho verificable.
import { defineConfig, globalIgnores } from 'eslint/config'
import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTs from 'eslint-config-next/typescript'
import boundaries from 'eslint-plugin-boundaries'
import prettier from 'eslint-config-prettier/flat'

export default defineConfig([
  ...nextVitals,
  ...nextTs,

  {
    files: ['**/*.{ts,tsx,mts}'],
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    rules: {
      // --- lo que atrapa bugs reales que la IA comete seguido ---
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      '@typescript-eslint/await-thenable': 'error',
      '@typescript-eslint/require-await': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unnecessary-condition': 'warn',
      '@typescript-eslint/switch-exhaustiveness-check': 'error',
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      curly: 'error',
      'no-console': ['warn', { allow: ['warn', 'error'] }],

      // --- responsabilidad única, medida ---
      complexity: ['error', { max: 12 }],
      'max-depth': ['error', 4],
      'max-params': ['error', { max: 4, countThis: 'never' }],
      'max-lines': ['warn', { max: 300, skipBlankLines: true, skipComments: true }],
      'max-lines-per-function': ['warn', { max: 80, skipBlankLines: true, skipComments: true }],

      // --- lo que este proyecto prohíbe por diseño ---
      'no-restricted-syntax': [
        'error',
        {
          selector:
            "CallExpression[callee.object.name='window'][callee.property.name=/^(confirm|alert|prompt)$/]",
          message: 'Nunca window.confirm/alert/prompt: usa <Confirmar> o un toast (docs/UX.md).',
        },
        {
          selector: "CallExpression[callee.property.name='toFixed']",
          message: 'Montos y números con src/shared/lib/formato.ts (Intl), nunca toFixed.',
        },
      ],
    },
  },

  // --- inversión de dependencias, forzada (nivel 2: capas DENTRO de cada módulo) ---
  // features no toca infra; entre módulos sólo la API pública (index.ts) — eso además lo
  // verifica scripts/mapa.sh --check con grep, que no caduca.
  // Sintaxis de eslint-plugin-boundaries v7, probada el 2026-10-11 contra un árbol de ejemplo:
  // los elementos son CARPETAS (sin `**/*`, sin `mode`), las políticas van en `policies` y el
  // "mismo módulo" se expresa con `captured: { modulo: "{{ from.element.captured.modulo }}" }`.
  // `modulo-api` = lo que queda directo en src/modules/<x>/ (su index.ts).
  {
    files: ['src/**/*.{ts,tsx}'],
    plugins: { boundaries },
    settings: {
      'import/resolver': { typescript: { project: './tsconfig.json' } },
      'boundaries/elements': [
        { type: 'app', pattern: 'src/app' },
        { type: 'shared', pattern: 'src/shared' },
        { type: 'features', pattern: 'src/modules/*/features', capture: ['modulo'] },
        { type: 'entities', pattern: 'src/modules/*/entities', capture: ['modulo'] },
        { type: 'infra', pattern: 'src/modules/*/infra', capture: ['modulo'] },
        { type: 'modulo-api', pattern: 'src/modules/*', capture: ['modulo'] },
      ],
      'boundaries/ignore': ['**/*.test.{ts,tsx}', '**/*.spec.ts'],
    },
    rules: {
      'boundaries/dependencies': [
        'error',
        {
          default: 'disallow',
          policies: [
            {
              from: { element: { type: 'app' } },
              allow: { to: { element: { types: { anyOf: ['modulo-api', 'shared'] } } } },
            },
            {
              from: { element: { type: 'shared' } },
              allow: { to: { element: { type: 'shared' } } },
            },
            {
              from: { element: { type: 'modulo-api' } },
              allow: [
                {
                  to: {
                    element: {
                      types: { anyOf: ['features', 'entities', 'infra'] },
                      captured: { modulo: '{{ from.element.captured.modulo }}' },
                    },
                  },
                },
                { to: { element: { type: 'shared' } } },
              ],
            },
            {
              from: { element: { type: 'features' } },
              allow: [
                {
                  to: {
                    element: {
                      types: { anyOf: ['features', 'entities'] },
                      captured: { modulo: '{{ from.element.captured.modulo }}' },
                    },
                  },
                },
                { to: { element: { types: { anyOf: ['modulo-api', 'shared'] } } } },
              ],
            },
            {
              from: { element: { type: 'entities' } },
              allow: [
                {
                  to: {
                    element: {
                      type: 'entities',
                      captured: { modulo: '{{ from.element.captured.modulo }}' },
                    },
                  },
                },
                { to: { element: { type: 'shared' } } },
              ],
            },
            {
              from: { element: { type: 'infra' } },
              allow: [
                {
                  to: {
                    element: {
                      types: { anyOf: ['entities', 'infra'] },
                      captured: { modulo: '{{ from.element.captured.modulo }}' },
                    },
                  },
                },
                { to: { element: { type: 'shared' } } },
              ],
            },
          ],
        },
      ],
      // Nadie importa el cliente de Supabase fuera de infra/ y shared/lib/supabase.
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@supabase/supabase-js', '@supabase/ssr'],
              message:
                'Los clientes de Supabase viven en src/shared/lib/supabase y se usan desde infra/.',
            },
            {
              group: ['@/modules/*/features/*', '@/modules/*/entities/*', '@/modules/*/infra/*'],
              message: 'Entre módulos sólo se importa @/modules/<otro> (su index.ts).',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/shared/lib/supabase/**/*.ts', 'src/modules/*/infra/**/*.ts'],
    rules: { 'no-restricted-imports': 'off' },
  },

  prettier,
  globalIgnores([
    '.next/**',
    '.next-e2e/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
    '**/*.gen.ts',
    'src/shared/types/database.types.ts',
    'public/sw.js',
    'scripts/probar-schema.mjs',
  ]),
])
