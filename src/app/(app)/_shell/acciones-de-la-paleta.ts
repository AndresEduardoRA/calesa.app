import type { AccionDeLaPaleta } from '@/modules/buscador/shell.client'
import { puede, type Permisos } from '@/shared/lib/permisos'
import { RUTAS } from '@/shared/lib/rutas'
import { seccionesVisibles } from '../configuracion/secciones'
import { entradasVisibles } from './navegacion'

// Las acciones de la paleta `Ctrl/Cmd+K` para quien entró, calculadas en el servidor con `puede()` (nunca por rol): el menú que ve, las secciones de Configuración que ve y
// lo que puede crear. Datos simples (sin iconos ni permisos): cruzan a un Client Component. Lo que acá no se ofrece, la base lo sigue exigiendo.
export function accionesDeLaPaleta(permisos: Permisos): AccionDeLaPaleta[] {
  const posibles: (AccionDeLaPaleta | null)[] = [
    puede(permisos, 'leads.crear')
      ? {
          clave: 'nuevo-lead',
          titulo: 'Nuevo lead',
          grupo: 'crear',
          palabras: ['crear', 'lead', 'cliente', 'contacto'],
          destino: { tipo: 'nuevo-lead' },
        }
      : null,
    puede(permisos, 'vehiculos.crear')
      ? {
          clave: 'nuevo-vehiculo',
          titulo: 'Nuevo vehículo',
          grupo: 'crear',
          palabras: ['crear', 'auto', 'inventario'],
          destino: { tipo: 'ruta', ruta: RUTAS.nuevoVehiculo },
        }
      : null,
    puede(permisos, 'cotizaciones.crear')
      ? {
          clave: 'nueva-cotizacion',
          titulo: 'Nueva cotización',
          grupo: 'crear',
          palabras: ['crear', 'cotizar', 'precio'],
          destino: { tipo: 'ruta', ruta: RUTAS.nuevaCotizacion },
        }
      : null,
  ]
  const crear = posibles.filter((accion) => accion !== null)

  const entradas: AccionDeLaPaleta[] = [
    ...entradasVisibles(permisos, 'principal'),
    ...entradasVisibles(permisos, 'usuario'),
  ].map(({ clave, titulo, ruta }) => ({
    clave: `ir-${clave}`,
    titulo: `Ir a ${titulo}`,
    grupo: 'ir',
    palabras: ['ir', 'abrir'],
    destino: { tipo: 'ruta', ruta },
  }))

  const configuracion: AccionDeLaPaleta[] = seccionesVisibles(permisos).map(
    ({ clave, titulo, ruta }) => ({
      clave: `configuracion-${clave}`,
      titulo: `Configuración: ${titulo}`,
      grupo: 'ir',
      palabras: ['configuracion', 'ajustes'],
      destino: { tipo: 'ruta', ruta },
    }),
  )

  const ayuda: AccionDeLaPaleta = {
    clave: 'ver-atajos',
    titulo: 'Ver atajos de teclado',
    grupo: 'ayuda',
    palabras: ['teclas', 'ayuda', '?'],
    destino: { tipo: 'atajos' },
  }

  return [...crear, ...entradas, ...configuracion, ayuda]
}
