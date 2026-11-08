'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import type { Envio } from '@/shared/lib/enviar-accion'
import type { FormularioDelModal } from '@/shared/ui/modal-de-formulario'
import { useConflictoHastaLaVersion } from '@/shared/ui/use-conflicto-hasta-la-version'
import { useReintentoAlVolver } from '@/shared/ui/use-reintento-al-volver'
import { useUnEnvioALaVez } from '@/shared/ui/use-un-envio-a-la-vez'
import { esquemaDeNotaDeTabla, type PublicacionDeTabla } from '../../../entities/tablas/publicacion'

// Una celda que la base rechazó (22023 con `hint` `filas.<i>.<clave>`): su mensaje tal cual.
export type CeldaRechazada = { camino: string; mensaje: string }

type Args = {
  // Cerrado (se canceló o se fue con «atrás»), lo que esperaba la red no sale.
  abierto: boolean
  // La versión de la tabla que se editó: un conflicto se va cuando llega otra.
  version: number
  // Por qué no se manda (sin cambios, una celda sin leer): nunca se publica un valor distinto del que se ve escrito.
  bloqueo: string | null
  // El pedido, con la nota ya recortada.
  pedir: (nota: string) => Promise<Envio<PublicacionDeTabla>>
  alPublicar: (publicacion: PublicacionDeTabla) => void
  // «Recargar» tras un conflicto: cierra el modal antes de leer la versión nueva.
  alRecargar: () => void
}

type Pendiente = { desde: number }

export type PublicacionDeTablaEnCurso = FormularioDelModal & {
  nota: string
  motivoDeNota: string | null
  celda: CeldaRechazada | null
  guardado: boolean
  escribir: (valor: string) => void
}

const celdaDe = (porCampo: Record<string, string> | undefined): CeldaRechazada | null => {
  const camino = Object.keys(porCampo ?? {}).find((clave) => clave.startsWith('filas'))
  return camino && porCampo?.[camino] ? { camino, mensaje: porCampo[camino] } : null
}

// El formulario de «Publicar» una tabla (4.23-3, C9): la nota validada antes de pedir, un envío a la vez, el PT409 como conflicto con «Recargar», el 22023 de la nota en
// su campo y el de una celda con su camino; sin conexión, la nota queda y sale sola al volver. Copia del de la fórmula (un área no importa otra), con la celda.
export function usePublicacionDeTabla(args: Args): PublicacionDeTablaEnCurso {
  const { abierto, version, bloqueo, pedir, alPublicar, alRecargar } = args
  const router = useRouter()
  const [nota, setNota] = useState('')
  const [motivoDeNota, setMotivoDeNota] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const [celda, setCelda] = useState<CeldaRechazada | null>(null)
  const [conflicto, setConflicto] = useConflictoHastaLaVersion(String(version))
  const [pendiente, setPendiente] = useState<Pendiente | null>(null)
  const [guardado, setGuardado] = useState(false)
  const [recargando, recargarPagina] = useTransition()
  const { mandar, enCurso } = useUnEnvioALaVez()

  function rechazo(envio: Exclude<Envio<PublicacionDeTabla>, { ok: true }>) {
    if ('sinRed' in envio) {
      setPendiente((antes) => antes ?? { desde: Date.now() })
      return
    }
    setPendiente(null)
    const deCelda = celdaDe(envio.porCampo)
    if (envio.error.codigo === 'conflicto') setConflicto(envio.error.mensaje)
    else if (envio.porCampo?.['nota']) setMotivoDeNota(envio.porCampo['nota'])
    else if (deCelda) setCelda(deCelda)
    else setAviso(envio.error.mensaje)
  }

  async function enviar(): Promise<boolean> {
    if (conflicto !== null || bloqueo !== null) return false
    const leida = esquemaDeNotaDeTabla.safeParse(nota)
    if (!leida.success) {
      setMotivoDeNota(leida.error.issues[0]?.message ?? null)
      return false
    }
    setAviso(null)
    setCelda(null)
    const envio = await mandar(() => pedir(leida.data))
    if (envio === null) return false
    if (envio.ok) {
      setPendiente(null)
      setGuardado(true)
      alPublicar(envio.data)
      return true
    }
    rechazo(envio)
    return false
  }

  const enLinea = useReintentoAlVolver(abierto ? pendiente : null, () => enviar())

  return {
    nota,
    motivoDeNota,
    celda,
    guardado,
    enCurso,
    hayCambios: nota.trim() !== '',
    conflicto,
    aviso,
    enLinea,
    esperandoConexion: pendiente !== null,
    recargando,
    escribir: (valor) => {
      setNota(valor)
      setMotivoDeNota(null)
    },
    enviar,
    reintentar: () => {
      void enviar()
    },
    recargar: () => {
      recargarPagina(() => {
        alRecargar()
        router.refresh()
      })
    },
  }
}
