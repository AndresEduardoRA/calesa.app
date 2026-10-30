import { probarLaVuelta } from '@/shared/ui/vuelta-del-foco.soporte'
import { PANEL_COMPARTIR, PANEL_SALIR, PANEL_TRANSFERIR } from '../../../entities/cartera'
import { PANEL_EDITAR_LEAD } from '../../../entities/edicion'
import { PANEL_AGREGAR_TELEFONO, PANEL_CAMBIAR_TELEFONO } from '../../../entities/telefonos'
import { usePanelDeLead } from './use-panel-de-lead'

type Panel = ReturnType<typeof usePanelDeLead>

// Los paneles de la ficha (`?panel=…`): tras recargar con uno abierto, «atrás» devuelve el foco a quien lo abrió (4-49).
probarLaVuelta({
  hook: 'usePanelDeLead',
  usar: usePanelDeLead,
  clave: 'panel',
  cerrada: '',
  aperturas: [
    {
      nombre: 'abrir',
      abrir: (panel: Panel) => {
        panel.abrir()
      },
      abierta: `?panel=${PANEL_EDITAR_LEAD}`,
      abierto: (panel: Panel) => panel.abierto,
    },
    {
      nombre: 'telefono.abrir',
      abrir: (panel: Panel) => {
        panel.telefono.abrir()
      },
      abierta: `?panel=${PANEL_CAMBIAR_TELEFONO}`,
      abierto: (panel: Panel) => panel.telefono.abierto,
    },
    {
      nombre: 'extra.abrir',
      abrir: (panel: Panel) => {
        panel.extra.abrir()
      },
      abierta: `?panel=${PANEL_AGREGAR_TELEFONO}`,
      abierto: (panel: Panel) => panel.extra.abierto,
    },
    {
      nombre: 'compartir.abrir',
      abrir: (panel: Panel) => {
        panel.compartir.abrir()
      },
      abierta: `?panel=${PANEL_COMPARTIR}`,
      abierto: (panel: Panel) => panel.compartir.abierto,
    },
    {
      nombre: 'transferir.abrir',
      abrir: (panel: Panel) => {
        panel.transferir.abrir()
      },
      abierta: `?panel=${PANEL_TRANSFERIR}`,
      abierto: (panel: Panel) => panel.transferir.abierto,
    },
    {
      nombre: 'salir.abrir',
      abrir: (panel: Panel) => {
        panel.salir.abrir()
      },
      abierta: `?panel=${PANEL_SALIR}`,
      abierto: (panel: Panel) => panel.salir.abierto,
    },
  ],
  cerrar: (panel) => {
    panel.cerrar()
  },
})
