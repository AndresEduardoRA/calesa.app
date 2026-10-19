#!/usr/bin/env bash
# Genera docs/MAPA.md: el índice del proyecto que la IA lee ANTES de explorar con grep.
#
#   bash scripts/mapa.sh           regenera docs/MAPA.md
#   bash scripts/mapa.sh --check   falla (exit 1) si MAPA.md está desactualizado, si una unidad
#                                  no tiene CLAUDE.md, o si un módulo importa las tripas de otro
#                                  (cualquier cosa que no sea `@/modules/<x>` o `@/modules/<x>/client`), o si una
#                                  entrada de DECISIONES o BITACORA lleva una fecha de mañana o fuera de orden
#                                  (`scripts/fechas-de-entradas.mjs`: la fecha sale de `TZ=America/La_Paz date +%F`)
#
# Lo corre el hook Stop de Claude Code (regenera), lefthook en pre-commit (--check) y CI (--check).
# No escribe fechas a propósito: la salida es determinista, así --check solo falla si algo cambió.
# Compatible con bash 3.2 (macOS) y Git Bash: sin arrays asociativos ni globstar.
set -euo pipefail
export LC_ALL=C
cd "$(dirname "$0")/.."

SALIDA="docs/MAPA.md"
MAX_EXPORTS=10
MODO="${1:-generar}"

if [ -f pubspec.yaml ]; then
  STACK=flutter; RAIZ=lib; EXT=dart
  PKG=$(awk '/^name:/{print $2; exit}' pubspec.yaml)
else
  STACK=next; RAIZ=src; EXT=ts
  PKG=""
fi
if [ -d "$RAIZ/modules" ]; then NIVEL=2; else NIVEL=1; fi

TMPD=$(mktemp -d)
trap 'rm -rf "$TMPD"' EXIT
: > "$TMPD/avisos"
# Los avisos van a un archivo porque muchas funciones corren dentro de $(...), en un subshell.
avisar() { echo "- $1" >> "$TMPD/avisos"; }

# Primera línea con contenido del CLAUDE.md de la unidad que no sea título ni comentario.
proposito() {
  if [ -f "$1/CLAUDE.md" ]; then
    awk 'NF && !/^#/ && !/^<!--/ {sub(/^> */,""); print; exit}' "$1/CLAUDE.md"
  else
    avisar "\`$1\` no tiene CLAUDE.md"
    echo "⚠️ sin CLAUDE.md"
  fi
}

# Un `export { a, b }` que Prettier partió en varias líneas, de vuelta en una sola.
aplanar_exports() {
  awk '/^export (type )?\{[^}]*$/ { junta = $0; while ((getline linea) > 0) { junta = junta " " linea; if (linea ~ /\}/) break }; print junta; next } { print }' "$1"
}

# Nombres que exporta un archivo de entrada de TypeScript.
exports_del_archivo() {
  aplanar_exports "$1" > "$TMPD/entrada"
  {
    sed -nE 's/^export (default )?(async )?(declare )?(abstract )?(function\*?|const|let|class|type|interface|enum) +([A-Za-z0-9_$]+).*/\6/p' "$TMPD/entrada"
    sed -nE 's/^export (type )?\{([^}]*)\}.*/\2/p' "$TMPD/entrada" | tr ',' '\n' \
      | sed -E 's/^ *(type +)?//; s/.* as +//; s/ *$//' | grep -v '^$' || true
    sed -nE "s/^export \* from ['\"]([^'\"]+)['\"].*/* \1/p" "$TMPD/entrada"
  } | awk '!seen[$0]++'
}

# API pública de una unidad: nombres exportados por su archivo de entrada.
exports_de() {
  local dir="$1" nombre entrada
  nombre=$(basename "$dir")
  if [ "$STACK" = next ]; then
    entrada=""
    for f in "$dir/index.ts" "$dir/index.tsx"; do [ -f "$f" ] && entrada="$f" && break; done
    [ -z "$entrada" ] && return 0
    exports_del_archivo "$entrada"
  else
    entrada="$dir/$nombre.dart"
    [ -f "$entrada" ] || return 0
    sed -nE "s/^export +'([^']+)'.*/\1/p" "$entrada" | sed -E 's#.*/##; s/\.dart$//'
  fi
}

# La segunda entrada de un módulo: lo que puede importar un Client Component (`client.ts`).
exports_cliente_de() {
  [ "$STACK" = next ] && [ -f "$1/client.ts" ] || return 0
  exports_del_archivo "$1/client.ts"
}

