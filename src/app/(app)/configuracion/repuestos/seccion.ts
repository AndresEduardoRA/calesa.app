import { WrenchIcon } from 'lucide-react'
import { RUTAS } from '@/shared/lib/rutas'
import type { SeccionDeConfiguracion } from '../secciones'

// La entrada de Configuración › Repuestos en el hub (8.08-3). Se abre con `repuestos.configurar`. El tipo se trae con `import type`: el ciclo con
// `secciones.ts` es sólo de tipos y se borra al compilar.
export const SECCION_DE_REPUESTOS = {
  clave: 'repuestos',
  titulo: 'Repuestos',
  descripcion: 'Los catálogos de los ítems y la configuración del cotizador.',
  ruta: RUTAS.configuracionDeRepuestos,
  Icono: WrenchIcon,
  permisos: ['repuestos.configurar'],
} as const satisfies SeccionDeConfiguracion
