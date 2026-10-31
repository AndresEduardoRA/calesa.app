import { probarLaVuelta } from '@/shared/ui/vuelta-del-foco.soporte'
import { usePanelAgregarVehiculo } from './use-panel-agregar-vehiculo'

// «Agregar vehículo» (`?panel=agregar-vehiculo`): tras recargar con él abierto, «atrás» devuelve el foco a su botón (4-49).
probarLaVuelta({
  hook: 'usePanelAgregarVehiculo',
  usar: usePanelAgregarVehiculo,
  clave: 'panel',
  cerrada: '',
  aperturas: [
    {
      nombre: 'abrir',
      abrir: (panel) => {
        panel.abrir()
      },
      abierta: '?panel=agregar-vehiculo',
      abierto: (panel) => panel.abierto,
    },
  ],
  cerrar: (panel) => {
    panel.cerrar()
  },
})
