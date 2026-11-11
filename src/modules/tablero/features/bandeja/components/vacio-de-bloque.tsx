import { EstadoVacio } from '@/shared/ui/estados'
import type { BloqueBandeja } from '../../../entities/bandeja'

// El vacío de un bloque: nada pendiente, con la frase que dice qué aparece acá.
export function VacioDeBloque({ bloque }: { bloque: BloqueBandeja }) {
  return <EstadoVacio compacto titulo="Nada pendiente" descripcion={bloque.vacio} />
}
