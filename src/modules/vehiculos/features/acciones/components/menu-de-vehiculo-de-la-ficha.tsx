'use client'

import type { Route } from 'next'
import { useRouter } from 'next/navigation'
import { RUTAS } from '@/shared/lib/rutas'
import type { PermisoDePapelera } from '../../../entities/papelera'
import type { PermisoDeVitrina } from '../../../entities/vitrina'
import { usePanelDeVitrina } from '../../vitrina/hooks/use-panel-de-vitrina'
import { MenuDeVehiculo } from './menu-de-vehiculo'

type Props = {
  vehiculo: { id: string; titulo: string; origenId: string; actualizadoEn: string }
  publicar: PermisoDeVitrina
  papelera: PermisoDePapelera
  // `/actividad` de este vehículo, sólo con `actividad.ver` (la arma la página: `vehiculos` no conoce `actividad`); null si no la ve.
  paraActividad: string | null
}

// El «⋯» de la ficha de un vehículo, con la lista de siempre. «Editar» es el botón de la cabecera. «Publicar en la web…» abre el panel de la
// vitrina que ya está en la ficha, y se ve siempre: sin el permiso, apagada y con el motivo. Enviar a la papelera lleva al inventario,
// porque la ficha ya no existe para nadie.
export function MenuDeVehiculoDeLaFicha({ vehiculo, publicar, papelera, paraActividad }: Props) {
  const router = useRouter()
  const vitrina = usePanelDeVitrina()
  return (
    <MenuDeVehiculo
      vehiculo={vehiculo}
      editar={false}
      publicar={publicar}
      papelera={papelera}
      conBorde
      alPublicar={vitrina.abrir}
      alVerActividad={
        paraActividad
          ? () => {
              router.push(paraActividad as Route)
            }
          : undefined
      }
      alEnviado={() => {
        router.push(`${RUTAS.vehiculos}?origen=${vehiculo.origenId}` as Route)
      }}
    />
  )
}
