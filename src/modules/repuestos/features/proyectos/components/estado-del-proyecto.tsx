import { Badge } from '@/shared/ui/badge'
import { ETIQUETA_DEL_ESTADO, type EstadoDelProyecto } from '../../../entities/proyectos/estado'

const VARIANTE: Record<EstadoDelProyecto, 'secondary' | 'outline' | 'ghost'> = {
  en_curso: 'secondary',
  completo: 'outline',
  sin_items: 'outline',
  cerrado: 'ghost',
}

// El estado derivado de un proyecto (8.09-1, C1): texto y tono, nunca sólo color. «Completo» y «Sin ítems» son neutros: no son éxito ni error.
export function EstadoDelProyecto({ estado }: { estado: EstadoDelProyecto }) {
  return <Badge variant={VARIANTE[estado]}>{ETIQUETA_DEL_ESTADO[estado]}</Badge>
}
