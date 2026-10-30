import { probarLaVuelta } from '@/shared/ui/vuelta-del-foco.soporte'
import { PANEL_OTORGAR_PORTAL, PANEL_REVOCAR_PORTAL } from '../../../entities/portal'
import { usePanelDePortal } from './use-panel-de-portal'

type Panel = ReturnType<typeof usePanelDePortal>

// «Dar acceso» y «Revocar» (`?panel=otorgar-portal`, `revocar-portal`): tras recargar con el diálogo abierto, «atrás» devuelve el foco a quien lo abrió (4-49).
probarLaVuelta({
  hook: 'usePanelDePortal',
  usar: usePanelDePortal,
  clave: 'panel',
  cerrada: '',
  aperturas: [
    {
      nombre: 'abrirOtorgar',
      abrir: (panel: Panel) => {
        panel.abrirOtorgar()
      },
      abierta: `?panel=${PANEL_OTORGAR_PORTAL}`,
      abierto: (panel: Panel) => panel.otorgando,
    },
    {
      nombre: 'abrirRevocar',
      abrir: (panel: Panel) => {
        panel.abrirRevocar()
      },
      abierta: `?panel=${PANEL_REVOCAR_PORTAL}`,
      abierto: (panel: Panel) => panel.revocando,
    },
  ],
  cerrar: (panel) => {
    panel.cerrar()
  },
})
