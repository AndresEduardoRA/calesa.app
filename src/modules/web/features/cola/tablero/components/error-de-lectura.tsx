'use client'

import { useRouter } from 'next/navigation'
import { EstadoError } from '@/shared/ui/estados'

// Una parte del tablero que no se pudo leer: su error con «Reintentar», sin tapar las otras partes que sí llegaron.
export function ErrorDeLectura({ titulo, mensaje }: { titulo: string; mensaje: string }) {
  const router = useRouter()
  return (
    <EstadoError
      compacto
      titulo={titulo}
      descripcion={mensaje}
      alReintentar={() => {
        router.refresh()
      }}
    />
  )
}
