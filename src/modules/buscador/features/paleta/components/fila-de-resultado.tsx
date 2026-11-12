import { CarFrontIcon, FileTextIcon, UserIcon, type LucideIcon } from 'lucide-react'
import { CommandItem } from '@/shared/ui/command'
import type { Abierto, TipoDelBuscador } from '../../../entities/ranking'
import { rutaDeLaFicha } from '../../../entities/ruta-de-resultado'
import type { DestinoDeLaAccion } from '../../../entities/acciones-de-la-paleta'

const ICONOS: Record<TipoDelBuscador, LucideIcon> = {
  lead: UserIcon,
  vehiculo: CarFrontIcon,
  cotizacion: FileTextIcon,
}

// El título y una segunda línea corta. Nunca teléfono, estado crudo ni monto: la fila no los recibe (`entities/resultados.ts`).
function textosDe(abierto: Abierto): { titulo: string; detalle: string | null } {
  switch (abierto.tipo) {
    case 'lead': {
      const { nombre, numero_visible: numero } = abierto.fila
      return {
        titulo: nombre !== null && nombre.trim() !== '' ? nombre : 'Lead sin nombre',
        detalle: numero === null ? null : `Lead n.º ${String(numero)}`,
      }
    }
    case 'vehiculo': {
      const { titulo, vin, lote } = abierto.fila
      return {
        titulo,
        detalle: vin !== null ? `VIN ${vin}` : lote !== null ? `Lote ${lote}` : null,
      }
    }
    case 'cotizacion': {
      const { titulo, numero } = abierto.fila
      const propio = `Cotización n.º ${String(numero)}`
      return titulo !== null && titulo.trim() !== ''
        ? { titulo, detalle: propio }
        : { titulo: propio, detalle: null }
    }
  }
}

type Props = {
  abierto: Abierto
  // Lo que pasa al elegirla: ir a su ficha. La fila no navega.
  alElegir: (destino: DestinoDeLaAccion) => void
}

export function FilaDeResultado({ abierto, alElegir }: Props) {
  const Icono = ICONOS[abierto.tipo]
  const { titulo, detalle } = textosDe(abierto)
  const ruta = rutaDeLaFicha(abierto.tipo, abierto.fila.id)
  return (
    <CommandItem
      value={`${abierto.tipo}:${abierto.fila.id}`}
      onSelect={() => {
        alElegir({ tipo: 'ruta', ruta })
      }}
    >
      <Icono aria-hidden className="text-(--color-ink-soft)" />
      <span className="flex min-w-0 flex-col">
        <span className="truncate">{titulo}</span>
        {detalle !== null && (
          <span className="truncate text-(length:--text-xs) text-(--color-ink-soft)">
            {detalle}
          </span>
        )}
      </span>
    </CommandItem>
  )
}
