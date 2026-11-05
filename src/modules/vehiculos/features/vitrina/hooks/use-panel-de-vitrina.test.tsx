import { probarLaVuelta } from '@/shared/ui/vuelta-del-foco.soporte'
import { usePanelDeVitrina } from './use-panel-de-vitrina'

// «Publicar en la web» (`?panel=vitrina`): tras recargar con él abierto, «atrás» devuelve el foco al «⋯» de la ficha (4-49).
probarLaVuelta({
  hook: 'usePanelDeVitrina',
  usar: usePanelDeVitrina,
  clave: 'panel',
  cerrada: '',
  aperturas: [
    {
      nombre: 'abrir',
      abrir: (panel) => {
        panel.abrir()
      },
      abierta: '?panel=vitrina',
      abierto: (panel) => panel.abierto,
    },
  ],
  cerrar: (panel) => {
    panel.cerrar()
  },
})
