// Integraciones: un interruptor y su configuración no secreta. El secreto (la clave de la API)
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

// Lo mismo que exige `integracion_guardar_secreto()`.
export const LARGO_MINIMO_SECRETO = 8
export const LARGO_MAXIMO_SECRETO = 500

// apibara no se activa sin su clave: prendida sin ella, cada alta por link fallaría.
export function puedeActivarse(integracion: Pick<Integracion, 'clave' | 'secretoGuardadoEn'>) {
  return integracion.clave !== 'apibara' || integracion.secretoGuardadoEn !== null
}
