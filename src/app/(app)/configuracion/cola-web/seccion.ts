import { HeadsetIcon } from 'lucide-react'
import { RUTAS } from '@/shared/lib/rutas'
import type { SeccionDeConfiguracion } from '../secciones'

// La entrada de Configuración › Cola web en el hub (8.04-2). Se abre con `web.cola.gestionar`. El tipo se trae con `import type`: el ciclo con
// `secciones.ts` es sólo de tipos y se borra al compilar.
export const SECCION_DE_COLA_WEB = {
  clave: 'cola-web',
  titulo: 'Cola web',
  descripcion:
    'Quién recibe los turnos de la web, las solicitudes sin asignar y la política de la cola.',
  ruta: RUTAS.configuracionDeColaWeb,
  Icono: HeadsetIcon,
  permisos: ['web.cola.gestionar'],
} as const satisfies SeccionDeConfiguracion
