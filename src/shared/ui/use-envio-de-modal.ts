'use client'

import { useState } from 'react'
import type { ErrorApp } from '@/shared/lib/errores'
import type { Envio } from '@/shared/lib/enviar-accion'
import type { FormularioDelModal } from './modal-de-formulario'
import { useReintentoAlVolver } from './use-reintento-al-volver'
import { useUnEnvioALaVez } from './use-un-envio-a-la-vez'

type Args<Dato> = {
  // El modal sigue a la vista: cerrado, lo que esperaba la red no sale.
  abierto: boolean
  // Si cerrar ahora perdería algo escrito.
  hayCambios: boolean
  // Los motivos junto a cada campo (por su clave en el formulario), o nulo si todo pasa. Corre antes de pedir nada.
  validar: () => Record<string, string> | null
  // El pedido al servidor: una action sobre `enviarAccion()`.
  pedir: () => Promise<Envio<Dato>>
  // Lo que pasa al guardar (avisar, cerrar, elegir lo creado).
  alGuardar: (dato: Dato) => void
  // Un rechazo del servidor que pertenece a un campo: su clave. Sin clave, el rechazo se dice arriba del formulario.
  campoDelRechazo?: (error: ErrorApp) => string | null
}

// El envío de un formulario sin versión que se abre en un modal (nuevo rol, invitar, nuevo embudo): valida, manda de a un pedido, dice
// el rechazo junto al campo o arriba y, si el pedido no llegó al servidor, deja lo escrito y lo manda solo al volver la conexión.
// Devuelve lo que `ModalDeFormulario` necesita (`FormularioDelModal`) más los motivos de cada campo. Los formularios con versión (un
// conflicto con «Recargar») tienen su propio hook.
export function useEnvioDeModal<Dato>({
  abierto,
  hayCambios,
  validar,
  pedir,
  alGuardar,
  campoDelRechazo,
}: Args<Dato>): FormularioDelModal & {
  errores: Record<string, string>
  quitarMotivo: (clave: string) => void
} {
  const [errores, setErrores] = useState<Record<string, string>>({})
  const [aviso, setAviso] = useState<string | null>(null)
  const [pendiente, setPendiente] = useState<{ desde: number } | null>(null)
  const { mandar, enCurso } = useUnEnvioALaVez()

  async function enviar(): Promise<boolean> {
    const motivos = validar()
    if (motivos) {
      setErrores(motivos)
      setAviso(null)
      return false
    }
    const envio = await mandar(pedir)
    if (envio === null) {
      return false
    }
    if (envio.ok) {
      setPendiente(null)
      setErrores({})
      setAviso(null)
      alGuardar(envio.data)
      return true
    }
    if ('sinRed' in envio) {
      setPendiente((antes) => antes ?? { desde: Date.now() })
      return false
    }
    setPendiente(null)
    const campo = campoDelRechazo?.(envio.error) ?? null
    if (campo) {
      setErrores({ [campo]: envio.error.mensaje })
      setAviso(null)
    } else {
      const porCampo = 'porCampo' in envio ? envio.porCampo : undefined
      setErrores(porCampo ?? {})
      setAviso(porCampo ? null : envio.error.mensaje)
    }
    return false
  }

  const enLinea = useReintentoAlVolver(abierto ? pendiente : null, () => enviar())

  return {
    enCurso,
    hayCambios,
    conflicto: null,
    aviso,
    enLinea,
    esperandoConexion: pendiente !== null,
    enviar,
    reintentar: () => {
      void enviar()
    },
    errores,
    quitarMotivo: (clave) => {
      setErrores(({ [clave]: _resuelto, ...resto }) => resto)
    },
  }
}
