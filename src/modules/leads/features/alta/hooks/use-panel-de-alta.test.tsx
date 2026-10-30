import { probarLaVuelta } from '@/shared/ui/vuelta-del-foco.soporte'
import { PANEL_NUEVO_LEAD, usePanelDeAlta } from './use-panel-de-alta'

// «Nuevo lead» (`?panel=nuevo-lead`): tras recargar con el panel abierto, «atrás» devuelve el foco a quien lo abrió (4-49).
probarLaVuelta({
  hook: 'usePanelDeAlta',
  usar: usePanelDeAlta,
  clave: 'panel',
  cerrada: '',
  aperturas: [
    {
      nombre: 'abrir',
      abrir: (panel) => {
        panel.abrir()
      },
      abierta: `?panel=${PANEL_NUEVO_LEAD}`,
      abierto: (panel) => panel.abierto,
    },
  ],
  cerrar: (panel) => {
    panel.cerrar()
  },
})
