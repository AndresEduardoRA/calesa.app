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

type Props = {
  vehiculo: Vehiculo
  origen: OrigenResumen
  fase: FaseResumen | null
  // Lo que respondió la base sobre la vitrina; null si no se pudo leer.
  previa: VistaPreviaDeVitrina | null
  publicar: PermisoDeVitrina
  editable: boolean
  papelera: PermisoDePapelera
}

// La cabecera de la ficha con lo que la persona puede hacer desde ahí: «Editar» y el «⋯» con la lista de siempre (publicar en la web,
// apagado y con el motivo si no tiene el permiso, y, separada, enviar a la papelera).
export function Encabezado(props: Props) {
  const { vehiculo, origen, fase, previa, publicar, editable, papelera } = props
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
          {editable ? <BotonEditarVehiculo vehiculo={vehiculo} /> : null}
          <MenuDeVehiculoDeLaFicha vehiculo={vehiculo} publicar={publicar} papelera={papelera} />
        </>
      }
    />
  )
}
