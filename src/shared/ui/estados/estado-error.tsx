'use client'

import { CloudAlertIcon } from 'lucide-react'
import { Button } from '../button'
import { MarcoEstado } from './marco-estado'

type Props = {
  alReintentar: () => void
  titulo?: string
  descripcion?: string
}

// Falló cargar. Siempre con «Reintentar»: nunca una pantalla en blanco ni un error sin salida.
export function EstadoError({ alReintentar, titulo, descripcion }: Props) {
  return (
    <MarcoEstado
      Icono={CloudAlertIcon}
      titulo={titulo ?? 'No se pudo cargar'}
      descripcion={descripcion ?? 'Puede ser la conexión o un problema de nuestro lado.'}
      accion={
        <Button variant="outline" onClick={alReintentar}>
          Reintentar
        </Button>
      }
    />
  )
}
