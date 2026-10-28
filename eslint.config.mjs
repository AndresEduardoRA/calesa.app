// ESLint 10 — flat config. Las reglas de abajo no son estilo: son SOLID hecho verificable.
import { defineConfig, globalIgnores } from 'eslint/config'
import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTs from 'eslint-config-next/typescript'
import boundaries from 'eslint-plugin-boundaries'
import prettier from 'eslint-config-prettier/flat'

// Nadie importa el cliente de Supabase fuera de infra/ y shared/lib/supabase.
const SOLO_CLIENTES_DE_SHARED = {
  group: ['@supabase/supabase-js', '@supabase/ssr'],
  message: 'Los clientes de Supabase viven en src/shared/lib/supabase y se usan desde infra/.',
}

// Un módulo tiene dos entradas: `@/modules/<x>` (index.ts, para Server Components) y
// `@/modules/<x>/client` (client.ts, para Client Components). Todo lo demás son sus tripas, salvo las
// dos entradas de `src/app`: la del shell y la de pantallas (más abajo).
const SOLO_LAS_ENTRADAS = {
  group: ['@/modules/*/*', '!@/modules/*/client'],
  message:
    'Entre módulos sólo se importa @/modules/<otro> (desde el servidor) o @/modules/<otro>/client (desde un Client Component).',
}

// La tercera entrada, la del SHELL (`@/modules/<x>/shell`): sólo el layout `(app)` y su carpeta `_shell/`.
// Todo lo que el layout importa viaja en el JS de todas las pantallas, así que no puede ser el barril
// de `index.ts` (`docs/RENDIMIENTO.md`). Las demás rutas siguen con las dos entradas de siempre.
const LAS_ENTRADAS_Y_LA_DEL_SHELL = {
  group: [
    '@/modules/*/*',
    '!@/modules/*/client',
    '!@/modules/*/shell',
    '!@/modules/*/shell.client',
  ],
  message:
    'Entre módulos sólo se importa @/modules/<otro>, @/modules/<otro>/client o, en el layout del shell, @/modules/<otro>/shell (y shell.client en sus Client Components).',
}

// La cuarta entrada, la de PANTALLAS (`@/modules/<x>/pantallas/<pantalla>`): sólo `src/app`. El `index.ts` de un módulo no exporta
// componentes (lleva sesión, lecturas, actions, reglas y tipos); los de una pantalla salen por su archivo de `pantallas/`, que reexporta
// sólo lo que esa pantalla dibuja. Una pantalla paga todo lo que reexporta el archivo que importa: con un barril de todas las pantallas,
// `/perfil` pagaba 30 KB de la lista del equipo, la matriz de roles y los formularios de Empresa (cierre 5b, `docs/DECISIONES.md`).
const LAS_ENTRADAS_Y_LAS_PANTALLAS = {
  group: [
    '@/modules/*/*',
    '!@/modules/*/client',
    '!@/modules/*/pantallas',
    '!@/modules/*/pantallas/*',
  ],
  message:
    'Entre módulos sólo se importa @/modules/<otro>, @/modules/<otro>/client o, desde src/app, @/modules/<otro>/pantallas/<pantalla>.',
}

// El código diferido (`import()` de un modal, un panel o una pestaña) pasa siempre por `diferido()` de
// `src/shared/ui/diferido.tsx`: sin red, un `next/dynamic` suelto que nunca se pidió tumba la pantalla al
// `error.tsx`. El ayudante carga con reintento y avisa en el lugar (`.claude/rules/escala.md`).
const SOLO_EL_AYUDANTE_DE_DIFERIDOS = {
  name: 'next/dynamic',
  message:
    'El código diferido pasa por diferido() de @/shared/ui/diferido: carga con reintento y, sin red, avisa en su lugar en vez de tumbar la pantalla.',
}

// El cliente admin salta la RLS. Fuera de `src/shared/lib/supabase` lo crea un solo archivo, que
// comprueba el permiso antes y no expone más que `auth.admin` (.claude/rules/datos.md). Los route
// handlers del portal, los webhooks y los crons se suman a esa lista cuando existan.
const SOLO_DONDE_SE_PERMITE_EL_ADMIN = {
  name: '@/shared/lib/supabase/admin',
  message:
    'El cliente admin sólo se crea en src/modules/equipo/infra/invitaciones.ts (.claude/rules/datos.md).',
}
const DONDE_SE_PERMITE_EL_ADMIN = ['src/modules/equipo/infra/invitaciones.ts']

