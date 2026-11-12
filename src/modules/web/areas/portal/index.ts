// La API de servidor del área `portal` de `web` (8.07): lo que usan los route handlers de `app/api/portal/*`. Sale por el `index.ts`
// de la raíz. El secreto de la cookie no sale: `portalDisponible()` dice si está.
export {
  cambiarClaveDelPortal,
  contarIntentoDelPortal,
  direccionDelSitioParaElPortal,
  firmarSesionDelPortal,
  ingresarAlPortal,
  leerEstadoDelPortal,
  leerSesionDelPortal,
  portalDisponible,
  urlDeDocumentoDelPortal,
} from './composicion'
export {
  COOKIE_DEL_PORTAL,
  DURACION_DE_LA_SESION_S,
  opcionesDeLaCookieDelPortal,
  type SesionDelPortal,
} from '../../entities/portal/sesion'
export type { IngresoDelPortal } from '../../entities/portal/repositorios'
