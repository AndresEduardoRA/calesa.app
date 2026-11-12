import { SearchIcon } from 'lucide-react'
import { CommandGroup, CommandItem } from '@/shared/ui/command'
import type { DestinoDeLaAccion } from '../../../entities/acciones-de-la-paleta'
import type { Abierto, Seccion, TipoDelBuscador } from '../../../entities/ranking'
import { rutaDeVerTodos } from '../../../entities/ruta-de-resultado'
import { FilaDeResultado } from './fila-de-resultado'

const TITULOS: Record<TipoDelBuscador, string> = {
  lead: 'Leads',
  vehiculo: 'Vehículos',
  cotizacion: 'Cotizaciones',
}

// El tipo de cada fila viaja con ella: `Abierto` es la unión que la fila sabe dibujar.
function filasDe(seccion: Seccion): Abierto[] {
  switch (seccion.tipo) {
    case 'lead':
      return seccion.filas.map((fila) => ({ tipo: 'lead', fila }))
    case 'vehiculo':
      return seccion.filas.map((fila) => ({ tipo: 'vehiculo', fila }))
    case 'cotizacion':
      return seccion.filas.map((fila) => ({ tipo: 'cotizacion', fila }))
  }
}

type Props = {
  secciones: readonly Seccion[]
  // El texto interpretado que va a `/leads?q=`; con `null` no hay «Ver todos».
  textoDeVerTodos: string | null
  alElegir: (destino: DestinoDeLaAccion) => void
}

// Una sección por tipo, en el orden que dio `agruparResultados`. «Ver todos en Leads» es el camino al listado entero y sólo sale si la sección trae filas (D6).
export function ListaDeResultados({ secciones, textoDeVerTodos, alElegir }: Props) {
  return secciones.map((seccion) => (
    <CommandGroup key={seccion.tipo} heading={TITULOS[seccion.tipo]}>
      {filasDe(seccion).map((abierto) => (
        <FilaDeResultado key={abierto.fila.id} abierto={abierto} alElegir={alElegir} />
      ))}
      {seccion.tipo === 'lead' && textoDeVerTodos !== null && (
        <CommandItem
          value="ver-todos:leads"
          onSelect={() => {
            alElegir({ tipo: 'ruta', ruta: rutaDeVerTodos(textoDeVerTodos) })
          }}
        >
          <SearchIcon aria-hidden className="text-(--color-ink-soft)" />
          Ver todos en Leads
        </CommandItem>
      )}
    </CommandGroup>
  ))
}
