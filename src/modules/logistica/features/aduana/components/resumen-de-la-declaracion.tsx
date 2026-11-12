'use client'

import { formatearFecha } from '@/shared/lib/fechas'
import { Badge } from '@/shared/ui/badge'
import { useRegional } from '@/shared/ui/regional'
import { textoDelCanal, type DeclaracionLeida } from '../../../entities/aduana/declaracion'
import { EstadoDeTributos } from './estado-de-tributos'

type Props = { declaracion: DeclaracionLeida }

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

// El resumen de una declaración: su número y canal, los datos, si está pagada y los vehículos con su tributo dicho en texto («Tiene el tributo» / «Falta el tributo»). Sólo muestra: en
// 6.09-1 no hay botones de escritura. Ningún monto: la aduana sólo dice sí o no por unidad.
export function ResumenDeLaDeclaracion({ declaracion }: Props) {
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
      <section aria-labelledby="vehiculos-de-la-declaracion" className="grid min-w-0 gap-2">
        <h3
          id="vehiculos-de-la-declaracion"
          className="text-(length:--text-base) font-medium text-(--color-ink)"
        >
          Vehículos de la declaración
        </h3>
        {declaracion.vehiculos.length === 0 ? (
          <p className="text-(length:--text-sm) text-(--color-ink-soft)">
            {declaracion.hayOcultos ? 'No ves ninguno de sus vehículos.' : 'Sin vehículos.'}
          </p>
        ) : (
          <ul className="grid grid-cols-[minmax(0,1fr)] gap-2">
            {declaracion.vehiculos.map((vehiculo) => (
              <li
                key={vehiculo.vehiculoId}
                className="flex min-w-0 flex-wrap items-baseline justify-between gap-x-3 gap-y-1 rounded-(--radius-card) border border-(--color-line) px-3 py-2"
              >
                <span className="min-w-0 font-medium [overflow-wrap:anywhere] text-(--color-ink)">
                  {vehiculo.titulo}
                </span>
                <span className="flex flex-wrap items-center gap-2 text-(length:--text-sm) text-(--color-ink-soft)">
                  {vehiculo.fase ? <span>{vehiculo.fase}</span> : null}
                  <Badge variant={vehiculo.tributo ? 'secondary' : 'outline'}>
                    {vehiculo.tributo ? 'Tiene el tributo' : 'Falta el tributo'}
                  </Badge>
                </span>
              </li>
            ))}
          </ul>
        )}
        {declaracion.hayMas ? (
          <p className="text-(length:--text-sm) text-(--color-ink-soft)">
            Hay más vehículos de los que se muestran.
          </p>
        ) : null}
        {declaracion.hayOcultos && declaracion.vehiculos.length > 0 ? (
          <p className="text-(length:--text-sm) text-(--color-ink-soft)">
            Hay vehículos que no ves.
          </p>
        ) : null}
      </section>
    </div>
  )
}
