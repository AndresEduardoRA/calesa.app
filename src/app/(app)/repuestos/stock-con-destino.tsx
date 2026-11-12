'use client'

import type { PaginaDeStock } from '@/modules/repuestos'
import { VistaDeStock } from '@/modules/repuestos/pantallas/stock-vista'
import { BuscadorDeProyectoDestino } from './buscador-de-proyecto-destino'

type Props = { pagina: PaginaDeStock; puedeEditar: boolean }

// La vista «Stock» con su campo «Proyecto destino» (8.10-3, D2): la compone `src/app` porque el área `stock` no importa `proyectos`.
export function StockConDestino({ pagina, puedeEditar }: Props) {
  return (
    <VistaDeStock
      pagina={pagina}
      puedeEditar={puedeEditar}
      campoDeProyecto={(props) => <BuscadorDeProyectoDestino {...props} />}
    />
  )
}