# La tercera entrada de un módulo: la del SHELL (`shell.ts`), sólo para el layout `(app)`.
exports_shell_de() {
  [ "$STACK" = next ] || return 0
  for f in "$1/shell.ts" "$1/shell.client.ts"; do
    [ -f "$f" ] && exports_del_archivo "$f"
  done
  return 0
}

lista_corta() {
  awk -v max="$MAX_EXPORTS" '{ if (NR<=max) out = out (NR>1?", ":"") "`" $0 "`" } END { if (NR>max) out = out ", +" (NR-max); print out }'
}

contar_archivos() { find "$1" -type f -name "*.$EXT*" ! -name "*.g.dart" ! -name "*.freezed.dart" | wc -l | tr -d ' '; }

# Módulos de los que depende $1 (nivel 2) y avisos por imports profundos a otros módulos.
dependencias() {
  local dir="$1" yo patron
  yo=$(basename "$dir")
  if [ "$STACK" = next ]; then patron="@/modules/"; else patron="package:$PKG/modules/"; fi
  grep -rhoE "['\"]${patron}[a-z0-9_-]+(/[^'\"]*)?['\"]" "$dir" 2>/dev/null \
    | tr -d "'\"" | sed "s#^${patron}##" | sort -u > "$TMPD/imports" || true
  while IFS= read -r imp; do
    [ -z "$imp" ] && continue
    mod="${imp%%/*}"; resto="${imp#"$mod"}"
    [ "$mod" = "$yo" ] && continue
    if [ "$STACK" = next ] && [ -n "$resto" ] && [ "$resto" != "/client" ] && [ "$resto" != "/shell" ] && [ "$resto" != "/shell.client" ]; then
      avisar "\`$yo\` importa las tripas de \`$mod\` (\`$imp\`): usa \`@/modules/$mod\` o \`@/modules/$mod/client\`"
    elif [ "$STACK" = flutter ] && [ "$resto" != "/$mod.dart" ]; then
      avisar "\`$yo\` importa las tripas de \`$mod\` (\`$imp\`): usa \`modules/$mod/$mod.dart\`"
    fi
    echo "$mod"
  done < "$TMPD/imports" | sort -u | paste -sd, - | sed 's/,/, /g'
}

unidad() {
  local dir="$1" titulo="$2" exps deps casos
  echo "### \`$titulo\`"
  echo "$(proposito "$dir") · $(contar_archivos "$dir") archivos"
  exps=$(exports_de "$dir" | lista_corta)
  [ -n "$exps" ] && echo "- API: $exps"
  exps=$(exports_cliente_de "$dir" | lista_corta)
  [ -n "$exps" ] && echo "- API de cliente (\`client.ts\`): $exps"
  exps=$(exports_shell_de "$dir" | lista_corta)
  [ -n "$exps" ] && echo "- API del shell (\`shell.ts\`, sólo el layout \`(app)\`): $exps"
  if [ "$NIVEL" = 2 ]; then
    deps=$(dependencias "$dir")
    echo "- Depende de: ${deps:-ningún otro módulo}"
    if [ -d "$dir/features" ]; then
      # Un módulo todavía sin casos de uso no imprime la línea vacía.
      casos=$(find "$dir/features" -mindepth 1 -maxdepth 1 -type d -exec basename {} \; | sort | paste -sd, - | sed 's/,/, /g')
      [ -n "$casos" ] && echo "- Casos de uso: $casos"
    elif [ -d "$dir/ui" ]; then
      echo "- Pantallas: $(find "$dir/ui" -mindepth 1 -maxdepth 1 -type d -exec basename {} \; | sort | paste -sd, - | sed 's/,/, /g')"
    fi
  fi
  echo
}

rutas() {
  if [ "$STACK" = next ]; then
    [ -d "$RAIZ/app" ] || return 0
    find "$RAIZ/app" -type f \( -name 'page.tsx' -o -name 'route.ts' \) | sort | while IFS= read -r f; do
      tipo="página"; case "$f" in */route.ts) tipo="API" ;; esac
      ruta=$(echo "$f" | sed -E "s#^$RAIZ/app##; s#/(page\.tsx|route\.ts)\$##; s#/\([^)]*\)##g")
      echo "- \`${ruta:-/}\` — $tipo"
    done | sort
  else
    grep -rhoE "path: *['\"][^'\"]+['\"]" "$RAIZ" 2>/dev/null | sed -E "s/path: *['\"]//; s/['\"]$//" \
      | sort -u | sed 's/.*/- `&`/' || true
  fi
}

