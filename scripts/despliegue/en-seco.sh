#!/usr/bin/env bash
# El despliegue en seco (9.13-2): `pnpm despliegue:en-seco` ensaya en local todo lo que pide un despliegue, sin tocar la nube. Corre dentro de un
# solo candado (el de package.json; los `pnpm db:*` de adentro lo heredan) y en este orden:
#   1. reset     la base desde cero (pnpm db:reset, con un reintento: la CLI falla a veces la primera vez)   ≈ 1-2 min
#   2. probar    las pruebas de la base en PGlite (pnpm db:probar)                                          ≈ 4,5 min
#   3. lint      pnpm db:lint, a su archivo
#   4. base      la base contra el repo: splinter con los schemas de [api] y la regla de advisors.sql, db:lint contra su lista y el
#                inventario (jobs, buckets, nombres de Vault, funciones edge, llamadas y webhooks): revisar-base.mjs
#   5. variables env:check de producción sin ningún entorno: sin credenciales no lee nada y lo dice (lo corre la persona con las suyas)
#   6. build     next build en .next-e2e (no pisa el .next de un pnpm dev)                                   varios minutos
# Un paso que cae no corta los demás (sin base, se saltan 3 y 4). Termina con el bloque «Para la persona» y la última línea `listo`, o
# `falta:` con una línea por cosa que falta (sale con 1). EN_SECO_SOLO=reset,probar,lint,base,variables,build corre sólo esos y nunca
# dice `listo`. Ninguna orden contra el proyecto remoto, ningún puerto ni URL escrito aquí: la base es la del carril (.env.carril). Lo
# vigila scripts/guardas/despliegue-sin-remoto.test.ts. Total esperado: 10-15 min. Cada salida entera: test-salidas/en-seco/<fecha_hora>/.
set -uo pipefail
cd "$(dirname "$0")/../.." || exit 1
# En local la base es la del carril; una variable heredada de otra base daría el veredicto de otra (revisar-base.mjs sólo la usa en el CI).
unset SUPABASE_DB_LOCAL

SALIDA="test-salidas/en-seco/$(date +%Y-%m-%d_%H-%M-%S)"
mkdir -p "$SALIDA"
SOLO="${EN_SECO_SOLO:-}"
FALTAS=()
PERSONA=()
HAY_BASE=1
N=0

quiere() { [ -z "$SOLO" ] || [[ ",$SOLO," == *",$1,"* ]]; }

# Anota el resultado de un paso: ✓ o ✗ con su duración y, si cayó, sus últimas 20 líneas.
anotar() {
  local codigo="$1" nombre="$2" archivo="$3" desde="$4" nota="${5:-}"
  local dur=$((SECONDS - desde))
  if [ "$codigo" = 0 ]; then
    printf '✓ %s (%ss)%s\n' "$nombre" "$dur" "$nota"
  else
    printf '✗ %s (%ss)%s · %s\n' "$nombre" "$dur" "$nota" "$archivo"
    tail -n 20 "$archivo" | sed 's/^/    /'
    FALTAS+=("$nombre (salida: $archivo)")
  fi
}

# El archivo de salida del paso siguiente, en ARCHIVO (sin subshell: N tiene que avanzar).
archivo_de() {
  N=$((N + 1))
  ARCHIVO="$SALIDA/$N-$1.txt"
}

paso_reset() {
  local a t0=$SECONDS nota=''
  archivo_de reset
  a="$ARCHIVO"
  pnpm db:reset >"$a" 2>&1
  local c=$?
  if [ "$c" != 0 ]; then
    nota=' · con un reintento'
    pnpm db:reset >>"$a" 2>&1
    c=$?
  fi
  [ "$c" = 0 ] || HAY_BASE=0
  anotar "$c" 'base desde cero' "$a" "$t0" "$nota"
}

