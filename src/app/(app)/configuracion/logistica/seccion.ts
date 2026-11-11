import { TruckIcon } from 'lucide-react'
import { RUTAS } from '@/shared/lib/rutas'
import type { SeccionDeConfiguracion } from '../secciones'
import { CATALOGOS_DE_LOGISTICA } from './catalogos'

// La entrada de Configuración › Logística en el hub (6.01). Sólo existe cuando algún área llena un catálogo (`catalogos.ts`): hasta entonces la lista queda vacía y el hub
// no cambia (no hay tarjeta que lleve a una pantalla sin nada). Se abre con la clave de gestionar los catálogos. El tipo se trae con `import type`: el ciclo con
// `secciones.ts` es sólo de tipos y se borra al compilar.
export const SECCION_DE_LOGISTICA = {
  clave: 'logistica',
  titulo: 'Logística',
  descripcion: 'Los catálogos del transporte y de los gastos: puertos, navieras y categorías.',
  ruta: RUTAS.configuracionDeLogistica,
  Icono: TruckIcon,
  permisos: ['logistica.catalogos.gestionar'],
} as const satisfies SeccionDeConfiguracion

export const SECCIONES_DE_LOGISTICA: readonly SeccionDeConfiguracion[] =
  CATALOGOS_DE_LOGISTICA.length > 0 ? [SECCION_DE_LOGISTICA] : []