// El correo sale por un solo módulo, `src/shared/lib/email/` (`enviarEmail()`), con un adaptador por proveedor por su API REST: cambiar de
// proveedor es cambiar variables, nunca código (docs/ENTORNOS.md). Nadie importa el SDK de un proveedor, tampoco el módulo.
const NINGUN_SDK_DE_CORREO = {
  group: [
    'resend',
    'resend/*',
    'nodemailer',
    'nodemailer/*',
    '@react-email/*',
    '@sendgrid/*',
    'postmark',
  ],
  message:
    'El correo sale por enviarEmail() de @/shared/lib/email (un adaptador por proveedor, por su API REST): nunca el SDK de un proveedor.',
}

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
  // `modulo-api` = lo que queda directo en src/modules/<x>/: `index.ts` (la entrada de servidor),
  // `client.ts` (la entrada de cliente) y `composicion*.ts` (privado del módulo). Desde afuera sólo
  // se importan las dos entradas: lo cuida `no-restricted-imports`, más abajo.
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
      'no-restricted-imports': [
        'error',
        {
          paths: [SOLO_DONDE_SE_PERMITE_EL_ADMIN, SOLO_EL_AYUDANTE_DE_DIFERIDOS],
          patterns: [SOLO_CLIENTES_DE_SHARED, SOLO_LAS_ENTRADAS, NINGUN_SDK_DE_CORREO],
        },
      ],
    },
  },
  // La entrada de cliente de un módulo: hooks, componentes de cliente y tipos de `entities/`.
  // Nada de servidor, ni directo ni por la composición (lo transitivo lo frena el build).
  {
    files: ['src/modules/*/client.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [SOLO_EL_AYUDANTE_DE_DIFERIDOS],
          patterns: [
            SOLO_CLIENTES_DE_SHARED,
            SOLO_LAS_ENTRADAS,
            NINGUN_SDK_DE_CORREO,
            {
              group: [
                './index',
                './composicion',
                './infra/**',
                '!./infra/*.client',
                'server-only',
                'next/headers',
              ],
              message:
                'client.ts es la entrada de cliente: sólo hooks, componentes de cliente y tipos de entities.',
            },
          ],
        },
      ],
    },
  },
  // infra/ sí importa los clientes de Supabase; lo único que le sigue vedado es el cliente admin.
  {
    files: ['src/modules/*/infra/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [SOLO_DONDE_SE_PERMITE_EL_ADMIN, SOLO_EL_AYUDANTE_DE_DIFERIDOS],
          patterns: [NINGUN_SDK_DE_CORREO],
        },
      ],
    },
  },
  {
    files: ['src/shared/lib/supabase/**/*.ts', ...DONDE_SE_PERMITE_EL_ADMIN],
    rules: { 'no-restricted-imports': ['error', { patterns: [NINGUN_SDK_DE_CORREO] }] },
  },

  // `src/app` compone las pantallas: además de las dos entradas, importa `pantallas/<pantalla>` de cada módulo. El layout `(app)` y su
  // `_shell/` quedan fuera (el bloque que sigue los reemplaza): un layout que importara una pantalla la pondría en toda pantalla.
  {
    files: ['src/app/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [SOLO_DONDE_SE_PERMITE_EL_ADMIN, SOLO_EL_AYUDANTE_DE_DIFERIDOS],
          patterns: [SOLO_CLIENTES_DE_SHARED, LAS_ENTRADAS_Y_LAS_PANTALLAS, NINGUN_SDK_DE_CORREO],
        },
      ],
    },
  },

  // El layout del shell y su carpeta importan la entrada delgada de cada módulo.
  {
    files: ['src/app/(app)/layout.tsx', 'src/app/(app)/_shell/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [SOLO_DONDE_SE_PERMITE_EL_ADMIN, SOLO_EL_AYUDANTE_DE_DIFERIDOS],
          patterns: [SOLO_CLIENTES_DE_SHARED, LAS_ENTRADAS_Y_LA_DEL_SHELL, NINGUN_SDK_DE_CORREO],
        },
      ],
    },
  },

  // Fuera de src (scripts, e2e, configuración) tampoco se manda correo por el SDK de un proveedor.
  {
    files: ['scripts/**/*.{ts,mjs,js}', 'e2e/**/*.ts', '*.{ts,mjs,js}'],
    rules: { 'no-restricted-imports': ['error', { patterns: [NINGUN_SDK_DE_CORREO] }] },
  },

  prettier,
  globalIgnores([
    '.next/**',
    '.next-e2e/**',
    // Lo que deja Playwright cuando un e2e falla (el visor de trazas es JS minificado).
    'playwright-report/**',
    'test-results/**',
    'e2e-fallos/**',
    // Salidas locales (`pnpm test`, mediciones, artefactos de CI bajados): ignoradas por git, nunca código.
    'test-salidas/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
    '**/*.gen.ts',
    'src/shared/types/database.types.ts',
    'public/sw.js',
    'scripts/probar-schema.mjs',
    // Deno, con sus globales y sus imports: `tsconfig.json` ya lo excluye, y sin proyecto de
    // TypeScript el lint tipado no tiene cómo leerlo. Se verifica con el e2e contra el runtime.
    'supabase/functions/**',
    // Un worktree de otra sesión y lo que escribe el piloto: no son código de este árbol (el ESLint plano no ignora carpetas con punto).
    '.claude/worktrees/**',
    '.piloto/**',
  ]),
])
