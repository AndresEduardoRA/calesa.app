import type { Route } from 'next'
import Link from 'next/link'
import type { FaseResumen } from '@/modules/flujos'
import type { OrigenResumen } from '@/modules/origenes'
import {
  type PermisoDePapelera,
  type PermisoDeVitrina,
  type Vehiculo,
  type VistaPreviaDeVitrina,
} from '@/modules/vehiculos'
import {
  BotonEditarVehiculo,
  CabeceraDeVehiculo,
  InsigniaDeVitrina,
  MenuDeVehiculoDeLaFicha,
} from '@/modules/vehiculos/pantallas/ficha'
import { unidadDeLogistica } from '@/shared/lib/rutas'
import { buttonVariants } from '@/shared/ui/button'

type Props = {
  vehiculo: Vehiculo
  origen: OrigenResumen
  fase: FaseResumen | null
  // Lo que respondió la base sobre la vitrina; null si no se pudo leer.
  previa: VistaPreviaDeVitrina | null
  publicar: PermisoDeVitrina
  editable: boolean
  papelera: PermisoDePapelera
  // `logistica.ver` en el origen del vehículo: sin él no hay enlace (D25). Lo decide la página con `puede()`.
  verEnLogistica: boolean
}

// La cabecera de la ficha con lo que la persona puede hacer desde ahí: «Ver en logística», «Editar» y el «⋯» con la lista de siempre (publicar en la web,
// apagado y con el motivo si no tiene el permiso, y, separada, enviar a la papelera).
export function Encabezado(props: Props) {
  const { vehiculo, origen, fase, previa, publicar, editable, papelera, verEnLogistica } = props
  return (
    <CabeceraDeVehiculo
      vehiculo={vehiculo}
      origen={origen}
      fase={fase}
      insignias={
        previa?.publicado ? (
          <InsigniaDeVitrina
            estado={previa.visible ? 'en_vitrina' : 'no_visible'}
            motivos={previa.motivos}
            origen={origen}
            fase={fase}
          />
        ) : null
      }
      acciones={
        <>
          {verEnLogistica ? (
            <Link
              href={unidadDeLogistica(vehiculo.id) as Route}
              className={buttonVariants({ variant: 'outline', className: 'min-h-11 md:min-h-8' })}
            >
              Ver en logística
            </Link>
          ) : null}
          {editable ? <BotonEditarVehiculo vehiculo={vehiculo} /> : null}
          <MenuDeVehiculoDeLaFicha vehiculo={vehiculo} publicar={publicar} papelera={papelera} />
        </>
      }
    />
  )
}
