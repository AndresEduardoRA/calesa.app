import { ENLACE_DE_ADUANA } from '@/modules/logistica/pantallas/aduana-enlace'
import { ENLACE_DE_DINERO } from '@/modules/logistica/pantallas/dinero-enlace'
import { ENLACE_DE_TRANSPORTE } from '@/modules/logistica/pantallas/transporte-enlace'
import { puede, type Permisos } from '@/shared/lib/permisos'
import { RUTAS } from '@/shared/lib/rutas'

export type EnlaceDelMenu = { titulo: string; ruta: string }

// Los enlaces de la sub-navegación de `/logistica`, en este orden: Cadena (siempre, con `logistica.ver` en algún origen) y, de las áreas, los que ya tienen página
// (`ENLACE_DE_<ÁREA>` no nulo) y cuyo permiso tiene la persona.
export function enlacesDeLogistica(permisos: Permisos): EnlaceDelMenu[] {
  if (!puede(permisos, 'logistica.ver')) return []
  const deLasAreas = [ENLACE_DE_TRANSPORTE, ENLACE_DE_ADUANA, ENLACE_DE_DINERO].flatMap((enlace) =>
    enlace !== null && puede(permisos, enlace.permiso)
      ? [{ titulo: enlace.titulo, ruta: enlace.ruta }]
      : [],
  )
  return [{ titulo: 'Cadena', ruta: RUTAS.logistica }, ...deLasAreas]
}
