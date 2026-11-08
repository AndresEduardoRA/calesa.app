'use client'

import type { Route } from 'next'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { formatearFecha } from '@/shared/lib/fechas'
import { Badge } from '@/shared/ui/badge'
import { useRegional } from '@/shared/ui/regional'
import type { CadenaDeLaCotizacion } from '../../../entities/hoja-de-una-guardada'
import { ETIQUETA_DE_CLASE } from '../../../entities/historial-del-vehiculo'
import { rutaDeLaCotizacion } from '../../../entities/ruta-de-la-hoja'
import { RevisionesDeLaCotizacion } from '../../revisiones/components/revisiones-de-la-cotizacion'

type Props = {
  id: string
  numero: number
  clase: keyof typeof ETIQUETA_DE_CLASE
  // Su `actualizadoEn` (el texto de la base): las revisiones leídas son de una versión de la fila.
  actualizadoEn: string
  // Su versión en la cadena (1, 2…) y lo que quien mira ve de ella: la anterior y la versión nueva (P4, P11).
  version: number
  cadena: CadenaDeLaCotizacion
  // El último día en que vale, `YYYY-MM-DD` de la zona de la empresa, y si ya pasó.
  venceEl: string
  vencida: boolean
  origen: string
  // Lo que quien mira ve del cliente y del vehículo: el que no se ve no se nombra.
  cliente: string | null
  vehiculo: string | null
  // Lo que un área suma en la fila del título, después de «Revisiones» (4.15-6b): sus botones, ya dibujados por la página.
  acciones?: ReactNode
  // Lo que un área suma después de la clase y de la vigencia (4.27-4): sus insignias, ya dibujadas por la página.
  insignias?: ReactNode
}

// La cabecera de una cotización guardada: «Cotización n.º N», su clase, hasta cuándo vale (o «Vencida») y de qué origen, cliente y vehículo es. El número es un identificador:
// va sin separador de miles. La fecha se muestra en la zona de la empresa.
export function CabeceraDeLaGuardada({
  id,
  numero,
  clase,
  actualizadoEn,
  version,
  cadena,
  venceEl,
  vencida,
  origen,
  cliente,
  vehiculo,
  acciones,
  insignias,
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
        {insignias}
        <div className="ml-auto">
          <RevisionesDeLaCotizacion cotizacionId={id} numero={numero} version={actualizadoEn} />
        </div>
        {acciones}
      </div>
      <CadenaDeVersiones version={version} cadena={cadena} />
      <p className="flex flex-wrap gap-x-4 gap-y-1 text-(length:--text-sm) [overflow-wrap:anywhere] text-(--color-ink-soft)">
        <span>{origen}</span>
        {cliente === null ? null : <span>Cliente: {cliente}</span>}
        {vehiculo === null ? null : <span>Vehículo: {vehiculo}</span>}
      </p>
    </header>
  )
}

const ENLACE = 'underline-offset-2 hover:underline'

// Dónde está esta cotización en su cadena (cotizar encima): de cuál viene y si ya tiene una versión nueva. Quien no ve la anterior ve «Versión N» sin enlace; quien no ve la nueva,
// que existe. Sin anterior, en la versión 1 y sin nueva, no hay nada que decir.
function CadenaDeVersiones({ version, cadena }: { version: number; cadena: CadenaDeLaCotizacion }) {
  const { anterior, encima } = cadena
  if (anterior === null && version === 1 && encima === null) {
    return null
  }
  return (
    <p className="flex flex-wrap gap-x-4 gap-y-1 text-(length:--text-sm) [overflow-wrap:anywhere] text-(--color-ink-soft)">
      {anterior === null ? (
        version > 1 ? (
          <span>Versión {version}</span>
        ) : null
      ) : (
        <Link href={rutaDeLaCotizacion(anterior.id) as Route} className={ENLACE}>
          Versión {version} de la n.º {anterior.numero}
        </Link>
      )}
      {encima === null ? null : 'oculta' in encima ? (
        <span>Hay una versión nueva que no puedes ver.</span>
      ) : (
        <span>
          Hay una versión nueva:{' '}
          <Link href={rutaDeLaCotizacion(encima.id) as Route} className={ENLACE}>
            n.º {encima.numero} (versión {encima.version})
          </Link>
          .
        </span>
      )}
    </p>
  )
}
