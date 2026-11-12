'use client'

import { useRouter } from 'next/navigation'
import { useAction } from 'next-safe-action/hooks'
import { useCallback, useState } from 'react'
import { conRed, resultadoDeAccion } from '@/shared/lib/formularios'
import { avisarError, avisarExito } from '@/shared/ui/toasts'
import {
  desuscribirEnElNavegador,
  leerElNavegador,
  suscribirEnElNavegador,
} from '../../../composicion.client'
import { estadoDelPush, type LecturaDelPush } from '../../../entities/estado-del-push'
import { MOTIVO_NEGADO, MOTIVO_REVISANDO } from '../../../entities/motivos'
import { quitarSuscripcion } from '../actions/quitar-suscripcion'
import { suscribirPush } from '../actions/suscribir-push'
import { useNavegadorDePush } from './use-navegador-de-push'

export type OpcionesDeUsePush = {
  tienePermiso: boolean
  integracionActiva: boolean
  clavePublica: string | null
}

// Los avisos push de ESTE navegador: lee su estado sin pedir permiso, enciende (permiso, service worker, suscripción y
// fila en la base) y apaga (fila y suscripción). Mientras trabaja deja el interruptor deshabilitado: nunca un doble envío.
export function usePush({ tienePermiso, integracionActiva, clavePublica }: OpcionesDeUsePush) {
  const router = useRouter()
  const { navegador, setNavegador, permisoDenegado, setPermisoDenegado } = useNavegadorDePush()
  const [enCurso, setEnCurso] = useState(false)
  const { executeAsync: guardar } = useAction(suscribirPush)
  const { executeAsync: borrar } = useAction(quitarSuscripcion)

  const lectura: LecturaDelPush = estadoDelPush({
    tienePermiso,
    integracionActiva,
    clavePublica,
    soporte: navegador?.soporte ?? true,
    permisoDelNavegador: permisoDenegado ? 'denied' : (navegador?.permiso ?? 'default'),
    suscrito: navegador?.endpoint != null,
  })

  const encender = useCallback(async () => {
    const hecho = await suscribirEnElNavegador(clavePublica ?? '')
    if (!hecho.ok) {
      setPermisoDenegado(hecho.motivo === 'negado')
      avisarError({
        codigo: hecho.motivo === 'negado' ? 'regla' : 'inesperado',
        mensaje:
          hecho.motivo === 'negado'
            ? MOTIVO_NEGADO
            : 'No se pudo activar los avisos en este navegador.',
      })
      return
    }
    const guardada = resultadoDeAccion(await conRed(guardar(hecho.suscripcion)))
    if (!guardada.ok) {
      // Sin la fila en la base, una suscripción viva en el navegador quedaría huérfana.
      await desuscribirEnElNavegador()
      avisarError(guardada.error)
      return
    }
    setNavegador({ soporte: true, permiso: 'granted', endpoint: hecho.suscripcion.endpoint })
    avisarExito('Avisos activados en este navegador')
    router.refresh()
  }, [clavePublica, guardar, router, setNavegador, setPermisoDenegado])

  const quitarDeLaBase = useCallback(
    async (endpoint: string) => {
      const quitada = resultadoDeAccion(await conRed(borrar({ endpoint })))
      if (!quitada.ok) avisarError(quitada.error)
      return quitada.ok
    },
    [borrar],
  )

  const apagar = useCallback(async () => {
    const actual = await leerElNavegador()
    // Sin suscripción local no hay endpoint: lo que quede en la lista se quita con «Quitar».
    if (actual.endpoint !== null && !(await quitarDeLaBase(actual.endpoint))) return
    await desuscribirEnElNavegador()
    setNavegador({ ...actual, endpoint: null })
    avisarExito('Avisos apagados en este navegador')
    router.refresh()
  }, [quitarDeLaBase, router, setNavegador])

  // El interruptor del navegador, y «Quitar» de la lista: el de este navegador es apagar; el de otro sólo borra su fila.
  const trabajar = useCallback(async (tarea: () => Promise<void>) => {
    setEnCurso(true)
    try {
      await tarea()
    } finally {
      setEnCurso(false)
    }
  }, [])

  const quitar = (endpoint: string) =>
    trabajar(async () => {
      if (navegador?.endpoint === endpoint) return apagar()
      if (await quitarDeLaBase(endpoint)) {
        avisarExito('Navegador quitado')
        router.refresh()
      }
    })

  return {
    lectura,
    revisando: navegador === null,
    motivoDeRevision: MOTIVO_REVISANDO,
    encendido: lectura.estado === 'encendido',
    endpointDeEsteNavegador: navegador?.endpoint ?? null,
    enCurso,
    cambiar: (encendido: boolean) => trabajar(encendido ? encender : apagar),
    quitar,
  }
}
