// Dominancia: nadie otorga lo que no tiene. Espejo de `concesion_dominada()` y `rol_dominado()`
// de la base, que son quienes lo impiden de verdad. Acá sirve para dibujar: lo que la persona no
// puede dar aparece deshabilitado, con el motivo, antes de que lo intente.
import { z } from 'zod'
import type { Concesion, Permisos } from '@/shared/lib/permisos'

export const MOTIVO_CONCESION_NO_DOMINADA = 'No puedes dar un permiso que no tienes.'
export const MOTIVO_ROL_NO_DOMINADO =
  'Este rol tiene permisos que tú no tienes: no puedes cambiarlo ni asignarlo.'
// Sobre una persona con permisos que quien mira no tiene (9-1; la base responde lo mismo con 42501). Nombra la acción que
// ofrece el menú: bloquear o desbloquear.
export const MOTIVO_PERSONA_NO_DOMINADA: Record<'bloquear' | 'desbloquear', string> = {
  bloquear:
    'Tiene permisos que tú no tienes: no puedes cambiar sus roles, bloquearla ni darla de baja.',
  desbloquear:
    'Tiene permisos que tú no tienes: no puedes cambiar sus roles, desbloquearla ni darla de baja.',
}
export const MOTIVO_DOMINANCIA_SIN_LEER =
  'No pudimos comprobar si tienes todos sus permisos. Recarga la página para intentarlo de nuevo.'

// Una concesión está cubierta por una mía si es el mismo permiso, mi origen la abarca (todos, o
// ese mismo) y mi alcance no es menor.
export function concesionDominada(mias: Permisos, concesion: Concesion): boolean {
  return mias.some(
    (mia) =>
      mia.clave === concesion.clave &&
      (mia.origenId === null || mia.origenId === concesion.origenId) &&
      (mia.alcance === 'todos' || concesion.alcance === 'propios'),
  )
}

// Domino un rol si domino cada una de sus concesiones. Un rol sin concesiones lo domina cualquiera.
export function rolDominado(mias: Permisos, concesionesDelRol: Permisos): boolean {
  return concesionesDelRol.every((concesion) => concesionDominada(mias, concesion))
}

// El alcance más amplio que puedo dar de un permiso en un origen (null = todos los orígenes), o
// null si no puedo darlo.
export function alcanceOtorgable(
  mias: Permisos,
  clave: Concesion['clave'],
  origenId: string | null,
): Concesion['alcance'] | null {
  if (concesionDominada(mias, { clave, origenId, alcance: 'todos' })) {
    return 'todos'
  }
  return concesionDominada(mias, { clave, origenId, alcance: 'propios' }) ? 'propios' : null
}

// A quiénes de una página domina quien mira: lo que devuelve `personas_dominadas()` (sus mismos permisos contra los de cada
// persona; el dueño domina a todos). Si la lectura falló o la forma no es la esperada, null: «no se sabe», y nada se habilita.
export function dominadasDesde(respuesta: {
  data: unknown
  error: unknown
}): ReadonlySet<string> | null {
  if (respuesta.error) {
    return null
  }
  const ids = z.array(z.guid()).safeParse(respuesta.data)
  return ids.success ? new Set(ids.data) : null
}
