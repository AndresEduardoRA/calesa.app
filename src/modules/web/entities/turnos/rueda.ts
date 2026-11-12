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
