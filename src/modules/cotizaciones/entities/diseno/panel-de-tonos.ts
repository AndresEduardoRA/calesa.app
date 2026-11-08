// Lo que la pantalla de tonos (4.22-4) decide sin I/O: qué panel abre la URL, si abre, si hay algo escrito y la firma con que se siembra la lista local.
import {
  COLORES_DE_UN_TEMA,
  TEMAS_DE_UN_TONO,
  coloresDeUnTonoNuevo,
  normalizarNombreDeTono,
  type ColoresDeUnTono,
  type ListaDeTonos,
  type Tono,
} from './tonos'

export const PANEL_NUEVO_TONO = 'nuevo-tono'
export const PANEL_EDITAR_TONO = 'editar-tono'
// La confirmación de eliminar uno (`?panel=eliminar-tono&tono=<id>`).
export const PANEL_ELIMINAR_TONO = 'eliminar-tono'
// El id del tono que se edita o se elimina, en la URL.
export const CLAVE_DE_TONO = 'tono'

export const MOTIVO_DE_TONO_NO_DISPONIBLE = 'Ese tono ya no existe. Recarga para ver cómo quedó.'

export const tonoPorId = (tonos: readonly Tono[], id: string | null): Tono | null =>
  id === null ? null : (tonos.find((t) => t.id === id) ?? null)

export const alTopeDeTonos = (lista: ListaDeTonos): boolean => lista.tonos.length >= lista.tope

// El mismo texto que la base da al crear con el tope lleno.
export const textoDelTopeDeTonos = (tope: number): string =>
  `Ya hay ${tope} tonos, que es el máximo. Elimina uno que ningún grupo use.`

// Cambia si otra persona (o «Recargar») trae otra versión: la lista local se vuelve a sembrar.
export const firmaDeTonos = (lista: ListaDeTonos): string =>
  `${lista.tope}|${lista.tonos.map((t) => `${t.id}@${t.actualizadoEn}`).join('|')}`

// Por qué `?panel=nuevo-tono` o `?panel=editar-tono&tono=<id>` no abre (se revisa una vez, al llegar).
export function motivoParaNoAbrirTono(
  lista: ListaDeTonos,
  modo: 'nuevo' | 'editar' | null,
  id: string | null,
): string | null {
  if (modo === 'nuevo') return alTopeDeTonos(lista) ? textoDelTopeDeTonos(lista.tope) : null
  if (modo === 'editar') return tonoPorId(lista.tonos, id) ? null : MOTIVO_DE_TONO_NO_DISPONIBLE
  return null
}

export function motivoParaNoEliminarTono(tonos: readonly Tono[], id: string | null): string | null {
  return tonoPorId(tonos, id) ? null : MOTIVO_DE_TONO_NO_DISPONIBLE
}

// Si cerrar ahora perdería algo escrito: el nombre o algún color distinto del tono (o, al crear, de la paleta de partida).
export function hayCambiosEnElTono(
  original: Tono | null,
  nombre: string,
  colores: ColoresDeUnTono,
): boolean {
  const base = original?.colores ?? coloresDeUnTonoNuevo()
  const igual = TEMAS_DE_UN_TONO.every((tema) =>
    COLORES_DE_UN_TEMA.every((c) => colores[tema][c].trim().toLowerCase() === base[tema][c]),
  )
  return normalizarNombreDeTono(nombre) !== (original?.nombre ?? '') || !igual
}
