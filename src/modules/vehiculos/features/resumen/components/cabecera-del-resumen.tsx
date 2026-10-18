'use client'

import type { Route } from 'next'
import Link from 'next/link'
import { RUTAS } from '@/shared/lib/rutas'
import { buttonVariants } from '@/shared/ui/button'
import { Dato } from '@/shared/ui/campos'
import { camposDeTarjeta } from '../../../entities/campo'
import { BotonEditarVehiculo } from '../../alta/components/botones'
import { BadgeDeFase } from '../../listado/components/badge-de-fase'
import { Miniatura } from '../../listado/components/miniatura'
import {
  faseDe,
  vitrinaDe,
  type DatosDelOrigen,
  type FilaDeVehiculo,
} from '../../listado/components/tipos'
import { ValorDeCampo } from '../../listado/components/valor-de-campo'
import { InsigniaDeLimpieza } from '../../limpieza/components/insignia-de-limpieza'
import { InsigniaDeVitrina } from '../../vitrina/components/insignia-de-vitrina'

type Props = DatosDelOrigen & {
  vehiculo: FilaDeVehiculo
  // La persona puede editarlo (`editablesDe()`): sin esto no hay «Editar».
  editable: boolean
}

function tieneValor(valor: unknown) {
  return valor !== undefined && valor !== null && valor !== ''
}

// Lo de arriba, en todas las pestañas: la portada, lo que identifica al vehículo —su número, el VIN o el lote y los datos que el
// layout de su origen pone «en tarjeta», los mismos que lo reconocen en la lista—, su estado (la fase, la vitrina y la limpieza) y lo
// que se puede hacer: «Editar» (sólo con permiso) y «Abrir ficha».
export function CabeceraDelResumen(props: Props) {
  const { vehiculo, campos, fases, origen, vitrina, limpiezaHoy, editable } = props
  const fase = faseDe(fases, vehiculo.faseId)
  const datos = camposDeTarjeta(campos).filter((campo) =>
    tieneValor(vehiculo.atributos[campo.clave]),
  )
  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-start gap-4">
        <Miniatura ruta={vehiculo.portadaRuta} className="w-28" />
        <div className="grid min-w-0 flex-1 gap-2">
          <dl className="grid gap-x-4 gap-y-1 sm:grid-cols-2">
            <Dato etiqueta="Número">
              <span className="tabular-nums">#{vehiculo.numero}</span>
            </Dato>
            {vehiculo.vin ? (
              <Dato etiqueta="VIN">
                <span className="tabular-nums">{vehiculo.vin}</span>
              </Dato>
            ) : null}
            {vehiculo.lote ? (
              <Dato etiqueta="Lote">
                <span className="tabular-nums">{vehiculo.lote}</span>
              </Dato>
            ) : null}
            {datos.map((campo) => (
              <Dato key={campo.clave} etiqueta={campo.etiqueta}>
                <ValorDeCampo campo={campo} valor={vehiculo.atributos[campo.clave]} />
              </Dato>
            ))}
          </dl>
          <div className="flex flex-wrap items-center gap-2">
            <BadgeDeFase fase={fase} />
            <InsigniaDeVitrina {...vitrinaDe(vehiculo, vitrina)} origen={origen} fase={fase} />
            <InsigniaDeLimpieza fecha={vehiculo.limpiezaEl} hoy={limpiezaHoy} />
          </div>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {editable ? <BotonEditarVehiculo vehiculo={vehiculo} /> : null}
        <Link
          href={`${RUTAS.vehiculos}/${vehiculo.id}` as Route}
          className={buttonVariants({ variant: 'outline', className: 'h-11 md:h-9' })}
        >
          Abrir ficha
        </Link>
      </div>
    </div>
  )
}
