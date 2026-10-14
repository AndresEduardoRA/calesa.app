// El uso de la cuenta de apibara: cuántas consultas lleva el período y cuántas le quedan. Lo
// trae la edge function `apibara` (`/usage`), sólo a pedido de quien gestiona la empresa: pedirlo
// no es gratis para nadie que no lo necesite.
import { z } from 'zod'

export type UsoDeApibara = {
  plan: string | null
  usadas: number | null
  limite: number | null
  restantes: number | null
  // YYYY-MM-DD: hasta cuándo vale la cuota.
  hasta: string | null
}

const numero = z.number().finite().nullable().catch(null)

const esquemaUso = z.object({
  plan: z.string().nullable().catch(null),
  usadas: numero,
  limite: numero,
  restantes: numero,
  hasta: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}/)
    .nullable()
    .catch(null),
})

// Lo que devuelve la función dentro de `data`, o null si no tiene la forma esperada.
export function usoDesdeRespuesta(datos: unknown): UsoDeApibara | null {
  const leido = esquemaUso.safeParse(datos)
  if (!leido.success) {
    return null
  }
  const { hasta, ...resto } = leido.data
  return { ...resto, hasta: hasta ? hasta.slice(0, 10) : null }
}

// Los códigos con que puede fallar pedirlo, y cómo se dicen (con tuteo, sin signos de exclamación).
export const MENSAJES_DE_USO = {
  sin_permiso: 'No tienes permiso para ver el uso de apibara.',
  apagada: 'Guarda la clave de apibara y actívala para ver su uso.',
  clave_invalida: 'apibara rechazó la clave guardada. Reemplázala y vuelve a intentar.',
  cuota: 'Se agotó la cuota de consultas de apibara de este período.',
  tiempo: 'apibara tardó demasiado en responder. Vuelve a intentar.',
  proveedor: 'apibara tuvo un problema. Vuelve a intentar en un momento.',
  red: 'No se pudo llegar a apibara. Revisa tu conexión y vuelve a intentar.',
} as const

export type CodigoDeUso = keyof typeof MENSAJES_DE_USO

export function codigoDeUso(codigo: unknown): CodigoDeUso {
  return typeof codigo === 'string' && codigo in MENSAJES_DE_USO
    ? (codigo as CodigoDeUso)
    : 'proveedor'
}

// «Plan Test: 60 de 100 consultas usadas; quedan 40. La cuota vale hasta el 14 oct 2026.»
export function resumenDeUso(uso: UsoDeApibara, hasta: string | null): string {
  const partes: string[] = []
  const plan = uso.plan ? `Plan ${uso.plan}: ` : ''
  if (uso.usadas !== null && uso.limite !== null) {
    partes.push(`${plan}${String(uso.usadas)} de ${String(uso.limite)} consultas usadas`)
  } else if (uso.usadas !== null) {
    partes.push(`${plan}${String(uso.usadas)} consultas usadas`)
  }
  if (uso.restantes !== null) {
    partes.push(uso.restantes === 0 ? 'no quedan' : `quedan ${String(uso.restantes)}`)
  }
  const cuenta = partes.length > 0 ? `${partes.join('; ')}.` : 'apibara no informó el uso.'
  return hasta ? `${cuenta} La cuota vale hasta el ${hasta}.` : cuenta
}
