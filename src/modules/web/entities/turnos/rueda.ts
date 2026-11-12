// La rueda de turnos de la web, vista desde una persona. Quien decide es la base: `public.puede_estar_en_la_rueda(uuid)` (cuenta activa,
// sin bloqueo y el permiso por alguno de sus roles) la consultan el reparto, el pegajoso, la reasignación al vencer y `estado_cola_web`.
// Acá vive su espejo para dibujar: sólo dice si el ROL de la persona recibe turnos. Que además esté habilitada (`cola_web_asesores.habilitado`)
// es una decisión sobre la persona, de quien administra la cola.
import { puede, type Permisos } from '@/shared/lib/permisos'

export function puedeEstarEnLaRueda(permisos: Permisos): boolean {
  return puede(permisos, 'web.cola.participar')
}

export const TEXTO_SIN_RUEDA = 'Tu rol no recibe turnos de la web.'
export const TEXTO_CON_RUEDA =
  'Tu rol recibe turnos de la web. Quien administra la cola decide si estás en la rueda.'

export function textoDeLaRueda(permisos: Permisos): string {
  return puedeEstarEnLaRueda(permisos) ? TEXTO_CON_RUEDA : TEXTO_SIN_RUEDA
}

export const TEXTO_SIN_SUMAR = 'Quien administra la cola todavía no te sumó a la rueda.'
export const TEXTO_VER_COMO = 'Estás mirando como otro rol: sal de «Ver como» para cambiarlo.'
export const AYUDA_DE_DISPONIBILIDAD =
  'Apagado, no te llegan turnos nuevos. Un turno que ya tienes sigue abierto hasta que lo confirmes o venza.'

// Por qué el interruptor de disponibilidad no se puede mover, o `null` si se puede. Con «Ver como» las escrituras irían a la cuenta real
// (no al rol que se mira), así que se apaga mientras se mira a otro (D12 del 8.05-2).
export function motivoSinInterruptor(entrada: {
  permisos: Permisos
  habilitado: boolean
  miraOtroRol: boolean
}): string | null {
  if (!puedeEstarEnLaRueda(entrada.permisos)) return TEXTO_SIN_RUEDA
  if (entrada.miraOtroRol) return TEXTO_VER_COMO
  if (!entrada.habilitado) return TEXTO_SIN_SUMAR
  return null
}
