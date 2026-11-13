import { CalculatorIcon } from 'lucide-react'
import { RUTAS } from '@/shared/lib/rutas'
import type { SeccionDeConfiguracion } from '../secciones'

// La entrada de Configuración › Cotización en el hub. Vive en su carpeta. Se abre con los permisos de sus pestañas (`pestanas.ts`): los de los niveles
// de acceso y, desde el 4.20-2a, `cotizaciones.configurar` (la fórmula, el diseño del 4.22-2, las tablas de referencia del 4.23-3 y los ajustes), en cualquier origen.
// El tipo se trae con `import type`: el ciclo con `secciones.ts` es sólo de tipos y se borra al compilar.
export const SECCION_DE_COTIZACION = {
  clave: 'cotizacion',
  titulo: 'Cotización',
  descripcion:
    'La fórmula, el diseño y las tablas de referencia de cada origen, la vigencia y los niveles de acceso de la hoja.',
  ruta: RUTAS.configuracionDeCotizacion,
  Icono: CalculatorIcon,
  permisos: ['equipo.roles.ver', 'equipo.roles.gestionar', 'cotizaciones.configurar'],
} as const satisfies SeccionDeConfiguracion
