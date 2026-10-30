import type { EsquemaDeFiltros } from '@/shared/lib/filtros'
import { probarLaVuelta } from '../vuelta-del-foco.soporte'
import { useFiltros } from './use-filtros'

const ESQUEMA: EsquemaDeFiltros = {
  busqueda: { clave: 'q', etiqueta: 'Buscar por título' },
  filtros: [],
}

const useFiltrosDePrueba = () => useFiltros(ESQUEMA)

// La hoja de filtros (`?panel=filtros`): tras recargar con ella abierta, «atrás» devuelve el foco a «Filtros» (4-49).
probarLaVuelta({
  hook: 'useFiltros',
  usar: useFiltrosDePrueba,
  clave: 'panel',
  cerrada: '',
  aperturas: [
    {
      nombre: 'abrirPanel',
      abrir: (filtros) => {
        filtros.abrirPanel()
      },
      abierta: '?panel=filtros',
      abierto: (filtros) => filtros.panelAbierto,
    },
  ],
  cerrar: (filtros) => {
    filtros.cerrarPanel()
  },
})
