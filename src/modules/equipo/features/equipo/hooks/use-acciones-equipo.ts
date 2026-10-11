'use client'

import { useAction } from 'next-safe-action/hooks'
import type { ErrorApp, Resultado } from '@/shared/lib/errores'
import { errorDeAccion } from '@/shared/lib/formularios'
import { avisarConDeshacer, avisarError, avisarExito } from '@/shared/ui/toasts'
import { nombreDePersona, resultadoDeBaja, type PersonaDelEquipo } from '../../../entities/persona'
import { asignarRol } from '../actions/asignar-rol'
import { bloquear } from '../actions/bloquear'
import { darDeBaja } from '../actions/dar-de-baja'
import { quitarRol } from '../actions/quitar-rol'

type Respuesta<T> = { serverError?: ErrorApp; data?: Resultado<T> }

// El dato si la action salió bien; si no, avisa el motivo (el del guardián incluido, tal cual lo
// dice la base) y devuelve null.
function datoO<T>(respuesta: Respuesta<T>): { dato: T } | null {
  if (respuesta.data?.ok) {
    return { dato: respuesta.data.data }
  }
  const error = errorDeAccion(respuesta)
  if (error) {
    avisarError(error)
  }
  return null
}

// Lo que quien gestiona el equipo hace sobre una persona. Cada cosa es una action y una RPC.
export function useAccionesEquipo() {
  const bloqueando = useAction(bloquear)
  const dandoDeBaja = useAction(darDeBaja)
  const asignando = useAction(asignarRol)
  const quitando = useAction(quitarRol)

  // Bloquear es reversible: se hace y se ofrece deshacer.
  async function cambiarBloqueo(persona: PersonaDelEquipo, valor: boolean): Promise<void> {
    const hecho = datoO(await bloqueando.executeAsync({ personaId: persona.id, bloquear: valor }))
    if (!hecho) {
      return
    }
    const nombre = nombreDePersona(persona)
    if (valor) {
      avisarConDeshacer(`La cuenta de ${nombre} quedó bloqueada`, () => {
        void cambiarBloqueo(persona, false)
      })
    } else {
      avisarExito(`La cuenta de ${nombre} quedó desbloqueada`)
    }
  }

  // Devuelve true si la baja se hizo.
  async function darBaja(persona: PersonaDelEquipo): Promise<boolean> {
    const hecho = datoO(await dandoDeBaja.executeAsync({ personaId: persona.id }))
    if (!hecho) {
      return false
    }
    avisarExito(resultadoDeBaja(nombreDePersona(persona), hecho.dato.leadsAlLimbo))
    return true
  }

  async function cambiarRol(
    persona: PersonaDelEquipo,
    rolId: string,
    asignado: boolean,
  ): Promise<void> {
    const pedido = { personaId: persona.id, rolId }
    datoO(
      asignado
        ? await asignando.executeAsync({ ...pedido, principal: persona.roles.length === 0 })
        : await quitando.executeAsync(pedido),
    )
  }

  return {
    cambiarBloqueo,
    darBaja,
    cambiarRol,
    enCurso:
      bloqueando.isPending || dandoDeBaja.isPending || asignando.isPending || quitando.isPending,
  }
}
