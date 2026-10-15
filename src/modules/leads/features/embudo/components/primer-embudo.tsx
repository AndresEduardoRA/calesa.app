'use client'

import { useAction } from 'next-safe-action/hooks'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { enviarAccion } from '@/shared/lib/enviar-accion'
import { EstadoError } from '@/shared/ui/estados'
import { MENSAJE_DE_VALIDACION } from '../../ficha/resultado'
import { embudoPorDefecto } from '../actions/embudo-por-defecto'
import { EsqueletoDeTablero } from './esqueleto-de-tablero'

// La primera vez que la persona abre la vista no tiene embudos: se crea el de por defecto (idempotente:
// dos pestañas a la vez terminan con el mismo) y se vuelve a leer. Mientras tanto, el esqueleto.
export function PrimerEmbudo() {
  const router = useRouter()
  const crear = useAction(embudoPorDefecto)
  const [error, setError] = useState<string | null>(null)
  const pedido = useRef(false)

  async function pedir() {
    setError(null)
    const envio = await enviarAccion(crear.executeAsync(), MENSAJE_DE_VALIDACION)
    if (!envio.ok) {
      setError(envio.error.mensaje)
      return
    }
    router.refresh()
  }

  useEffect(() => {
    if (!pedido.current) {
      pedido.current = true
      void pedir()
    }
  })

  return error ? (
    <EstadoError
      titulo="No pudimos preparar tu embudo"
      descripcion={error}
      alReintentar={() => void pedir()}
    />
  ) : (
    <EsqueletoDeTablero />
  )
}
