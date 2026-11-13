// El formulario de «Agregar requisito» de forma «Espera»: la fase del otro flujo que se espera y las notas. Espejo de `_requisito_forma()`;
// que la regla «Esperas» esté encendida y que la fase sea de otro ámbito lo dice la base. Sin I/O.
import { MENSAJE_DE_NOTAS_LARGAS, validarNotas } from './notas'
import type { FaseDelOtroFlujo } from './opciones'

export type BorradorDeEspera = { faseId: string; notas: string }

export const BORRADOR_DE_ESPERA_NUEVO: BorradorDeEspera = { faseId: '', notas: '' }

export type CampoDeEspera = 'espera_fase_id' | 'notas'
export const CAMPOS_DE_ESPERA: readonly CampoDeEspera[] = ['espera_fase_id', 'notas']

export function esCampoDeEspera(campo: string | undefined): campo is CampoDeEspera {
  return CAMPOS_DE_ESPERA.some((c) => c === campo)
}

export const MENSAJES_DE_ESPERA = {
  sinFase: 'Elige la fase que se espera.',
  faseFuera: 'Esa fase no está disponible para esperar.',
  notasLargas: MENSAJE_DE_NOTAS_LARGAS,
} as const

// Lo que se manda a `requisito_crear` como `p_datos`.
export type DatosDeEspera = { espera_fase_id: string; notas?: string }

type Validacion =
  | { ok: true; datos: DatosDeEspera }
  | { ok: false; errores: Partial<Record<CampoDeEspera, string>> }

export function validarEspera(
  borrador: BorradorDeEspera,
  fases: readonly FaseDelOtroFlujo[],
): Validacion {
  const errores: Partial<Record<CampoDeEspera, string>> = {}
  if (borrador.faseId === '') {
    errores.espera_fase_id = MENSAJES_DE_ESPERA.sinFase
  } else if (!fases.some((f) => f.id === borrador.faseId)) {
    errores.espera_fase_id = MENSAJES_DE_ESPERA.faseFuera
  }
  const notas = validarNotas(borrador.notas)
  if (!notas.ok) {
    errores.notas = MENSAJES_DE_ESPERA.notasLargas
  }
  if (Object.keys(errores).length > 0 || !notas.ok) {
    return { ok: false, errores }
  }
  return {
    ok: true,
    datos: {
      espera_fase_id: borrador.faseId,
      ...(notas.valor === null ? {} : { notas: notas.valor }),
    },
  }
}
