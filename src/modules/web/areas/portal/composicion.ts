// Composición en el servidor del área `portal` de `web` (8.07): qué implementación recibe cada interfaz de
// `entities/portal/repositorios`. Ata el secreto de la cookie: ningún handler lo ve. Sale por la `composicion.ts` de la raíz.
import 'server-only'
import type {
  CambioDeClaveDelPortal,
  ContadorDeIntentosDelPortal,
  FirmaDeSesionDelPortal,
  IngresoAlPortal,
  LecturaDeSesionDelPortal,
  LectorDeDireccionDelSitioParaElPortal,
  LectorDeEstadoDelPortal,
  UrlDeDocumentoDelPortal,
} from '../../entities/portal/repositorios'
import { firmarSesion, leerSesion } from '../../infra/portal/cookie'
import {
  cambiarClave,
  contarIntento,
  ingresar,
  leerDireccionDelSitio,
  leerEstado,
  urlDeDocumento,
} from '../../infra/portal/rpc'
import { secretoDelPortal } from '../../infra/portal/secreto'

export const contarIntentoDelPortal: ContadorDeIntentosDelPortal = contarIntento
export const ingresarAlPortal: IngresoAlPortal = ingresar
export const leerEstadoDelPortal: LectorDeEstadoDelPortal = leerEstado
export const urlDeDocumentoDelPortal: UrlDeDocumentoDelPortal = urlDeDocumento
export const cambiarClaveDelPortal: CambioDeClaveDelPortal = cambiarClave
export const direccionDelSitioParaElPortal: LectorDeDireccionDelSitioParaElPortal =
  leerDireccionDelSitio

// Sin `PORTAL_COOKIE_SECRETO` el portal no está disponible: el handler responde 503 antes de firmar o leer.
export function portalDisponible(): boolean {
  return secretoDelPortal() !== null
}

export const firmarSesionDelPortal: FirmaDeSesionDelPortal = (sesion, ahora) => {
  const secreto = secretoDelPortal()
  if (secreto === null) throw new Error('El portal no tiene PORTAL_COOKIE_SECRETO.')
  return firmarSesion(sesion, secreto, ahora)
}

export const leerSesionDelPortal: LecturaDeSesionDelPortal = (valor, ahora) => {
  const secreto = secretoDelPortal()
  return secreto === null ? null : leerSesion(valor, secreto, ahora)
}
