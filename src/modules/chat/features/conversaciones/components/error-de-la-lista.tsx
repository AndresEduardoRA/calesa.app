'use client'

import { EstadoError } from '@/shared/ui/estados'

// La lista no cargó: dice qué pasó y deja reintentar sin recargar la pantalla.
export function ErrorDeLaLista({ alReintentar }: { alReintentar: () => void }) {
  return (
    <EstadoError
      compacto
      alReintentar={alReintentar}
      titulo="No pudimos cargar tus conversaciones"
      descripcion="Puede ser la conexión o un problema de nuestro lado."
    />
  )
}
