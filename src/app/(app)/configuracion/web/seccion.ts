import { GlobeIcon } from 'lucide-react'
import { RUTAS } from '@/shared/lib/rutas'
import type { SeccionDeConfiguracion } from '../secciones'
import { permisosDeLasLlenas } from './pestanas'

// La entrada de Configuración › Sitio web en el hub (8.01-3). Se abre con las claves de las pestañas llenas (`pestanas.ts`): mientras ninguna lo esté, la lista queda
// vacía y el hub no cambia (no hay tarjeta que lleve a una pantalla sin nada); al llenarse sólo «Ajustes», no la ve quien tiene sólo la clave del contenido. El tipo se
// trae con `import type`: el ciclo con `secciones.ts` es sólo de tipos y se borra al compilar.
export const SECCION_DE_WEB = {
  clave: 'web',
  titulo: 'Sitio web',
  descripcion:
    'Lo que muestra la web pública: los ajustes del sitio, los legales, las guías, las preguntas frecuentes y los testimonios.',
  ruta: RUTAS.configuracionDeWeb,
  Icono: GlobeIcon,
  permisos: permisosDeLasLlenas(),
} satisfies SeccionDeConfiguracion

export const SECCIONES_DE_WEB: readonly SeccionDeConfiguracion[] =
  SECCION_DE_WEB.permisos.length > 0 ? [SECCION_DE_WEB] : []
