#!/usr/bin/env bash
# La copia de las piezas del piloto en `<común>/piloto/bin/`, que es lo que corre el bucle (`*.sh`, `*.mjs`, `*.json` de `scripts/piloto/`,
# ninguna prueba), con un sha256 por archivo en `bin.sha256` y de sólo lectura. La usan `arrancar.sh` y el bucle (`bucle.sh` › `copia_al_dia`).
#
# Sale de `origin/main` (lo integrado, que pasó el CI y la compuerta «guardas»), no del árbol del carril: los carriles comparten la copia y cada
# uno la rehacía desde su rama, que podía ir atrás de main y pisar la de los otros con una versión vieja (el 2026-11-07 las tres ramas iban
# sin los PR 44 y 49). Sin `origin/main` (un repo de prueba sin remoto) copia del árbol y lo dice. `PILOTO_COPIA_DESDE=arbol` fuerza el árbol.
#
# Anota en `<común>/piloto/bin.origen` de dónde salió: el `tree` de `origin/main:scripts/piloto`, o «arbol».
#   copiar-bin.sh               copia siempre
#   copiar-bin.sh --si-cambio   copia sólo si `origin/main:scripts/piloto` ya no es el de bin.origen; exit 10 si copió, 0 si no hacía falta
# Un candado (`<común>/piloto/bin.lock`) evita que dos carriles la rehagan a la vez. Variables: las de comun.sh y PILOTO_COPIA_DESDE.
#
# Cada copia es una carpeta propia (`bin.<árbol>-<azar>`) y `bin` es un enlace a la vigente, que se cambia de una vez (`mv -T` de un enlace): nunca
# hay un instante sin `bin/`, y un bucle que ya corre sigue con SU carpeta (comun.sh resuelve el enlace) hasta relanzarse, sin mezclar piezas
# viejas en memoria con nuevas en disco. Las carpetas viejas se borran pasadas 24 h (ningún paso dura tanto).
set -uo pipefail
# shellcheck source=comun.sh
source "$(dirname "${BASH_SOURCE[0]}")/comun.sh"
cd "$RAIZ" || exit 1

SI_CAMBIO=0
[ "${1:-}" = --si-cambio ] && SI_CAMBIO=1
falta() { echo "copiar-bin: $1" >&2; exit 1; }
[ -d "$(dirname "$COMUN")" ] || falta "no hay carpeta común de git."
mkdir -p "$COMUN"

origen_de_main() { git rev-parse --verify --quiet "origin/main:scripts/piloto" 2>/dev/null; }

exec 7>"$COMUN/bin.lock"
flock 7

if [ "${PILOTO_COPIA_DESDE:-}" = arbol ] || ! ORIGEN=$(origen_de_main); then
  ORIGEN=arbol
fi
if [ "$SI_CAMBIO" = 1 ]; then
  # Sin main que mirar no hay a qué ponerse al día; con la misma versión, nada.
  [ "$ORIGEN" = arbol ] && exit 0
  [ "$(cat "$COMUN/bin.origen" 2>/dev/null)" = "$ORIGEN" ] && [ -s "$COMUN/bin/bin.sha256" ] && exit 0
fi

# Un nombre que no se repite (mktemp): con la hora en segundos, dos arranques del mismo segundo (el servicio y el vigía de un carril, al
# instalarse) daban la misma carpeta, y el segundo borraba la del primero mientras su bucle la cargaba (carril b, 2026-11-07 04:53).
NUEVA=$(mktemp -d "$COMUN/bin.${ORIGEN:0:12}-XXXXXX") || falta "no pude crear la carpeta de la copia."
chmod 755 "$NUEVA"
if [ "$ORIGEN" = arbol ]; then
  [ "${PILOTO_COPIA_DESDE:-}" = arbol ] || echo "copiar-bin: AVISO: no hay origin/main; copio scripts/piloto/ del árbol." >&2
  find scripts/piloto -maxdepth 1 -type f \( -name '*.sh' -o -name '*.mjs' -o -name '*.json' \) -exec cp {} "$NUEVA"/ \;
