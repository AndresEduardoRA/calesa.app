import { probarLaVuelta } from '@/shared/ui/vuelta-del-foco.soporte'
import { PANEL_ETAPAS } from '../../../entities/embudo'
import { PANEL_NUEVO_EMBUDO, useVistaDeEmbudo } from './use-vista-de-embudo'

// Las etapas (`?panel=etapas`) y «Nuevo embudo» (`?panel=nuevo-embudo`): tras recargar con el panel abierto, «atrás» devuelve el foco a quien lo
// abrió (4-49).
probarLaVuelta({
  hook: 'useVistaDeEmbudo',
  usar: useVistaDeEmbudo,
  clave: 'panel',
  cerrada: '',
  aperturas: [
    {
      nombre: 'abrirEtapas',
      abrir: (vista) => {
        vista.abrirEtapas()
      },
      abierta: `?panel=${PANEL_ETAPAS}`,
      abierto: (vista) => vista.etapasAbierto,
    },
    {
      nombre: 'abrirNuevo',
      abrir: (vista) => {
        vista.abrirNuevo()
      },
      abierta: `?panel=${PANEL_NUEVO_EMBUDO}`,
      abierto: (vista) => vista.nuevoAbierto,
    },
  ],
  cerrar: (vista) => {
    vista.cerrarPanel()
  },
})
