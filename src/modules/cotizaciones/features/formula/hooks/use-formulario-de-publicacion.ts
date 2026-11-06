'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import type { Envio } from '@/shared/lib/enviar-accion'
import type { FormularioDelModal } from '@/shared/ui/modal-de-formulario'
import { useConflictoHastaLaVersion } from '@/shared/ui/use-conflicto-hasta-la-version'
import { useReintentoAlVolver } from '@/shared/ui/use-reintento-al-volver'
import { useUnEnvioALaVez } from '@/shared/ui/use-un-envio-a-la-vez'
import { esquemaDeNota } from '../../../entities/formula/publicacion'

type Args = {
  // Cerrado (se canceló o se fue con «atrás»), lo que esperaba la red no sale.
  abierto: boolean
  // La nota con la que abre (revertir la trae escrita): no cuenta como cambio.
  notaInicial: string
  // La publicada que la pestaña leyó: la versión del formulario. Un conflicto se va cuando llega otra.
  esperada: string | null
  // El pedido, con la nota ya recortada: una action sobre `enviarAccion()`.
  pedir: (nota: string) => Promise<Envio<string>>
  // Entró: avisar y cerrar.
  alGuardar: (id: string) => void
}

type Pendiente = { desde: number }

export type FormularioDePublicacion = FormularioDelModal & {
  nota: string
  motivoDeNota: string | null
  // Ya entró: lo que cambie mientras el modal se va no se dice.
  guardado: boolean
  escribir: (valor: string) => void
  recargar: () => void
}

// El formulario de un modal que publica una versión de la fórmula (publicar el borrador, revertir): la nota, validada antes de pedir; un envío a la vez; el PT409 de la
// base como conflicto, que espera la publicada nueva (la trae «Recargar») y **conserva la nota**; sin conexión, la nota queda y sale sola al volver. Es propio porque
// `useEnvioDeModal` no da conflicto.
export function useFormularioDePublicacion({
  abierto,
  notaInicial,
  esperada,
  pedir,
  alGuardar,
}: Args): FormularioDePublicacion {
  const router = useRouter()
  const [nota, setNota] = useState(notaInicial)
  const [motivoDeNota, setMotivoDeNota] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const [conflicto, setConflicto] = useConflictoHastaLaVersion(esperada)
  const [pendiente, setPendiente] = useState<Pendiente | null>(null)
  const [guardado, setGuardado] = useState(false)
  const [recargando, recargarPagina] = useTransition()
  const { mandar, enCurso } = useUnEnvioALaVez()

  async function enviar(): Promise<boolean> {
    if (conflicto !== null) {
      return false
    }
    const leida = esquemaDeNota.safeParse(nota)
    if (!leida.success) {
      setMotivoDeNota(leida.error.issues[0]?.message ?? null)
      return false
    }
    setAviso(null)
    const envio = await mandar(() => pedir(leida.data))
    if (envio === null) {
      return false
    }
    if (envio.ok) {
      setPendiente(null)
      setGuardado(true)
      alGuardar(envio.data)
      return true
    }
    if ('sinRed' in envio) {
      setPendiente((antes) => antes ?? { desde: Date.now() })
      return false
    }
    setPendiente(null)
    if (envio.error.codigo === 'conflicto') {
      setConflicto(envio.error.mensaje)
    } else {
      setAviso(envio.error.mensaje)
    }
    return false
  }

  const enLinea = useReintentoAlVolver(abierto ? pendiente : null, () => enviar())

  return {
    nota,
    motivoDeNota,
    guardado,
    enCurso,
    hayCambios: nota.trim() !== notaInicial.trim(),
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
    // La publicada nueva llega con la pestaña; la nota se conserva.
    recargar: () => {
      recargarPagina(() => {
        router.refresh()
      })
    },
  }
}
