import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'
import { probarLaVuelta } from '@/shared/ui/vuelta-del-foco.soporte'
import { PANEL_DESCARTAR_PLANTILLA } from '../../../entities/plantilla/descartar-la-plantilla'
import { PANEL_PUBLICAR_TARJETA } from '../../../entities/plantilla/publicar-la-plantilla'
import { usePanelDeLaTarjeta } from './use-panel-de-la-tarjeta'

type Panel = ReturnType<typeof usePanelDeLaTarjeta>

// «Publicar…» y «Descartar borrador…» (`?panel=publicar-tarjeta`, `?panel=descartar-plantilla`): tras recargar con el modal abierto, «atrás» devuelve el foco a quien lo abrió.
probarLaVuelta({
  hook: 'usePanelDeLaTarjeta',
  usar: usePanelDeLaTarjeta,
  clave: 'panel',
  cerrada: '',
  aperturas: [
    {
      nombre: 'abrirPublicar',
      abrir: (panel: Panel) => {
        panel.abrirPublicar()
      },
      abierta: `?panel=${PANEL_PUBLICAR_TARJETA}`,
      abierto: (panel: Panel) => panel.publicando,
    },
    {
      nombre: 'abrirDescartar',
      abrir: (panel: Panel) => {
        panel.abrirDescartar()
      },
      abierta: `?panel=${PANEL_DESCARTAR_PLANTILLA}`,
      abierto: (panel: Panel) => panel.descartando,
    },
  ],
  cerrar: (panel) => {
    panel.cerrar()
  },
})

afterEach(() => {
  cleanup()
  document.body.replaceChildren()
  history.replaceState(null, '')
})
