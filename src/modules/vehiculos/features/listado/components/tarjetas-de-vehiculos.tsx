'use client'

import { RUTAS } from '@/shared/lib/rutas'
import { BotonEditarVehiculo } from '../../alta/components/botones'
import { CasillaDeSeleccion } from '../../papelera/components/casilla-de-seleccion'
import type { SeleccionDelListado } from '../../papelera/hooks/use-papelera-del-listado'
import { InsigniaDeVitrina } from '../../vitrina/components/insignia-de-vitrina'
import { TarjetaVehiculo } from './tarjeta-vehiculo'
import { faseDe, vitrinaDe, type DatosDelOrigen, type FilaDeVehiculo } from './tipos'

type Props = DatosDelOrigen & {
  vehiculos: readonly FilaDeVehiculo[]
  editables: ReadonlySet<string>
  seleccion: SeleccionDelListado
}

// El inventario de un origen en el celular: una tarjeta por vehículo, con lo mismo que la fila
// de la tabla (la fase, si está en la vitrina, editar y la casilla para elegirlo).
export function TarjetasDeVehiculos(props: Props) {
  const { vehiculos, origen, campos, fases, vitrina, editables, seleccion } = props
  return (
    <ul className="grid gap-2 md:hidden">
      {vehiculos.map((vehiculo) => {
        const fase = faseDe(fases, vehiculo.faseId)
        return (
          <li key={vehiculo.id}>
            <TarjetaVehiculo
              vehiculo={vehiculo}
              campos={campos}
              fase={fase}
              href={`${RUTAS.vehiculos}/${vehiculo.id}`}
              seleccion={
                seleccion.seleccionables.has(vehiculo.id) ? (
                  <CasillaDeSeleccion
                    etiqueta={`Seleccionar ${vehiculo.titulo}`}
                    elegida={seleccion.elegidas.has(vehiculo.id)}
                    alCambiar={() => {
                      seleccion.alternar(vehiculo.id)
                    }}
                  />
                ) : null
              }
              insignias={
                <InsigniaDeVitrina {...vitrinaDe(vehiculo, vitrina)} origen={origen} fase={fase} />
              }
              acciones={
                editables.has(vehiculo.id) ? (
                  <BotonEditarVehiculo vehiculo={vehiculo} compacto />
                ) : null
              }
            />
          </li>
        )
      })}
    </ul>
  )
}
