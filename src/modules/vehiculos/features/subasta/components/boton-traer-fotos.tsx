'use client'

import { useState } from 'react'
import { Button } from '@/shared/ui/button'
import type { FotoDeSubasta } from '../../../entities/subasta-fotos'
import { useFotosDeSubasta } from '../hooks/use-fotos-de-subasta'

type Props = {
  vehiculoId: string
  origenId: string
  // Las que la respuesta guardada tiene y el vehículo todavía no.
  fotas: readonly FotoDeSubasta[]
  // El vehículo no tiene ninguna foto: la primera queda de portada.
  sinFotos: boolean
}

// «Traer las fotos que faltan» de la subasta: reintenta sólo esas. Es seguro repetirlo: el mismo
// archivo da el mismo hash y registrar es idempotente.
export function BotonTraerFotos({ vehiculoId, origenId, fotas, sinFotos }: Props) {
  const { traer } = useFotosDeSubasta(origenId)
  const [trabajando, setTrabajando] = useState(false)
  async function alTocar() {
    setTrabajando(true)
    try {
      await traer({ vehiculoId, fotas, sinFotos })
    } finally {
      setTrabajando(false)
    }
  }
  return (
    <Button
      type="button"
      variant="outline"
      disabled={trabajando}
      onClick={() => void alTocar()}
      className="min-h-11 md:min-h-8"
    >
      {trabajando
        ? 'Trayendo fotos…'
        : fotas.length === 1
          ? 'Traer la foto que falta'
          : `Traer las ${String(fotas.length)} fotos que faltan`}
    </Button>
  )
}
