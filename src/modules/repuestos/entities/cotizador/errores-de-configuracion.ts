// Lo que llega a la persona cuando la base rechaza escribir la configuración, un tramo o una caja del cotizador (8.12-2, C5–C7). Puro: lo usa
// `infra/cotizador/escribir-configuracion.ts`.
import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { errorDePostgrest } from '@/shared/lib/errores'
import {
  CAMPOS_DE_CONFIGURACION as C,
  HASTA_MAYOR_QUE_DESDE,
  mensajeDelCampo,
} from './configuracion'

export const SIN_PERMISO_PARA_EL_COTIZADOR =
  'No tienes permiso para configurar el cotizador de repuestos.'
export const OTRA_CONFIGURACION_PUBLICADA =
  'Otra persona publicó una configuración mientras editabas. Recarga para ver la nueva.'

export type EntidadDeConfiguracion = 'configuracion' | 'tramo' | 'caja'

export type ErrorAlConfigurar = { code?: string | null; message: string; hint?: string | null }

const YA_NO_EXISTE: Record<EntidadDeConfiguracion, string> = {
  configuracion: 'Esta configuración ya no existe. Recarga para ver lo nuevo.',
  tramo: 'Este tramo ya no existe. Recarga para ver lo nuevo.',
  caja: 'Esta caja ya no existe. Recarga para ver lo nuevo.',
}

function enCampo(campo: string, mensaje: string): ResultadoDeAccion<never> {
  return { ok: false, error: { codigo: 'validacion', mensaje }, porCampo: { [campo]: mensaje } }
}

// El `check` que rompió, por su nombre en el mensaje de la base: el campo y el texto de C3.
const CHECKS: readonly [string, string, string][] = [
  ['repuestos_tramos_logistica_signo_check', 'costoMin', mensajeDelCampo(C.montoDeTramo)],
  ['repuestos_tramos_logistica_check', 'costoMax', HASTA_MAYOR_QUE_DESDE],
  ['repuestos_cajas_monto_check', 'monto', mensajeDelCampo(C.montoDeCaja)],
  ['repuestos_cotizador_config_redondeo_check', 'redondeo', mensajeDelCampo(C.redondeo)],
]

/** El error de la base, dicho para la persona y, si se puede, en su campo. `moneda` sirve para el 23505 de una caja repetida. */
export function rechazoDeConfiguracion(
  error: ErrorAlConfigurar,
  { moneda }: { moneda?: string } = {},
): ResultadoDeAccion<never> {
  switch (error.code ?? '') {
    case '23P01':
      // `trg_tramo_sin_solape` (8.12-1) escribe su texto para la persona: «Ese tramo se cruza con otro de USD (de 100,00 a 500,00).».
      return enCampo('costoMin', error.message)
    case '23514': {
      const check = CHECKS.find(([nombre]) => error.message.includes(`"${nombre}"`))
      return check
        ? enCampo(check[1], check[2])
        : {
            ok: false,
            error: errorDePostgrest({ code: error.code ?? null, message: error.message }),
          }
    }
    case '23505':
      return enCampo('monto', `Ya hay una caja de ese monto en ${moneda ?? 'esa moneda'}.`)
    case '42501':
      return { ok: false, error: { codigo: 'sin_permiso', mensaje: SIN_PERMISO_PARA_EL_COTIZADOR } }
    default:
      return {
        ok: false,
        error: errorDePostgrest({ code: error.code ?? null, message: error.message }),
      }
  }
}

/** La RLS dejó la escritura en cero filas: si la fila sigue existiendo es falta de permiso; si no, otro la borró. */
export function sinFilasDeConfiguracion(
  existe: boolean,
  entidad: EntidadDeConfiguracion,
): ResultadoDeAccion<never> {
  return existe
    ? { ok: false, error: { codigo: 'sin_permiso', mensaje: SIN_PERMISO_PARA_EL_COTIZADOR } }
    : { ok: false, error: { codigo: 'conflicto', mensaje: YA_NO_EXISTE[entidad] } }
}
