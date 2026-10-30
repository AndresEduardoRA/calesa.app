import { probarLaVuelta } from '@/shared/ui/vuelta-del-foco.soporte'
import { PANEL_EDITAR_LEAD } from '../../../entities/edicion'
import { PANEL_ANOTAR_SEGUIMIENTO } from '../../../entities/edicion-de-seguimiento'
import { CLAVE_DE_LEAD, useDrawerDeLead } from './use-drawer-de-lead'

const ID = '2f1c3a4b-5d6e-4f70-8a9b-0c1d2e3f4a5b'

// El lead rápido (`?lead=<id>`), y encima «Editar» (`&panel=editar-lead`) o anotar desde el «⋯» del resumen
// (`&pestana=seguimientos&panel=anotar-seguimiento`): tras recargar con el panel abierto, «atrás» devuelve el foco a quien lo abrió (4-49).
probarLaVuelta({
  hook: 'useDrawerDeLead',
  usar: useDrawerDeLead,
  clave: CLAVE_DE_LEAD,
  cerrada: '',
  aperturas: [
    {
      nombre: 'abrir',
      abrir: (drawer) => {
        drawer.abrir(ID)
      },
      abierta: `?lead=${ID}`,
      abierto: (drawer) => drawer.id === ID,
    },
  ],
  cerrar: (drawer) => {
    drawer.cerrar()
  },
})

probarLaVuelta({
  hook: 'useDrawerDeLead',
  usar: useDrawerDeLead,
  clave: 'panel',
  cerrada: `?lead=${ID}`,
  aperturas: [
    {
      nombre: 'editar',
      abrir: (drawer) => {
        drawer.editar()
      },
      abierta: `?lead=${ID}&panel=${PANEL_EDITAR_LEAD}`,
      abierto: (drawer) => drawer.editando,
    },
    {
      nombre: 'abrirModal',
      abrir: (drawer) => {
        drawer.abrirModal('seguimientos', PANEL_ANOTAR_SEGUIMIENTO)
      },
      abierta: `?lead=${ID}&pestana=seguimientos&panel=${PANEL_ANOTAR_SEGUIMIENTO}`,
      abierto: (drawer) => drawer.pestana === 'seguimientos' && drawer.conModal,
    },
  ],
  cerrar: (drawer) => {
    drawer.elegirPestana('resumen')
  },
})
