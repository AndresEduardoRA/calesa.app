'use client'

import type { OrigenResumen } from '@/modules/origenes/client'
import { Drawer } from '@/shared/ui/drawer'
import type { CampoDeVehiculo } from '../../../entities/campo'
import type { Vehiculo } from '../../../entities/vehiculo'
import type { PermisoDeVitrina, VistaPreviaDeVitrina } from '../../../entities/vitrina'
import { usePanelDeVitrina } from '../hooks/use-panel-de-vitrina'
import { FormularioDeVitrina } from './formulario-de-vitrina'

type Props = {
  vehiculo: Vehiculo
  origen: OrigenResumen
  // La fase actual, para decir por qué no se ve.
  fase: { nombre: string } | null
  campos: readonly CampoDeVehiculo[]
  // Lo que respondió la base; null si no se pudo leer.
  previa: VistaPreviaDeVitrina | null
  permiso: PermisoDeVitrina
}

// El panel de «Publicar en la web» (`?panel=vitrina`). Va una vez en la ficha; lo abre
// `<BotonDeVitrina>`. Sin el permiso no se abre, aunque la URL lo pida.
export function PanelDeVitrina({ permiso, ...resto }: Props) {
  const panel = usePanelDeVitrina()
  return (
    <Drawer
      abierto={panel.abierto && permiso.estado === 'habilitado'}
      alCerrar={panel.cerrar}
      titulo="Publicar en la web"
      descripcion={resto.vehiculo.titulo}
    >
      {/* Arranca de lo guardado cada vez que cambia la versión del vehículo. */}
      <FormularioDeVitrina key={resto.vehiculo.actualizadoEn} {...resto} alCerrar={panel.cerrar} />
    </Drawer>
  )
}
