import { formatearFecha } from '@/shared/lib/fechas'
import { Badge } from '@/shared/ui/badge'
import { estadoDeGuia, type GuiaDeLista } from '../../../../entities/contenido/guias'

type Props = {
  publicadaEn: GuiaDeLista['publicadaEn']
  // El instante de la lectura (ISO): el estado se calcula después de la consulta, nunca antes.
  ahora: string
  zona: string
}

// El estado de una guía con palabras, nunca sólo color: «Borrador», «Programada para el …» o «Publicada el …».
export function EstadoDeLaGuia({ publicadaEn, ahora, zona }: Props) {
  const estado = estadoDeGuia(publicadaEn, new Date(ahora))
  if (estado === 'borrador' || publicadaEn === null) {
    return <Badge variant="outline">Borrador</Badge>
  }
  const fecha = formatearFecha(publicadaEn, { zona })
  return estado === 'programada' ? (
    <Badge variant="secondary">Programada para el {fecha}</Badge>
  ) : (
    <Badge>Publicada el {fecha}</Badge>
  )
}
