// Revertir la fórmula de un origen a una versión archivada desde Configuración › Cotización › «Fórmula» (4.20-2b): publica la N+1 como copia de esa versión, con su
// diseño (`formula_revertir()`, 4.20-1), sin tocar el borrador. Aquí, el panel de la URL, la nota escrita de antemano y a cuál se revierte.

export const PANEL_REVERTIR_FORMULA = 'revertir-formula'
// `?version=<id>`: la versión archivada que se revierte.
export const CLAVE_DE_VERSION = 'version'

// La nota con la que abre el modal (se puede cambiar; vacía, no se publica).
export function notaDeRevertir(version: number): string {
  return `Vuelve a la versión ${String(version)}.`
}

export type VersionParaRevertir = { id: string; version: number }

type Contexto = {
  // Las filas de la primera página, la que leyó el servidor (sólo las archivadas cuentan).
  archivadas: readonly { id: string; version: number; estado: 'publicada' | 'archivada' }[]
  // La que se eligió con «Revertir» en la lista (puede venir de cualquier página, también tras «Ver más» o «Ir a la versión»).
  elegida: VersionParaRevertir | null
}

// A cuál se revierte con `?version=<id>`: la recién elegida o una archivada de la página del servidor. Lo demás (la publicada, una de otra página al recargar, una que
// no existe o es de otro origen) no se sabe desde la pantalla: nulo. Devuelve la fila tal cual (estable entre renders: la guarda `useUltimo`).
export function versionParaRevertir(
  id: string | null,
  { archivadas, elegida }: Contexto,
): VersionParaRevertir | null {
  if (id === null) {
    return null
  }
  if (elegida?.id === id) {
    return elegida
  }
  return archivadas.find((una) => una.id === id && una.estado === 'archivada') ?? null
}

// `?panel=revertir-formula&version=<id>` se revisa al llegar: sin publicada no hay a qué revertir (la base pide la esperada); la publicada no se revierte; una que no
// está en la lista no abre (la base diría «Esa versión no es de este origen.» sin delatar cuál).
export function motivoParaNoAbrirRevertir(
  id: string | null,
  contexto: Contexto & { publicadaId: string | null },
): string | null {
  if (contexto.publicadaId === null) {
    return 'Sin una versión publicada no hay a qué revertir.'
  }
  if (id === contexto.publicadaId) {
    return 'Esa ya es la versión publicada.'
  }
  return versionParaRevertir(id, contexto)
    ? null
    : 'Esa versión no está en la lista: búscala y elige «Revertir».'
}
