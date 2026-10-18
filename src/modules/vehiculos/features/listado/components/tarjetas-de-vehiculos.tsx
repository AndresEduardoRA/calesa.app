'use client'

import { BotonEditarVehiculo } from '../../alta/components/botones'
import { CasillaDeSeleccion } from '../../papelera/components/casilla-de-seleccion'
import type { SeleccionDelListado } from '../../papelera/hooks/use-papelera-del-listado'
import { InsigniaDeLimpieza } from '../../limpieza/components/insignia-de-limpieza'
import { InsigniaDeVitrina } from '../../vitrina/components/insignia-de-vitrina'
import { TarjetaVehiculo } from './tarjeta-vehiculo'
import { faseDe, vitrinaDe, type DatosDelOrigen, type FilaDeVehiculo } from './tipos'

type Props = DatosDelOrigen & {
  vehiculos: readonly FilaDeVehiculo[]
  editables: ReadonlySet<string>
  seleccion: SeleccionDelListado
  alAbrir: (id: string) => void
}

// El inventario de un origen en el celular: una tarjeta por vehículo, con lo mismo que la fila
// de la tabla (la fase, si está en la vitrina, editar y la casilla para elegirlo).
export function TarjetasDeVehiculos(props: Props) {
  const { vehiculos, origen, campos, fases, vitrina, limpiezaHoy, editables, seleccion, alAbrir } =
    props
  return (
    <ul className="grid grid-cols-[minmax(0,1fr)] gap-2">
      {vehiculos.map((vehiculo) => {
        const fase = faseDe(fases, vehiculo.faseId)
        return (
          <TarjetaVehiculo
            key={vehiculo.id}
            vehiculo={vehiculo}
            campos={campos}
            fase={fase}
            alAbrir={() => {
              alAbrir(vehiculo.id)
            }}
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
              <>
                <InsigniaDeVitrina {...vitrinaDe(vehiculo, vitrina)} origen={origen} fase={fase} />
                <InsigniaDeLimpieza fecha={vehiculo.limpiezaEl} hoy={limpiezaHoy} />
              </>
            }
            acciones={
              editables.has(vehiculo.id) ? (
                <BotonEditarVehiculo vehiculo={vehiculo} compacto />
              ) : null
            }
          />
        )
      })}
    </ul>
  )
}
