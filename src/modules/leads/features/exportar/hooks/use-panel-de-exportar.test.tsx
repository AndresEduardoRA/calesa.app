import { probarLaVuelta } from '@/shared/ui/vuelta-del-foco.soporte'
import { PANEL_EXPORTAR } from '../../../entities/exportacion'
import { usePanelDeExportar } from './use-panel-de-exportar'

// Exportar (`?panel=exportar`): tras recargar con el panel abierto, «atrás» devuelve el foco a quien lo abrió (4-49).
probarLaVuelta({
  hook: 'usePanelDeExportar',
  usar: usePanelDeExportar,
  clave: 'panel',
  cerrada: '',
  aperturas: [
    {
      nombre: 'abrir',
      abrir: (panel) => {
        panel.abrir()
      },
      abierta: `?panel=${PANEL_EXPORTAR}`,
      abierto: (panel) => panel.abierto,
    },
  ],
  cerrar: (panel) => {
    panel.cerrar()
  },
})
