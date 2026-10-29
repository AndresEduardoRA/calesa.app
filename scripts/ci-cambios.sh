#!/usr/bin/env bash
# Decide qué jobs pesados de CI corren (`.github/workflows/ci.yml`, job `cambios`). Imprime dos líneas para $GITHUB_OUTPUT:
#
#   pesado=true|false   la base (`base`): el cambio toca código, base, e2e, scripts o la configuración que los mueve
#   e2e=true|false      el e2e en bloques: pesado y, además, el evento lo pide (pull_request, schedule y workflow_dispatch; no push)
#
# `schedule` (el completo de cada noche sobre main) corre sólo si main tuvo commits en las últimas 25 horas.
#
# Entradas (variables): EVENTO (push | pull_request | workflow_dispatch), ANTES (`github.event.before`), BASE_PR
# (`github.event.pull_request.base.sha`) y DESPUES (por defecto HEAD). La razón va a stderr, para el log del job.
#
# Ante la duda corre todo: sin commit de comparación (push de una rama nueva, `before` en ceros), con un commit que el clon no
# tiene (un clon superficial: el job pide `fetch-depth: 0`; un push forzado) o si `git diff` falla.
# Se prueba en `scripts/ci-cambios.test.ts`.
set -uo pipefail

PATRON='^(src/|supabase/|e2e/|scripts/|\.github/|package\.json$|pnpm-lock\.yaml$|playwright\.config\.ts$|next\.config\.ts$)'
CEROS=0000000000000000000000000000000000000000
EVENTO="${EVENTO:-}"

salir() {
  local pesado="$1" motivo="$2" e2e=false
  # El disparo del e2e: cambiar esta línea es cambiar cuándo se gastan sus minutos (`docs/DECISIONES.md`, «CI-1»).
  if [ "$pesado" = true ] && [ "$EVENTO" != push ]; then e2e=true; fi
  echo "pesado=$pesado"
  echo "e2e=$e2e"
  echo "cambios: pesado=$pesado e2e=$e2e ($motivo)" >&2
  exit 0
}

case "$EVENTO" in
  schedule)
    if [ -n "$(git log -1 --since='25 hours ago' --format=%H 2>/dev/null)" ]; then
      salir true "la noche: main tuvo commits en las últimas 25 h"
    fi
    salir false "la noche: main no tuvo commits en las últimas 25 h"
    ;;
  push) desde="${ANTES:-}" ;;
  pull_request) desde="${BASE_PR:-}" ;;
  *) salir true "evento «${EVENTO:-ninguno}»: corre todo" ;;
esac
hasta="${DESPUES:-HEAD}"

if [ -z "$desde" ] || [ "$desde" = "$CEROS" ]; then
  salir true "sin commit de comparación"
fi
if ! git cat-file -e "${desde}^{commit}" 2>/dev/null; then
  salir true "el clon no tiene ${desde:0:12} (¿superficial o push forzado?)"
fi

if ! archivos=$(git diff --name-only "${desde}...${hasta}" 2>/dev/null); then
  salir true "git diff ${desde:0:12}...${hasta} falló"
fi
tocados=$(grep -cE "$PATRON" <<< "$archivos" || true)
if [ "$tocados" -gt 0 ]; then
  salir true "$tocados archivos de código, base, e2e, scripts o configuración"
fi
salir false "sólo documentación u otros archivos"
