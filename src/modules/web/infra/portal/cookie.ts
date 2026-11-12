// La cookie de la sesión del portal: `<cuerpo>.<firma>`, los dos en base64url. El cuerpo es `{ l: lead_id, o: otorgado_en, e: vence }`
// (`e` en segundos Unix) y la firma, HMAC-SHA256 del cuerpo con `PORTAL_COOKIE_SECRETO`. Pura: recibe el secreto y la hora (lo ata
// `areas/portal/composicion.ts`). La revoca la base al volver a otorgar el acceso: cambia `otorgado_en` y `_portal_vigente` la rechaza.
import { createHmac, timingSafeEqual } from 'node:crypto'
import { z } from 'zod'
import {
  DURACION_DE_LA_SESION_S,
  otorgadoEnDelPortal,
  type SesionDelPortal,
} from '../../entities/portal/sesion'

const LARGO_MINIMO_DEL_SECRETO = 32
// Una válida ronda los 170 caracteres: lo que pase de esto se descarta antes de calcular nada.
const LARGO_MAXIMO_DEL_VALOR = 1024
// Sólo el alfabeto base64url: así el largo en caracteres es el largo en bytes y `timingSafeEqual` nunca lanza.
const BASE64URL = /^[A-Za-z0-9_-]+$/

const cuerpoDeLaCookie = z.strictObject({
  l: z.guid(),
  o: otorgadoEnDelPortal,
  e: z.int().positive(),
})

function firmar(cuerpo: string, secreto: string): string {
  return createHmac('sha256', secreto).update(cuerpo).digest('base64url')
}

export function firmarSesion(sesion: SesionDelPortal, secreto: string, ahora: Date): string {
  if (secreto.length < LARGO_MINIMO_DEL_SECRETO) {
    throw new Error('El secreto de la cookie del portal es demasiado corto.')
  }
  const e = Math.floor(ahora.getTime() / 1000) + DURACION_DE_LA_SESION_S
  const cuerpo = Buffer.from(
    JSON.stringify({ l: sesion.lead_id, o: sesion.otorgado_en, e }),
  ).toString('base64url')
  return `${cuerpo}.${firmar(cuerpo, secreto)}`
}

// El cuerpo de un valor bien firmado, o nulo: forma, alfabeto y firma en tiempo constante.
function cuerpoFirmado(valor: unknown, secreto: string): string | null {
  if (typeof valor !== 'string' || valor === '' || valor.length > LARGO_MAXIMO_DEL_VALOR) {
    return null
  }
  if (secreto.length < LARGO_MINIMO_DEL_SECRETO) return null
  const partes = valor.split('.')
  if (partes.length !== 2) return null
  const [cuerpo = '', firma = ''] = partes
  if (!BASE64URL.test(cuerpo) || !BASE64URL.test(firma)) return null
  // Se compara el texto, no los bytes decodificados: el último carácter de 32 bytes en base64url lleva dos bits sueltos, y
  // decodificar aceptaría ese carácter cambiado.
  const esperada = Buffer.from(firmar(cuerpo, secreto))
  const recibida = Buffer.from(firma)
  if (esperada.length !== recibida.length || !timingSafeEqual(esperada, recibida)) return null
  return cuerpo
}

// Cualquier fallo da `null`, sin decir cuál: quien llama responde 401 igual en todos los casos.
export function leerSesion(
  valor: string | null | undefined,
  secreto: string,
  ahora: Date,
): SesionDelPortal | null {
  const cuerpo = cuerpoFirmado(valor, secreto)
  if (cuerpo === null) return null
  let datos: unknown
  try {
    datos = JSON.parse(Buffer.from(cuerpo, 'base64url').toString('utf8'))
  } catch {
    return null
  }
  const leido = cuerpoDeLaCookie.safeParse(datos)
  if (!leido.success || leido.data.e * 1000 <= ahora.getTime()) return null
  return { lead_id: leido.data.l, otorgado_en: leido.data.o }
}
