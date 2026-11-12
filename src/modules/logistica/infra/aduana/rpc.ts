import 'server-only'
import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { errorDePostgrest, type ErrorPostgrest } from '@/shared/lib/errores'

// Lo que comparten las lecturas de aduana por RPC (6.09). Cada área lleva lo suyo: un área no importa otra (`scripts/guardas/areas-de-logistica.test.ts`).
export const NO_SE_LEYO = 'No pudimos leer la respuesta. Recarga para ver cómo quedó.'

// `declaraciones_listar` no declara valores por omisión y sus tipos generados no admiten nulo; la base sí (un cursor nulo es «desde el principio»).
export function nuloParaLaBase(valor: string | null): string {
  return valor as string
}

// Lo que la base rechaza de una escritura vuelve con su mensaje ya escrito (6.07-2); el `hint` nombra el campo del formulario o el bloque de la composición.
const CAMPO_DEL_FORMULARIO: Record<string, string> = {
  numero: 'numero',
  aceptada_el: 'aceptadaEl',
  vence_tributos_el: 'venceTributosEl',
  despachante: 'despachante',
  deposito: 'deposito',
  notas: 'notas',
  canal: 'canal',
  vehiculos: 'vehiculos',
  aduana: 'vehiculos',
  fase: 'vehiculos',
}

type ErrorConPista = ErrorPostgrest & { hint?: string | null }

export function falloDeLaBase(error: ErrorConPista): ResultadoDeAccion<never> {
  const app = errorDePostgrest(error)
  const campo = error.hint ? CAMPO_DEL_FORMULARIO[error.hint] : undefined
  return campo && (app.codigo === 'regla' || app.codigo === 'duplicado')
    ? { ok: false, error: app, porCampo: { [campo]: app.mensaje } }
    : { ok: false, error: app }
}

export const inesperado = (): ResultadoDeAccion<never> => ({
  ok: false,
  error: { codigo: 'inesperado', mensaje: NO_SE_LEYO },
})
