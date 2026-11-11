// Integraciones: un interruptor y su configuración no secreta. El secreto (la clave de la API o el
// secreto de revalidación)
// vive en Vault; de él la app sólo sabe cuándo se guardó (docs/DECISIONES.md).
import { z } from 'zod'
import { PLATAFORMAS_APIBARA, type PlataformaApibara } from '@/shared/lib/apibara'
import type { Tables } from '@/shared/types/database.types'

export const CLAVES_INTEGRACION = ['apibara', 'push_web', 'web_publica'] as const
export type ClaveIntegracion = (typeof CLAVES_INTEGRACION)[number]

export type Integracion = {
  clave: ClaveIntegracion
  activa: boolean
  // Lo no secreto. Su forma depende de la integración.
  config: unknown
  // ISO. Cuándo se guardó su secreto en Vault, o null si todavía no hay.
  secretoGuardadoEn: string | null
  // ISO. La versión de la integración.
  actualizadoEn: string
}

function esClave(clave: string): clave is ClaveIntegracion {
  return (CLAVES_INTEGRACION as readonly string[]).includes(clave)
}

// Una fila con una clave que este código no conoce (de una versión más nueva) se ignora.
export function integracionesDesde(filas: readonly Tables<'integraciones'>[]): Integracion[] {
  return filas.flatMap((fila) =>
    esClave(fila.clave)
      ? [
          {
            clave: fila.clave,
            activa: fila.activa,
            config: fila.config,
            secretoGuardadoEn: fila.secreto_guardado_en,
            actualizadoEn: fila.actualizado_en,
          },
        ]
      : [],
  )
}

// --- apibara: trae la ficha de un vehículo de subasta a partir de su link o su lote ------------

// La lista vive en `shared`: los orígenes de subasta también la usan y no pueden importar `empresa`.
export { PLATAFORMAS_APIBARA, type PlataformaApibara }

// A esta dirección manda la edge function la clave de la API. Por eso no puede ser cualquiera:
// quien pudiera apuntarla a otro sitio se llevaría la clave sin haberla leído. La base repite la
// regla (`integracion_guardar`).
const DOMINIO_DE_APIBARA = 'apibara.tech'

export function esDireccionDeApibara(direccion: string): boolean {
  try {
    const url = new URL(direccion)
    const delDominio =
      url.hostname === DOMINIO_DE_APIBARA || url.hostname.endsWith(`.${DOMINIO_DE_APIBARA}`)
    return url.protocol === 'https:' && delDominio && url.username === '' && url.password === ''
  } catch {
    return false
  }
}

export const esquemaConfigApibara = z.object({
  endpoint: z.string().trim().refine(esDireccionDeApibara, {
    error: 'La dirección tiene que empezar con https:// y ser de apibara.tech.',
  }),
  plataformas: z
    .array(z.enum(PLATAFORMAS_APIBARA))
    .min(1, { error: 'Elige al menos una plataforma.' }),
})

export type ConfigApibara = z.infer<typeof esquemaConfigApibara>

export const CONFIG_APIBARA_POR_DEFECTO: ConfigApibara = {
  endpoint: 'https://apibara.tech/api/v1/vehicle-auction',
  plataformas: ['copart', 'iaai'],
}

// La configuración guardada, o la de fábrica si no tiene la forma esperada.
export function configDeApibara(config: unknown): ConfigApibara {
  const leida = esquemaConfigApibara.safeParse(config)
  return leida.success ? leida.data : CONFIG_APIBARA_POR_DEFECTO
}

// --- web pública: la base le avisa al sitio qué parte cambió (job `web-revalidar`) -----------

// Lo mismo que acepta `integracion_guardar` para `web_publica`.
export const LARGO_MAXIMO_DIRECCION = 2000

// Espejo del `limit 51` de `web_publica_vehiculos_que_cambian()`.
export const TOPE_DE_VEHICULOS_QUE_CAMBIAN = 50

const DIRECCION_IPV4 = /^(\d+)\.(\d+)\.(\d+)\.(\d+)$/

// [primer octeto, segundo desde, segundo hasta]: las redes que no son internet.
const REDES_INTERNAS: readonly (readonly [number, number, number])[] = [
  [0, 0, 255],
  [10, 0, 255],
  [100, 64, 127],
  [169, 254, 254],
  [172, 16, 31],
  [192, 168, 168],
]

// El host ya normalizado por WHATWG (`2130706433` y `0x7f.1` llegan como `127.0.0.1`), sin el
// punto final que WHATWG conserva en un nombre (`localhost.`).
function hostDe(url: URL): string {
  return url.hostname.replace(/\.$/, '')
}

function esLoopback(host: string): boolean {
  if (host === 'localhost' || host.endsWith('.localhost')) return true
  return DIRECCION_IPV4.exec(host)?.[1] === '127'
}

function esRedInterna(host: string): boolean {
  if (host.startsWith('[')) return true
  const octetos = DIRECCION_IPV4.exec(host)
  if (!octetos) return false
  const primero = Number(octetos[1])
  const segundo = Number(octetos[2])
  return REDES_INTERNAS.some(
    ([a, desde, hasta]) => primero === a && segundo >= desde && segundo <= hasta,
  )
}

// «Probar» manda el secreto a esta dirección desde el servidor de la app: no puede apuntar a la
// red del servidor (SSRF). Es más estricta que la base, que sólo mira el protocolo; el loopback
// pasa sólo si quien llama lo permite (la base del despliegue es local: docs/pasos/8.06-2).
export function esDireccionDeRevalidacion(
  direccion: string,
  { loopback }: { loopback: boolean },
): boolean {
  if (direccion.length > LARGO_MAXIMO_DIRECCION) return false
  let url: URL
  try {
    url = new URL(direccion)
  } catch {
    return false
  }
  if (url.username !== '' || url.password !== '') return false
  const host = hostDe(url)
  if (esLoopback(host)) return loopback && (url.protocol === 'https:' || url.protocol === 'http:')
  return url.protocol === 'https:' && !esRedInterna(host)
}

// Si la dirección es de esta misma máquina. Con la de la base dice si el despliegue es local.
export function esDireccionLocal(direccion: string): boolean {
  try {
    return esLoopback(hostDe(new URL(direccion)))
  } catch {
    return false
  }
}

export const esquemaConfigWebPublica = z.object({ revalidar_url: z.string().nullable() })

export type ConfigWebPublica = z.infer<typeof esquemaConfigWebPublica>

// La dirección guardada, o ninguna.
export function configDeWebPublica(config: unknown): ConfigWebPublica {
  const leida = esquemaConfigWebPublica.safeParse(config)
  return leida.success ? leida.data : { revalidar_url: null }
}

// Lo mismo que exige `integracion_guardar_secreto()`.
export const LARGO_MINIMO_SECRETO = 8
export const LARGO_MAXIMO_SECRETO = 500

// apibara no se activa sin su clave: prendida sin ella, cada alta por link fallaría.
export function puedeActivarse(integracion: Pick<Integracion, 'clave' | 'secretoGuardadoEn'>) {
  return integracion.clave !== 'apibara' || integracion.secretoGuardadoEn !== null
}
