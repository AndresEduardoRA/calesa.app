'use client'

import { useRouter } from 'next/navigation'
import { EstadoError } from '@/shared/ui/estados/estado-error'

// Una lectura de comprobantes que falló en el servidor (la sección de la guardada, la serie de Empresa, 4.26): el error con «Reintentar», que vuelve a pedir la
// página. Nunca una sección en blanco.
export function ErrorDeLectura({ titulo }: { titulo: string }) {
  const router = useRouter()
  return (
    <EstadoError
      titulo={titulo}
      alReintentar={() => {
        router.refresh()
      }}
    />
  )
}
