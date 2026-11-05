import { probarLaVuelta } from '@/shared/ui/vuelta-del-foco.soporte'
import { useResumenDeCotizacion } from './use-resumen-de-cotizacion'

const ID = '2f1c3a4b-5d6e-4f70-8a9b-0c1d2e3f4a5b'

// El resumen de una cotización (`?cotizacion=<id>`): tras recargar con él abierto, «atrás» devuelve el foco a la fila que lo abrió (4-49).
probarLaVuelta({
  hook: 'useResumenDeCotizacion',
  usar: useResumenDeCotizacion,
  clave: 'cotizacion',
  cerrada: '',
  aperturas: [
    {
      nombre: 'abrir',
      abrir: (resumen) => {
        resumen.abrir(ID)
      },
      abierta: `?cotizacion=${ID}`,
      abierto: (resumen) => resumen.id === ID,
    },
  ],
  cerrar: (resumen) => {
    resumen.cerrar()
  },
})
