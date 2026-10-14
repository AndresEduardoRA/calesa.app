import type { FaseResumen } from '@/modules/flujos'
import type { OrigenResumen, leerLayout } from '@/modules/origenes'
import {
  PanelDeVehiculo,
  SIN_APIBARA,
  PanelDeVitrina,
  type PermisoDeVitrina,
  type Vehiculo,
  type VistaPreviaDeVitrina,
} from '@/modules/vehiculos'

type Layout = Extract<Awaited<ReturnType<typeof leerLayout>>, { ok: true }>['data']

type Props = {
  vehiculo: Vehiculo
  origen: OrigenResumen
  fase: FaseResumen | null
  layout: Layout
  previa: VistaPreviaDeVitrina | null
  publicar: PermisoDeVitrina
  // El vehículo de `?editar=`, si es este.
  enEdicion: Vehiculo | null
}

// Los paneles laterales de la ficha, cada uno con su URL: publicar (`?panel=vitrina`) y editar
// (`?editar=`). Desde la ficha sólo se edita: el alta vive en el inventario.
export function Paneles({ vehiculo, origen, fase, layout, previa, publicar, enEdicion }: Props) {
  return (
    <>
      <PanelDeVitrina
        vehiculo={vehiculo}
        origen={origen}
        fase={fase}
        campos={layout.campos}
        previa={previa}
        permiso={publicar}
      />
      <PanelDeVehiculo
        origen={origen}
        campos={layout.campos}
        categorias={layout.categorias}
        puedeCrear={false}
        enEdicion={enEdicion}
        apibara={SIN_APIBARA}
      />
    </>
  )
}
