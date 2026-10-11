#!/usr/bin/env bash
# Scaffolding con las versiones del día. Se resuelven al correr, no se fijan en la semilla:
# así el proyecto nace con lo actual y no con lo que era actual cuando se generó esta carpeta.
# Verificado el 2026-10-11: Next 16.4, React 19.3, TS 6.0.3, Tailwind 4.3, ESLint 10.12,
# typescript-eslint 8.71, boundaries 7.2, vitest 4.1, Playwright 1.64, lefthook 2.2, supabase CLI 2.120.
set -euo pipefail

APP="importadora"
GESTOR="pnpm"

azul() { printf '\033[1;34m▸ %s\033[0m\n' "$1"; }
rojo() { printf '\033[1;31m✗ %s\033[0m\n' "$1"; }

# --- Requisitos -------------------------------------------------------------
NODE_MAYOR="$(node -v 2>/dev/null | sed 's/v\([0-9]*\).*/\1/' || echo 0)"
if [ "$NODE_MAYOR" -lt 22 ]; then
  rojo "Node $NODE_MAYOR detectado. Este stack necesita 22.13+ o 24 LTS (lo imponen ESLint 10 y commitlint 21)."
  exit 1
fi
command -v git >/dev/null || { rojo "git no está instalado"; exit 1; }
command -v pnpm >/dev/null || { azul "Instalando pnpm con corepack"; corepack enable && corepack prepare pnpm@latest --activate; }
azul "Node $(node -v) · pnpm $(pnpm -v)"

# --- Scaffolding ------------------------------------------------------------
# Se scaffoldea en un temporal y luego se funde con la semilla, para no pisar CLAUDE.md,
# .claude/, docs/, supabase/ ni las configs que ya vienen (la semilla manda).
azul "Scaffolding de Next.js (versión del día)"
TMP="$(mktemp -d)"
npx --yes create-next-app@latest "$TMP/app" \
  --ts --tailwind --eslint --app --src-dir --turbopack \
  --import-alias "@/*" --use-pnpm --skip-install --disable-git --yes

azul "Fundiendo scaffold con la semilla (la semilla manda)"
cp -rn "$TMP/app/." . 2>/dev/null || true
rm -rf "$TMP"
# La página de bienvenida del scaffold no sirve: la fase 1 escribe la real.
rm -f src/app/page.module.css

# --- Dependencias -----------------------------------------------------------
azul "Instalando dependencias base"
pnpm install

azul "Dependencias del proyecto"
pnpm add @supabase/supabase-js @supabase/ssr @tanstack/react-query zod next-safe-action nuqs \
  @tiptap/react @tiptap/starter-kit @tiptap/pm sanitize-html \
  @react-pdf/renderer date-fns date-fns-tz web-push sonner lucide-react papaparse

azul "Herramientas de desarrollo"
pnpm add -D typescript@~6.0.3 @types/node @types/react @types/react-dom @types/sanitize-html @types/web-push @types/papaparse \
  eslint typescript-eslint eslint-config-next eslint-plugin-boundaries eslint-import-resolver-typescript eslint-config-prettier \
  prettier prettier-plugin-tailwindcss \
  vitest@4 @vitejs/plugin-react@5 vite-tsconfig-paths jsdom \
  @testing-library/react @testing-library/dom @testing-library/jest-dom \
  @playwright/test \
  lefthook @commitlint/cli @commitlint/config-conventional \
  supabase @electric-sql/pglite tsx

# TypeScript 6 y no 7 a propósito: TS 7 no expone la API del compilador y rompe el typed
# linting (no-floating-promises y compañía). Revisar cuando salga TS 7.1.
# vitest 4 + @vitejs/plugin-react 5: la combinación verificada; vitest 5 / plugin-react 6 exigen Vite 8.

# PWA sin caché offline: manifest nativo en src/app/manifest.ts + service worker propio
# (public/sw.js) para push e instalación. Para probar en local hace falta HTTPS: pnpm dev --experimental-https

# --- Scripts de package.json ------------------------------------------------
azul "Scripts de package.json"
node scripts/configurar-package.mjs

# --- Configuración ----------------------------------------------------------
azul "Instalando hooks de git"
git init -q 2>/dev/null || true
npx lefthook install

azul "Inicializando shadcn/ui"
npx --yes shadcn@latest init -t next -d || echo "  (shadcn falló: córrelo a mano después)"
npx --yes shadcn@latest add button input label select textarea dialog sheet dropdown-menu tabs badge tooltip switch checkbox popover command separator skeleton table sonner -y || echo "  (componentes shadcn: agregalos a mano después)"

azul "Supabase local"
# supabase/config.toml ya viene en la semilla; `supabase init` no debe pisarlo.
[ -f supabase/config.toml ] || npx supabase init
# El project_id del config.toml es el nombre de la carpeta; linkear el proyecto remoto es manual:
#   npx supabase link --project-ref <ref>

azul "Descargando splinter.sql (advisors de seguridad para CI)"
curl -fsSL https://raw.githubusercontent.com/supabase/splinter/main/splinter.sql \
  -o scripts/splinter.sql || echo "  (no se pudo descargar: el job de CI lo reintentará)"

azul "Playwright (chromium)"
npx playwright install chromium || echo "  (playwright install falló: córrelo a mano)"

chmod +x .claude/hooks/*.sh scripts/*.sh

# --- Verificación -----------------------------------------------------------
azul "Verificando que las barandillas funcionan"
FALLOS=0
pnpm lint       >/dev/null 2>&1 || { rojo "lint falla en vacío"; FALLOS=1; }
pnpm typecheck  >/dev/null 2>&1 || { rojo "typecheck falla en vacío"; FALLOS=1; }
pnpm test       >/dev/null 2>&1 || { rojo "test falla en vacío"; FALLOS=1; }
pnpm db:probar  >/dev/null 2>&1 || { rojo "db:probar falla (schema + pruebas de humo en Postgres embebido)"; FALLOS=1; }
bash scripts/mapa.sh && bash scripts/mapa.sh --check >/dev/null 2>&1 || { rojo "mapa.sh --check falla"; FALLOS=1; }

echo
if [ "$FALLOS" -eq 0 ]; then
  azul "Listo. Todo verde."
else
  rojo "Terminó con avisos: revísalos antes del primer commit (el PROMPT 0 empieza por ahí)."
fi
cat <<'FIN'

Siguiente paso:

  1. Copia .env.example a .env.local y llena las claves de Supabase
     (PUBLISHABLE key, formato sb_publishable_..., no la anon key legacy)
  2. npx supabase start && pnpm db:reset && pnpm db:types
  3. Abre Claude Code:  claude --model opusplan --effort high --permission-mode plan
  4. Pega el PROMPT 0 que te dieron junto con esta semilla

FIN
