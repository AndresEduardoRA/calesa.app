'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { enviarAccion } from '@/shared/lib/enviar-accion'
import { avisarExito } from '@/shared/ui/toasts'
import { useConflictoHastaLaVersion } from '@/shared/ui/use-conflicto-hasta-la-version'
import { useReintentoAlVolver } from '@/shared/ui/use-reintento-al-volver'
import { useUnEnvioALaVez } from '@/shared/ui/use-un-envio-a-la-vez'
import type { Plantilla } from '../../../entities/plantilla/forma-de-plantilla'
import { guardarBorrador } from '../actions/guardar-borrador'

type Args = {
  origenId: string
  // El `actualizadoEn` del borrador leído, tal cual (texto, nunca `Date`); nulo sin borrador.
  esperada: string | null
  plantilla: Plantilla
  // Se puede enviar: la forma pasa y hay cambios.
  puedeGuardar: boolean
  // Lo escrito ya está en la base (o se descarta al recargar): borra el borrador de la pestaña.
  limpiarBorrador: () => void
}

type Pendiente = { desde: number }

// El envío de la plantilla de la tarjeta (4.19-3b): un envío a la vez; el PT409 como conflicto, que se va **al llegar** la versión nueva y no al pulsar «Recargar»; sin
// conexión, lo escrito queda y sale solo al volver (guardar con la misma esperada es seguro: si ya había entrado dirá PT409). Los campos se apagan al entrar, hasta que
// la pestaña monta un editor nuevo con la versión nueva.
export function useGuardarLaPlantilla({
  origenId,
  esperada,
  plantilla,
  puedeGuardar,
  limpiarBorrador,
}: Args) {
  const router = useRouter()
  const [aviso, setAviso] = useState<string | null>(null)
  const [porCampo, setPorCampo] = useState<Record<string, string>>({})
  const [conflicto, setConflicto] = useConflictoHastaLaVersion(esperada)
  const [pendiente, setPendiente] = useState<Pendiente | null>(null)
  const [entro, setEntro] = useState(false)
  const [refrescando, refrescar] = useTransition()
  const { mandar, enCurso } = useUnEnvioALaVez()

  async function enviar(): Promise<boolean> {
    if (conflicto !== null || !puedeGuardar) return false
    setAviso(null)
    setPorCampo({})
    const envio = await mandar(() =>
      enviarAccion(
        guardarBorrador({ origenId, esperada, definicion: plantilla }),
        'No pudimos guardar la tarjeta. Revisa lo escrito.',
      ),
    )
    if (envio === null) return false
    if (envio.ok) {
      setPendiente(null)
      setEntro(true)
      limpiarBorrador()
      avisarExito('Se guardó el borrador.')
      refrescar(() => {
        router.refresh()
      })
      return true
    }
    if ('sinRed' in envio) {
      setPendiente((antes) => antes ?? { desde: Date.now() })
      return false
    }
    setPendiente(null)
    if (envio.error.codigo === 'conflicto') setConflicto(envio.error.mensaje)
    else {
      setAviso(envio.error.mensaje)
      setPorCampo(envio.porCampo ?? {})
    }
    return false
  }

  const enLinea = useReintentoAlVolver(pendiente, () => enviar())

  return {
    enviar,
    enCurso,
    entro,
    conflicto,
    aviso,
    porCampo,
    enLinea,
    esperandoConexion: pendiente !== null,
    recargando: refrescando,
    // El motivo de un campo se va al editarlo.
    olvidarCampo: (donde: string) => {
      setPorCampo((antes) => Object.fromEntries(Object.entries(antes).filter(([k]) => k !== donde)))
    },
    reintentar: () => {
      void enviar()
    },
    // La versión nueva llega con la pestaña; lo escrito se descarta (el aviso lo dice).
    recargar: () => {
      limpiarBorrador()
      refrescar(() => {
        router.refresh()
      })
    },
  }
}

export type GuardarLaPlantilla = ReturnType<typeof useGuardarLaPlantilla>
