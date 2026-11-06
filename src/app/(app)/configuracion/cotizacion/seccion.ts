import { CalculatorIcon } from 'lucide-react'
import { RUTAS } from '@/shared/lib/rutas'
import type { SeccionDeConfiguracion } from '../secciones'

// La entrada de Configuración › Cotización en el hub. Vive en la carpeta del carril B: cuando
// sume `cotizaciones.configurar` (4.20) la edita aquí y corrige `seccion.test.ts`, sin tocar el hub.
// El tipo se trae con `import type`: el ciclo con `secciones.ts` es sólo de tipos y se borra al compilar.
export const SECCION_DE_COTIZACION = {
  clave: 'cotizacion',
  titulo: 'Cotización',
  descripcion: 'Los niveles de acceso de la hoja: quién ve y quién edita cada parte.',
  ruta: RUTAS.configuracionDeCotizacion,
  Icono: CalculatorIcon,
  permisos: ['equipo.roles.ver', 'equipo.roles.gestionar'],
} as const satisfies SeccionDeConfiguracion
