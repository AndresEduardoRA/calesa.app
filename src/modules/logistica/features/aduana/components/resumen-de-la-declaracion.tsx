'use client'

import { formatearFecha } from '@/shared/lib/fechas'
import { Badge } from '@/shared/ui/badge'
import { useRegional } from '@/shared/ui/regional'
import { textoDelCanal, type DeclaracionLeida } from '../../../entities/aduana/declaracion'
import { AccionesDeLaDeclaracion } from './acciones-de-la-declaracion'
import { EstadoDeTributos } from './estado-de-tributos'
import { VehiculosDeLaDeclaracion } from './vehiculos-de-la-declaracion'
import { VehiculosDelResumen } from './vehiculos-del-resumen'

type Props = {
  declaracion: DeclaracionLeida
  // Con `logistica.aduana.gestionar` (la base lo vuelve a exigir): enciende los botones de escribir.
  puedeGestionar: boolean
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string | null }) {
  return (
    <div className="grid min-w-0 gap-0.5">
      <dt className="text-(length:--text-xs) text-(--color-ink-soft)">{etiqueta}</dt>
      <dd className="text-(length:--text-base) [overflow-wrap:anywhere] text-(--color-ink)">
        {valor ?? <span className="text-(--color-ink-faint)">—</span>}
      </dd>
    </div>
  )
}

// El resumen de una declaración: su número y canal, los datos, si está pagada y los vehículos con su tributo dicho en texto («Tiene el tributo» / «Falta el tributo»). Con
// `logistica.aduana.gestionar` ofrece «Editar» y «Asignar canal». Ningún monto: la aduana sólo dice sí o no por unidad.
export function ResumenDeLaDeclaracion({ declaracion, puedeGestionar }: Props) {
  const { zonaHoraria } = useRegional()
  const dia = (valor: string | null) =>
    valor === null ? null : formatearFecha(valor, { zona: zonaHoraria })
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-5">
      <header className="grid min-w-0 gap-2">
        <h2 className="text-(length:--text-xl) font-semibold [overflow-wrap:anywhere] text-(--color-ink)">
          Declaración {declaracion.numero}
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{textoDelCanal(declaracion.canal)}</Badge>
          <EstadoDeTributos
            venceTributosEl={declaracion.venceTributosEl}
            pagada={declaracion.pagada}
            faltan={declaracion.faltan}
            vehiculos={declaracion.vehiculos.length}
            hayOcultos={declaracion.hayOcultos}
          />
        </div>
        {puedeGestionar ? <AccionesDeLaDeclaracion declaracion={declaracion} /> : null}
      </header>
      <dl className="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2">
        <Dato etiqueta="Aceptada el" valor={dia(declaracion.aceptadaEl)} />
        <Dato etiqueta="Vencen los tributos el" valor={dia(declaracion.venceTributosEl)} />
        <Dato etiqueta="Despachante" valor={declaracion.despachante} />
        <Dato etiqueta="Depósito" valor={declaracion.deposito} />
        <div className="sm:col-span-2">
          <Dato etiqueta="Notas" valor={declaracion.notas} />
        </div>
      </dl>
      {puedeGestionar ? (
        <VehiculosDeLaDeclaracion declaracion={declaracion} />
      ) : (
        <VehiculosDelResumen declaracion={declaracion} />
      )}
    </div>
  )
}
