import { parseAsString, useQueryStates } from 'nuqs'

// Lo que la hoja abre vive en la URL (`.claude/rules/ui.md`): «Avanzado» en `?panel=avanzado` y la ayuda de texto de una celda en `?ayuda=texto&nodo=<id>` (la clave `ayuda`,
// aparte de `panel`, deja libre `?ayuda=tabla` para la ayuda de una tabla, 4.13-4c).
export const PANEL_DE_AVANZADO = 'avanzado'
export const CLAVE_DE_AYUDA = 'ayuda'
export const AYUDA_DE_TEXTO = 'texto'
export const CLAVE_DEL_NODO = 'nodo'

// Quita de la URL lo que la hoja tenía abierto: guardada, «Cotizar otra» vuelve a montar la hoja y no debe reabrir el modal ni la ayuda. Sólo toca lo suyo (otro `?panel=` queda).
export function useSoltarLoAbierto() {
  const [url, escribir] = useQueryStates({
    panel: parseAsString,
    [CLAVE_DE_AYUDA]: parseAsString,
    [CLAVE_DEL_NODO]: parseAsString,
  })
  return () => {
    void escribir(
      {
        ...(url.panel === PANEL_DE_AVANZADO ? { panel: null } : {}),
        ...(url[CLAVE_DE_AYUDA] === AYUDA_DE_TEXTO
          ? { [CLAVE_DE_AYUDA]: null, [CLAVE_DEL_NODO]: null }
          : {}),
      },
      { history: 'replace' },
    )
  }
}
