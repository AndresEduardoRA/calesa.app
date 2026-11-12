// Las secciones de `/datos` (`?seccion=`). «Importar» está declarada y apagada hasta el 9.06: mientras haya una sola visible no hay barra
// de pestañas, y pedirla abre «Exportar» (ninguna pestaña se dibuja vacía, `docs/UX.md`). Sin I/O.

export const SECCIONES_DE_DATOS = [
  { clave: 'exportar', titulo: 'Exportar', disponible: true },
  { clave: 'importar', titulo: 'Importar', disponible: false },
] as const

export type SeccionDeDatos = (typeof SECCIONES_DE_DATOS)[number]['clave']

export function seccionesVisibles() {
  return SECCIONES_DE_DATOS.filter((seccion) => seccion.disponible)
}

// La sección pedida si existe y está prendida; si no, la primera prendida.
export function seccionDeDatos(valor: string | undefined): SeccionDeDatos {
  const visibles = seccionesVisibles()
  return (
    visibles.find((seccion) => seccion.clave === valor)?.clave ?? visibles[0]?.clave ?? 'exportar'
  )
}
