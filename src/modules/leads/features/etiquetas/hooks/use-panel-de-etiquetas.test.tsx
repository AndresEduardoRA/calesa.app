import { probarLaVuelta } from '@/shared/ui/vuelta-del-foco.soporte'
import { PANEL_ETIQUETAS } from '../../../entities/etiqueta'
import { usePanelDeEtiquetas } from './use-panel-de-etiquetas'

// «Gestionar etiquetas» (`?panel=etiquetas`): tras recargar con el panel abierto, «atrás» devuelve el foco a quien lo abrió (4-49).
probarLaVuelta({
  hook: 'usePanelDeEtiquetas',
  usar: usePanelDeEtiquetas,
  clave: 'panel',
  cerrada: '',
  aperturas: [
    {
      nombre: 'abrir',
      abrir: (panel) => {
        panel.abrir()
      },
      abierta: `?panel=${PANEL_ETIQUETAS}`,
      abierto: (panel) => panel.abierto,
    },
  ],
  cerrar: (panel) => {
    panel.cerrar()
  },
})
