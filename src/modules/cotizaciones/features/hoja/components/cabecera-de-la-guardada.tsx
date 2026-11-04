'use client'

import { formatearFecha } from '@/shared/lib/fechas'
import { Badge } from '@/shared/ui/badge'
import { useRegional } from '@/shared/ui/regional'
import { ETIQUETA_DE_CLASE } from '../../../entities/historial-del-vehiculo'

type Props = {
  numero: number
  clase: keyof typeof ETIQUETA_DE_CLASE
  // El último día en que vale, `YYYY-MM-DD` de la zona de la empresa, y si ya pasó.
  venceEl: string
  vencida: boolean
  origen: string
  // Lo que quien mira ve del cliente y del vehículo: el que no se ve no se nombra.
  cliente: string | null
  vehiculo: string | null
}

// La cabecera de una cotización guardada: «Cotización n.º N», su clase, hasta cuándo vale (o «Vencida») y de qué origen, cliente y vehículo es. El número es un identificador:
// va sin separador de miles. La fecha se muestra en la zona de la empresa.
export function CabeceraDeLaGuardada({
  numero,
  clase,
  venceEl,
  vencida,
  origen,
  cliente,
  vehiculo,
}: Props) {
  const { zonaHoraria } = useRegional()
  return (
    <header data-cabecera-de-la-guardada="" className="grid min-w-0 gap-2">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <h1 className="text-(length:--text-xl) font-semibold text-(--color-ink)">
          Cotización n.º {String(numero)}
        </h1>
        <Badge variant="secondary">{ETIQUETA_DE_CLASE[clase]}</Badge>
        {vencida ? (
          <Badge variant="destructive">Vencida</Badge>
        ) : (
          <span className="text-(length:--text-sm) text-(--color-ink-soft)">
            Vale hasta el {formatearFecha(venceEl, { zona: zonaHoraria })}
          </span>
        )}
      </div>
      <p className="flex flex-wrap gap-x-4 gap-y-1 text-(length:--text-sm) [overflow-wrap:anywhere] text-(--color-ink-soft)">
        <span>{origen}</span>
        {cliente === null ? null : <span>Cliente: {cliente}</span>}
        {vehiculo === null ? null : <span>Vehículo: {vehiculo}</span>}
      </p>
    </header>
  )
}
