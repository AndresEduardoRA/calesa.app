'use client'

import { CORTE_DE_LA_TABLA } from '@/shared/lib/ancho'
import { useAlMenos } from '@/shared/ui/ancho-de-pantalla'
import { columnaDePrecio, precioDeLaFila } from '../../../entities/precio-de-la-fila'
import { CasillaDeSeleccion } from '../../papelera/components/casilla-de-seleccion'
import type { SeleccionDelListado } from '../../papelera/hooks/use-papelera-del-listado'
import { InsigniaDeLimpieza } from '../../limpieza/components/insignia-de-limpieza'
import { InsigniaDeVitrina } from '../../vitrina/components/insignia-de-vitrina'
import { useIdentidad } from '../hooks/use-identidad'
import { MenuDeFila } from './menu-de-fila'
import { TarjetaVehiculo } from './tarjeta-vehiculo'
import {
  faseDe,
  vitrinaDe,
  type DatosDelOrigen,
  type FilaDeVehiculo,
  type ParaElMenuDeLaLista,
} from './tipos'
import { BotonDeVitrinaDeLaFila } from '../../vitrina/components/boton-de-vitrina-de-la-fila'

type Props = DatosDelOrigen & {
  vehiculos: readonly FilaDeVehiculo[]
  menu: ParaElMenuDeLaLista
  seleccion: SeleccionDelListado
  alAbrir: (id: string) => void
  // El vehículo abierto en el resumen, para marcarlo.
  abierto: string | null
}

// El inventario de un origen en tarjetas (en el celular siempre; en escritorio, si la persona las eligió): una por vehículo, con lo
// mismo que la fila de la tabla (la fase, si está en la vitrina, el precio o la puja, editar y la casilla para elegirlo).
export function TarjetasDeVehiculos(props: Props) {
  const {
    vehiculos,
    origen,
    campos,
    fases,
    vitrina,
    limpiezaHoy,
    menu,
    seleccion,
    alAbrir,
    abierto,
  } = props
  const identidadDe = useIdentidad(campos)
  const columnaPrecio = columnaDePrecio(origen.tipo === 'subasta', campos)
  // En escritorio sólo hay tarjetas si la persona las eligió: van en grilla, más grandes y con el carrusel en la foto.
  const grande = useAlMenos(CORTE_DE_LA_TABLA)
  return (
    <ul
      className={
        grande
          ? 'grid grid-cols-[repeat(auto-fill,minmax(min(100%,17rem),1fr))] gap-3'
          : 'grid grid-cols-[minmax(0,1fr)] gap-2'
      }
    >
      {vehiculos.map((vehiculo) => {
        const fase = faseDe(fases, vehiculo.faseId)
        return (
          <TarjetaVehiculo
            key={vehiculo.id}
            vehiculo={vehiculo}
            campos={campos}
            fase={fase}
            precio={precioDeLaFila(vehiculo, columnaPrecio)}
            grande={grande}
            abierta={abierto === vehiculo.id}
            alAbrir={() => {
              alAbrir(vehiculo.id)
            }}
            seleccion={
              seleccion.seleccionables.has(vehiculo.id) ? (
                <CasillaDeSeleccion
                  etiqueta={`Seleccionar ${identidadDe(vehiculo).nombre}`}
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
                {menu.publicar.estado === 'habilitado' ? (
                  <BotonDeVitrinaDeLaFila vehiculo={vehiculo} />
                ) : null}
                <InsigniaDeLimpieza fecha={vehiculo.limpiezaEl} hoy={limpiezaHoy} />
              </>
            }
            acciones={<MenuDeFila vehiculo={vehiculo} fases={fases} para={menu} />}
          />
        )
      })}
    </ul>
  )
}