paso_probar() {
  local a t0=$SECONDS
  archivo_de probar
  a="$ARCHIVO"
  pnpm db:probar >"$a" 2>&1
  anotar $? 'pruebas de la base' "$a" "$t0"
}

DB_LINT=''
paso_lint() {
  local a t0=$SECONDS
  archivo_de lint
  a="$ARCHIVO"
  pnpm db:lint >"$a" 2>&1
  local c=$?
  DB_LINT="$a"
  anotar "$c" 'db:lint' "$a" "$t0"
}

paso_base() {
  local a t0=$SECONDS
  archivo_de base
  a="$ARCHIVO"
  local pedido=(advisors inventario)
  [ -n "$DB_LINT" ] && pedido+=(db-lint "$DB_LINT")
  pnpm exec tsx scripts/despliegue/revisar-base.mjs "${pedido[@]}" >"$a" 2>&1
  local c=$?
  while IFS= read -r l; do PERSONA+=("${l#Para la persona: }"); done < <(grep '^Para la persona: ' "$a")
  grep -E '^(✓|✗) |^    - ' "$a" | sed 's/^/  /'
  anotar "$c" 'la base contra el repo' "$a" "$t0"
}

paso_variables() {
  local a t0=$SECONDS
  archivo_de variables
  a="$ARCHIVO"
  # Sin entorno no hay credenciales: cada lugar contesta «no se pudo leer» antes de pedir nada, y el proceso sale con 2.
  env -i PATH="$PATH" HOME="$HOME" pnpm env:check produccion >"$a" 2>&1
  local c=$? leidos
  leidos=$(grep '^· ' "$a" | grep -vc 'no se pudo leer')
  if [ "$c" = 2 ] && [ "$leidos" = 0 ] && grep -q 'no se pudo leer' "$a"; then
    PERSONA+=('correr `pnpm env:check` en modo produccion con las credenciales de Vercel y de Supabase (docs/ENTORNOS.md)')
    anotar 0 'variables de producción (sin credenciales: no leyó nada)' "$a" "$t0"
  else
    anotar 1 "variables de producción (salió con $c y leyó $leidos lugares: sin entorno no debía leer ninguno)" "$a" "$t0"
  fi
}

paso_build() {
  local a t0=$SECONDS nota=''
  archivo_de build
  a="$ARCHIVO"
  if compgen -G '.env.production*' >/dev/null; then
    echo 'hay un .env.production…: el ensayo sólo compila con lo local' >"$a"
    anotar 1 'next build' "$a" "$t0"
    return
  fi
  NEXT_DIST_DIR=.next-e2e pnpm exec next build >"$a" 2>&1
  local c=$?
  if [ "$c" != 0 ] && grep -q 'SecurityFatalError' "$a"; then
    nota=' · repetido tras SecurityFatalError'
    NEXT_DIST_DIR=.next-e2e pnpm exec next build >>"$a" 2>&1
    c=$?
  fi
  anotar "$c" 'next build' "$a" "$t0" "$nota"
}

echo "despliegue en seco · salidas en $SALIDA${SOLO:+ · sólo $SOLO}"
quiere reset && paso_reset
quiere probar && paso_probar
if [ "$HAY_BASE" = 1 ]; then
  quiere lint && paso_lint
  quiere base && paso_base
else
  for p in lint base; do quiere "$p" && FALTAS+=("$p: saltado, sin base") && echo "✗ $p: saltado, sin base"; done
fi
quiere variables && paso_variables
quiere build && paso_build

echo
for l in "${PERSONA[@]}"; do echo "Para la persona: $l"; done
if [ -n "$SOLO" ]; then
  echo "parcial (EN_SECO_SOLO=$SOLO): ${#FALTAS[@]} faltas"
  [ "${#FALTAS[@]}" = 0 ]
  exit $?
fi
if [ "${#FALTAS[@]}" = 0 ]; then
  echo 'listo'
  exit 0
fi
echo 'falta:'
for f in "${FALTAS[@]}"; do echo "  - $f"; done
exit 1
