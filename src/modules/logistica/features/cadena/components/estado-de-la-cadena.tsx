'use client'

import { useRouter } from 'next/navigation'
import { EstadoError, EstadoVacio } from '@/shared/ui/estados'

type Props = {
  // `sin_origenes`: la persona ve la logística pero ningún origen la tiene encendida. `error`: no se pudo leer (la lista de orígenes o la cadena).
  tipo: 'sin_origenes' | 'error'
}

// Los estados de la pantalla que no dependen de los filtros: sin orígenes con la logística encendida (sin enlace: no hay nada que la persona pueda hacer aquí) y el error con «Reintentar».
export function EstadoDeLaCadena({ tipo }: Props) {
  const router = useRouter()
  if (tipo === 'sin_origenes') {
    return <EstadoVacio compacto titulo="Ningún origen tiene la logística encendida." />
  }
  return (
    <EstadoError
      titulo="No se pudo cargar la cadena"
      alReintentar={() => {
        router.refresh()
      }}
    />
  )
}
