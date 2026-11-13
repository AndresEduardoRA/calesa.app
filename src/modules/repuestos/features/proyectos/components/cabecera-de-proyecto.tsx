import type { Route } from 'next'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { RUTAS } from '@/shared/lib/rutas'
import type { ProyectoDetallado } from '../../../entities/proyectos/detalle'
import type { EstadoDelProyecto as Estado } from '../../../entities/proyectos/estado'
import { BotonDeCierre } from './boton-de-cierre'
import { BotonDeEliminarProyecto } from './boton-de-eliminar-proyecto'
import { EstadoDelProyecto } from './estado-del-proyecto'

type Props = {
  proyecto: ProyectoDetallado
  // El título del vehículo si es de un vehículo y se ve; nulo = «no puedes verlo» (como el listado).
  tituloDelVehiculo: string | null
  estado: Estado
  puedeEditar: boolean
  // La hoja no tiene ítems vivos: sólo así se ofrece eliminar el proyecto (8.09-4).
  sinItems?: boolean
  // Lo que va debajo de la cabecera (las pestañas o la hoja).
  children?: ReactNode
}

function Dato({ etiqueta, children }: { etiqueta: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-(length:--text-xs) text-(--color-ink-soft)">{etiqueta}</dt>
      <dd className="[overflow-wrap:anywhere]">{children}</dd>
    </div>
  )
}

// La cabecera de `/repuestos/[id]` (8.09-2, C5): el número, el vehículo (con enlace si se ve) o «Externo», el cliente, las notas, el estado derivado y, con `repuestos.editar`, cerrar o reabrir (y eliminar, si la hoja no tiene ítems).
// En el celular se apila y el botón ocupa el ancho. No muestra el teléfono ni el lead del cliente (D50).
export function CabeceraDeProyecto({
  proyecto,
  tituloDelVehiculo,
  estado,
  puedeEditar,
  sinItems = false,
  children,
}: Props) {
  const esDeVehiculo = proyecto.vehiculoId !== null
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="grid min-w-0 gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-(length:--text-xl) font-semibold tabular-nums">
              Proyecto #{proyecto.numero}
            </h1>
            <EstadoDelProyecto estado={estado} />
          </div>
          <dl className="grid gap-x-8 gap-y-2 text-(length:--text-sm) sm:grid-cols-2">
            <Dato etiqueta="Vehículo">
              {esDeVehiculo ? (
                tituloDelVehiculo === null ? (
                  'Vehículo que no puedes ver'
                ) : (
                  <Link
                    href={`${RUTAS.vehiculos}/${proyecto.vehiculoId ?? ''}` as Route}
                    className="inline-flex min-h-11 items-center underline underline-offset-2 md:min-h-0"
                  >
                    {tituloDelVehiculo}
                  </Link>
                )
              ) : (
                <>
                  Externo
                  {proyecto.vehiculoEtiqueta ? ` · ${proyecto.vehiculoEtiqueta}` : ''}
                  {proyecto.vin ? (
                    <span className="block text-(--color-ink-soft)">VIN {proyecto.vin}</span>
                  ) : null}
                </>
              )}
            </Dato>
            <Dato etiqueta="Cliente">
              {proyecto.clienteNombre ?? <span className="text-(--color-ink-faint)">—</span>}
            </Dato>
            {proyecto.notas ? <Dato etiqueta="Notas">{proyecto.notas}</Dato> : null}
          </dl>
        </div>
        {puedeEditar ? (
          <div className="flex flex-col gap-2 sm:flex-row">
            {sinItems ? (
              <BotonDeEliminarProyecto
                id={proyecto.id}
                numero={proyecto.numero}
                actualizadoEn={proyecto.actualizadoEn}
              />
            ) : null}
            <BotonDeCierre
              id={proyecto.id}
              numero={proyecto.numero}
              actualizadoEn={proyecto.actualizadoEn}
              cerrado={proyecto.cerradoEn !== null}
            />
          </div>
        ) : null}
      </header>
      {children}
    </div>
  )
}
