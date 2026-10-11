'use client'

import { useAction } from 'next-safe-action/hooks'
import { use } from 'react'
import { errorDeAccion } from '@/shared/lib/formularios'
import { avisarError } from '@/shared/ui/toasts'
import { salirDePerspectiva } from '../actions/salir-de-perspectiva'
import { verComo as verComoAccion } from '../actions/ver-como'
import { ContextoPerspectiva } from '../contexto'

// La perspectiva «ver como» para cualquier Client Component: con qué rol se está mirando, entre
// cuáles se puede elegir, y cómo entrar y salir. Es sólo interfaz: cambia lo que se dibuja (los
// permisos de la sesión pasan a ser los efectivos), nunca lo que la base permite.
export function usePerspectiva() {
  const perspectiva = use(ContextoPerspectiva)
  const entrando = useAction(verComoAccion)
  const saliendo = useAction(salirDePerspectiva)

  // Al cambiar la cookie, Next vuelve a dibujar la pantalla con la sesión nueva: no hay nada que
  // actualizar a mano. Sólo se avisa si falló.
  async function verComo(rolId: string): Promise<void> {
    const error = errorDeAccion(await entrando.executeAsync({ rolId }))
    if (error) {
      avisarError(error)
    }
  }

  async function salir(): Promise<void> {
    const error = errorDeAccion(await saliendo.executeAsync())
    if (error) {
      avisarError(error)
    }
  }

  return {
    ...perspectiva,
    verComo,
    salir,
    enCurso: entrando.isPending || saliendo.isPending,
  }
}
