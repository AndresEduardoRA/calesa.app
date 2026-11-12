// El formulario de «Agregar salida» y lo que decide qué fases se ofrecen (5.06). Espejo de `transicion_crear` (`20261111212908_transiciones_crear.sql`): la base
// vuelve a decir cada motivo, con el campo en el `hint`. Sin I/O.
import { porOrdenYNombre } from '../fase'
import type { FaseParaConfigurar, FlujoParaConfigurar, TransicionParaConfigurar } from '../flujo'

// Espejo de `_transicion_accion`: lo que dice el botón al mover.
export const LARGO_MAXIMO_DE_ACCION = 40

export type BorradorDeSalida = { aFaseId: string; accion: string; notaObligatoria: boolean }

export const BORRADOR_DE_SALIDA_NUEVA: BorradorDeSalida = {
  aFaseId: '',
  accion: '',
  notaObligatoria: false,
}

// Los campos del formulario donde cae un error (los del `hint` de la base).
export type CampoDeSalida = 'a_fase_id' | 'accion' | 'de_fase_id'
export const CAMPOS_DE_SALIDA: readonly CampoDeSalida[] = ['a_fase_id', 'accion', 'de_fase_id']

export function esCampoDeSalida(campo: string | undefined): campo is CampoDeSalida {
  return CAMPOS_DE_SALIDA.some((c) => c === campo)
}

export const MENSAJES_DE_SALIDA = {
  sinDestino: 'Elige la fase destino.',
  accionLarga: `La acción tiene hasta ${String(LARGO_MAXIMO_DE_ACCION)} caracteres.`,
  sinOtraFase: 'No hay otra fase activa a la que salir.',
  yaSalesATodas: 'Ya sacas a todas las fases activas.',
} as const

const porFaseDestino =
  (flujo: FlujoParaConfigurar) => (a: TransicionParaConfigurar, b: TransicionParaConfigurar) => {
    const faseA = flujo.fases.find((f) => f.id === a.aFaseId)
    const faseB = flujo.fases.find((f) => f.id === b.aFaseId)
    return faseA && faseB ? porOrdenYNombre(faseA, faseB) : 0
  }

// Las salidas de la fase: las transiciones que salen de ella, en el orden de su fase destino.
export function salidasDe(flujo: FlujoParaConfigurar, faseId: string): TransicionParaConfigurar[] {
  return flujo.transiciones.filter((t) => t.deFaseId === faseId).sort(porFaseDestino(flujo))
}

// Las fases desde las que se llega a ésta, en el orden del flujo.
export function entradasDe(flujo: FlujoParaConfigurar, faseId: string): FaseParaConfigurar[] {
  const origenes = new Set(
    flujo.transiciones.filter((t) => t.aFaseId === faseId).map((t) => t.deFaseId),
  )
  return flujo.fases.filter((f) => origenes.has(f.id))
}

// A dónde se puede sumar una salida: fases activas, distintas de la propia y que aún no son salida (la base lo exige igual: `22023` y `23505`).
export function destinosDisponibles(
  flujo: FlujoParaConfigurar,
  faseId: string,
): FaseParaConfigurar[] {
  const yaSalen = new Set(salidasDe(flujo, faseId).map((t) => t.aFaseId))
  return flujo.fases.filter((f) => f.activa && f.id !== faseId && !yaSalen.has(f.id))
}

// Por qué «Agregar salida» está apagado, o nulo si hay a dónde.
export function motivoSinDestinos(flujo: FlujoParaConfigurar, faseId: string): string | null {
  if (destinosDisponibles(flujo, faseId).length > 0) {
    return null
  }
  const hayOtraActiva = flujo.fases.some((f) => f.activa && f.id !== faseId)
  return hayOtraActiva ? MENSAJES_DE_SALIDA.yaSalesATodas : MENSAJES_DE_SALIDA.sinOtraFase
}

export type DatosDeSalida = { aFaseId: string; accion: string | null; notaObligatoria: boolean }

type Validacion =
  | { ok: true; datos: DatosDeSalida }
  | { ok: false; errores: Partial<Record<CampoDeSalida, string>> }

// La acción vacía o de espacios se guarda nula (el botón dice «Mover»).
export function validarSalida(
  borrador: BorradorDeSalida,
  disponibles: readonly FaseParaConfigurar[],
): Validacion {
  const errores: Partial<Record<CampoDeSalida, string>> = {}
  if (!disponibles.some((f) => f.id === borrador.aFaseId)) {
    errores.a_fase_id = MENSAJES_DE_SALIDA.sinDestino
  }
  const accion = borrador.accion.trim()
  if (accion.length > LARGO_MAXIMO_DE_ACCION) {
    errores.accion = MENSAJES_DE_SALIDA.accionLarga
  }
  if (Object.keys(errores).length > 0) {
    return { ok: false, errores }
  }
  return {
    ok: true,
    datos: {
      aFaseId: borrador.aFaseId,
      accion: accion === '' ? null : accion,
      notaObligatoria: borrador.notaObligatoria,
    },
  }
}