# Lo transversal (src/shared): qué archivos hay en cada carpeta, sin los tests.
compartido() {
  [ "$STACK" = next ] && [ -d "$RAIZ/shared" ] || return 0
  echo "$(proposito "$RAIZ/shared")"
  echo
  find "$RAIZ/shared" -type d | sort | while IFS= read -r d; do
    lista=$(find "$d" -mindepth 1 -maxdepth 1 -type f -name "*.$EXT*" ! -name '*.test.*' -exec basename {} \; \
      | sort | sed 's/.*/`&`/' | paste -sd, - | sed 's/,/, /g')
    [ -n "$lista" ] && echo "- \`${d#"$RAIZ"/shared/}/\`: $lista"
  done
  return 0
}

tablas() {
  [ -d supabase/schemas ] || return 0
  find supabase/schemas -type f -name '*.sql' | sort | while IFS= read -r f; do
    grep -hoiE 'create table( if not exists)? +[a-z0-9_."]+' "$f" \
      | sed -E 's/.* //; s/"//g; s/^public\.//' | sed "s#.*#- \`&\` — \`$f\`#" || true
  done
}

reglas() {
  [ -d .claude/rules ] || return 0
  for f in .claude/rules/*.md; do
    [ -f "$f" ] || continue
    globs=$(awk '/^paths:/{p=1;next} p && /^ *- /{gsub(/^ *- *|"/,""); printf "%s`%s`", (n++?", ":""), $0; next} p{exit}' "$f")
    echo "- \`$(basename "$f")\` → ${globs:-siempre}"
  done
}

generar() {
  echo "# Mapa del proyecto"
  echo
  echo "<!-- Generado por scripts/mapa.sh. No editar a mano: edita el CLAUDE.md de la unidad y regenera. -->"
  echo
  echo "Léelo antes de buscar con grep. Cada unidad tiene su propio \`CLAUDE.md\`, que Claude Code"
  echo "carga solo al tocar sus archivos. Los términos del negocio están en \`docs/GLOSARIO.md\`."
  echo
  if [ "$NIVEL" = 2 ]; then
    echo "## Módulos (\`$RAIZ/modules/\`)"
    echo
    echo "Entre módulos solo se importa la API pública. Dentro de un módulo, rutas relativas."
    echo
    for d in "$RAIZ"/modules/*/; do [ -d "$d" ] && unidad "${d%/}" "$(basename "$d")"; done
  else
    if [ "$STACK" = next ]; then base="$RAIZ/features"; else base="$RAIZ/ui"; fi
    echo "## Features (\`$base/\`)"
    echo
    if [ -d "$base" ]; then
      for d in "$base"/*/; do
        [ -d "$d" ] || continue
        [ "$(basename "$d")" = core ] && continue
        unidad "${d%/}" "$(basename "$d")"
      done
    fi
  fi
  c=$(compartido); [ -n "$c" ] && printf '## Compartido (`%s/shared/`)\n\n%s\n\n' "$RAIZ" "$c"
  r=$(rutas);  [ -n "$r" ] && printf '## Rutas\n\n%s\n\n' "$r"
  t=$(tablas); [ -n "$t" ] && printf '## Tablas (supabase/schemas)\n\n%s\n\n' "$t"
  g=$(reglas); [ -n "$g" ] && printf '## Reglas que se cargan solas (.claude/rules)\n\n%s\n\n' "$g"
  if [ -s "$TMPD/avisos" ]; then
    printf '## ⚠️ Pendientes del mapa\n\n'
    sort -u "$TMPD/avisos"
  fi
}

generar > "$TMPD/mapa.md"
AVISOS_TXT=$(sort -u "$TMPD/avisos")

if [ "$MODO" = "--check" ]; then
  fallo=0
  if ! cmp -s "$TMPD/mapa.md" "$SALIDA" 2>/dev/null; then
    echo "✗ docs/MAPA.md está desactualizado. Corre: bash scripts/mapa.sh" >&2; fallo=1
  fi
  if [ -n "$AVISOS_TXT" ]; then
    echo "✗ El mapa tiene pendientes:" >&2; echo "$AVISOS_TXT" >&2; fallo=1
  fi
  # No depende del mapa sino de los docs: va aparte para que `generar` no escriba fechas en MAPA.md.
  if [ -f scripts/fechas-de-entradas.mjs ] && ! node scripts/fechas-de-entradas.mjs; then fallo=1; fi
  exit $fallo
fi

mkdir -p docs
cp "$TMPD/mapa.md" "$SALIDA"
echo "✓ $SALIDA ($(wc -l < "$SALIDA" | tr -d ' ') líneas)"
[ -n "$AVISOS_TXT" ] && { echo "$AVISOS_TXT" >&2; }
exit 0
