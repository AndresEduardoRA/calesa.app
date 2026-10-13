'use client'

import { MenuDeVistas, type VistaGuardada } from '@/modules/equipo/client'
import { parametrosDeFiltros, type EsquemaDeFiltros } from '@/shared/lib/filtros'
import { useFiltrosDelListado } from '@/shared/ui/filtros'

type Props = {
  esquema: EsquemaDeFiltros
  origenId: string
  vistas: readonly VistaGuardada[]
}

// Las vistas guardadas del inventario. Una vista lleva su origen: los filtros salen del layout de
// ese origen, así que aplicarla también cambia de pestaña.
export function VistasDeVehiculos({ esquema, origenId, vistas }: Props) {
  const filtros = useFiltrosDelListado()
  return (
    <MenuDeVistas
      pantalla="vehiculos"
      vistas={vistas}
      actuales={{ origen: origenId, ...parametrosDeFiltros(esquema, filtros.valores) }}
      puedeGuardar={filtros.hayFiltros}
    />
  )
}