else
  TMP=$(mktemp -d "$COMUN/bin.tar.XXXXXX")
  git archive "$ORIGEN" | tar -x -C "$TMP" || { rm -rf "$TMP" "$NUEVA"; falta "no pude leer origin/main:scripts/piloto."; }
  find "$TMP" -maxdepth 1 -type f \( -name '*.sh' -o -name '*.mjs' -o -name '*.json' \) -exec cp {} "$NUEVA"/ \;
  rm -rf "$TMP"
fi
# Una copia sin las piezas que la corren no reemplaza a la que hay (un main roto no deja a los carriles sin bucle).
for pieza in bucle.sh comun.sh cierre.sh compuerta.sh corrido.sh copiar-bin.sh; do
  [ -s "$NUEVA/$pieza" ] || { rm -rf "$NUEVA"; falta "la copia de ${ORIGEN/#arbol/el árbol} no trae $pieza: dejo la que hay."; }
done
chmod a+x "$NUEVA"/*.sh 2>/dev/null
(cd "$NUEVA" && sha256sum -- * >bin.sha256 2>/dev/null; grep -v ' bin.sha256$' bin.sha256 >bin.tmp && mv bin.tmp bin.sha256)
chmod a-w "$NUEVA"/*
# La primera vez `bin` es una carpeta de antes: se aparta (un único instante sin copia, con el candado tomado).
if [ -d "$COMUN/bin" ] && [ ! -L "$COMUN/bin" ]; then mv "$COMUN/bin" "$COMUN/bin.antes-$(date +%s)"; fi
ln -sfn "$(basename "$NUEVA")" "$COMUN/bin.enlace" && mv -T "$COMUN/bin.enlace" "$COMUN/bin" || falta "no pude cambiar el enlace de la copia."
printf '%s\n' "$ORIGEN" >"$COMUN/bin.origen"
# Las copias viejas, pasadas 24 h (la vigente nunca), salvo la que todavía corre un bucle: uno que duerme por el límite de uso o lleva un
# paso largo sigue con SU carpeta, y al cerrar llama a `verificar.sh` y `publicar.sh` de ella. Una carpeta de copia no tiene nada adentro
# que no se rehaga: se quita sólo si es de las de este script (`bin.<algo>` bajo la carpeta común).
# La que usa un bucle vivo: cada bucle anota su carpeta en `.piloto/bin-en-uso` de su árbol y tiene tomado `.piloto/bucle.lock` (el
# proceso se ve como `bash <común>/bin/bucle.sh`, por el enlace: buscarlo por la ruta de la carpeta no lo encontraba).
en_uso=$(git worktree list --porcelain 2>/dev/null | sed -n 's/^worktree //p' | while IFS= read -r arbol; do
  [ -s "$arbol/.piloto/bin-en-uso" ] || continue
  flock -n "$arbol/.piloto/bucle.lock" true 2>/dev/null || cat "$arbol/.piloto/bin-en-uso"
done)
while IFS= read -r vieja; do
  case "$vieja" in "$COMUN"/bin.?*) ;; *) continue ;; esac
  grep -qxF -- "$vieja" <<<"$en_uso" && continue
  chmod -R u+w -- "$vieja" 2>/dev/null
  find "$vieja" -mindepth 1 -delete 2>/dev/null
  rmdir -- "$vieja" 2>/dev/null
done < <(find "$COMUN" -maxdepth 1 -mindepth 1 -type d -name 'bin.*' ! -name "$(basename "$NUEVA")" ! -name 'bin.tar.*' -mmin +1440 2>/dev/null)
if [ "$ORIGEN" = arbol ]; then de="el árbol"; else de="origin/main (scripts/piloto ${ORIGEN:0:8})"; fi
echo "copiar-bin: copia en $COMUN/bin ($(wc -l <"$COMUN/bin/bin.sha256") archivos, de $de)."
[ "$SI_CAMBIO" = 1 ] && exit 10
exit 0
