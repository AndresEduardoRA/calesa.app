import { probarLaVuelta } from '@/shared/ui/vuelta-del-foco.soporte'
import { usePanelDeVehiculo } from './use-panel-de-vehiculo'

const ID = '2f1c3a4b-5d6e-4f70-8a9b-0c1d2e3f4a5b'

// «Nuevo vehículo» (`?panel=nuevo`) y editar (`?editar=<id>`): tras recargar con el panel abierto, «atrás» devuelve el foco a quien lo abrió (4-49).
probarLaVuelta({
  hook: 'usePanelDeVehiculo',
  usar: usePanelDeVehiculo,
  clave: 'panel',
  cerrada: '',
  aperturas: [
    {
      nombre: 'abrirNuevo',
      abrir: (panel) => {
        panel.abrirNuevo()
      },
      abierta: '?panel=nuevo',
      abierto: (panel) => panel.nuevoAbierto,
    },
  ],
  cerrar: (panel) => {
    panel.cerrar()
  },
})

probarLaVuelta({
  hook: 'usePanelDeVehiculo',
  usar: usePanelDeVehiculo,
  clave: 'editar',
  cerrada: '',
  aperturas: [
    {
      nombre: 'editar',
      abrir: (panel) => {
        panel.editar(ID)
      },
      abierta: `?editar=${ID}`,
      abierto: (panel) => panel.enEdicion === ID,
    },
  ],
  cerrar: (panel) => {
    panel.cerrar()
  },
})
