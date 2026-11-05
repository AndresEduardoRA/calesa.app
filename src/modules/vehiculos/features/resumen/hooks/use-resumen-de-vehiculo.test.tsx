import { probarLaVuelta } from '@/shared/ui/vuelta-del-foco.soporte'
import { useResumenDeVehiculo } from './use-resumen-de-vehiculo'

const ID = '2f1c3a4b-5d6e-4f70-8a9b-0c1d2e3f4a5b'

const useResumenDePrueba = () => useResumenDeVehiculo({ verInteresados: false })

// El resumen de un vehículo (`?vehiculo=<id>`): tras recargar con él abierto, «atrás» devuelve el foco a la fila que lo abrió (4-49).
probarLaVuelta({
  hook: 'useResumenDeVehiculo',
  usar: useResumenDePrueba,
  clave: 'vehiculo',
  cerrada: '',
  aperturas: [
    {
      nombre: 'abrir',
      abrir: (resumen) => {
        resumen.abrir(ID)
      },
      abierta: `?vehiculo=${ID}`,
      abierto: (resumen) => resumen.id === ID,
    },
  ],
  cerrar: (resumen) => {
    resumen.cerrar()
  },
})
