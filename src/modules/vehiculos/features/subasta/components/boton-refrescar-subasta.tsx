'use client'

import { RefreshCwIcon } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { useRefrescoDeSubasta } from '../hooks/use-refresco-de-subasta'

type Props = {
  vehiculoId: string
  origenId: string
  entrada: string
  actualizadoEn: string
  puedeConfigurar: boolean
}

// «Refrescar»: vuelve a preguntar por la subasta de este vehículo. Sólo se dibuja cuando se puede
// (apibara encendida, permiso de editar y algo con qué preguntar): lo decide quien lo pone.
export function BotonRefrescarSubasta(props: Props) {
  const { refrescar, enCurso } = useRefrescoDeSubasta(props)
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={enCurso}
      onClick={() => void refrescar()}
      className="min-h-11 md:min-h-8"
    >
      <RefreshCwIcon
        aria-hidden
        className={enCurso ? 'animate-spin motion-reduce:animate-none' : undefined}
      />
      {enCurso ? 'Consultando…' : 'Refrescar'}
    </Button>
  )
}
