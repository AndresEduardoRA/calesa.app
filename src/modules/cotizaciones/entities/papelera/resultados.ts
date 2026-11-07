// Lo que responden enviar (4.24-3), restaurar (4.24-2) y purgar (4.24-2b) de la papelera de cotizaciones y cómo se dice. Lo leen `envioDesde()`,
// `restauracionDesde()` y `purgaDesde()` de lo que devuelven `cotizaciones_papelera_*()`; `resumenDe*()` lo pone en palabras, entero: lo que se hizo y, de lo que
// no, el motivo de cada una.
import { z } from 'zod'
import type { CodigoError, ErrorApp } from '@/shared/lib/errores'

type Hecha = { id: string; numero: number; titulo: string }
type NoHecha = Hecha & { motivo: string }

export type ResultadoDeRestaurar = {
  actualizadoEn: string
  restaurados: Hecha[]
  // Lo que choca (una versión nueva cuando ya hay otra, una final cuando el vehículo ya tiene otra, un vehículo o cliente en la papelera o que ya no
  // existe): sigue en la papelera, con su motivo.
  pendientes: NoHecha[]
  quedan: number
}

const hecha = z.object({ id: z.guid(), numero: z.number().int(), titulo: z.string() })
const noHecha = hecha.extend({ motivo: z.string() })

const esquemaRestauracion = z.object({
  actualizado_en: z.string(),
  restaurados: z.array(hecha),
  pendientes: z.array(noHecha),
  quedan: z.number().int().nonnegative(),
})

export function restauracionDesde(crudo: unknown): ResultadoDeRestaurar | null {
  const leido = esquemaRestauracion.safeParse(crudo)
  if (!leido.success) {
    return null
  }
  const f = leido.data
  return {
    actualizadoEn: f.actualizado_en,
    restaurados: f.restaurados,
    pendientes: f.pendientes,
    quedan: f.quedan,
  }
}

export type ResultadoDePurgar = {
  actualizadoEn: string
  purgados: Hecha[]
  // Lo que otra tabla necesita (una final con su comprobante): sigue en la papelera, con su motivo.
  bloqueados: NoHecha[]
  quedan: number
}

const esquemaPurga = z.object({
  actualizado_en: z.string(),
  purgados: z.array(hecha),
  bloqueados: z.array(noHecha),
  quedan: z.number().int().nonnegative(),
})

export function purgaDesde(crudo: unknown): ResultadoDePurgar | null {
  const leido = esquemaPurga.safeParse(crudo)
  if (!leido.success) {
    return null
  }
  const f = leido.data
  return {
    actualizadoEn: f.actualizado_en,
    purgados: f.purgados,
    bloqueados: f.bloqueados,
    quedan: f.quedan,
  }
}

// Cuántos motivos se escriben antes de resumir el resto.
const MOTIVOS_A_LA_VISTA = 3

type Palabras = {
  // Una sola, por su título.
  una: (titulo: string) => string
  singular: string
  plural: string
  noSeHizo: string
}

// El resultado, dicho entero: una sola, por su título; varias, cuántas (y de cuántas si alguna no se hizo); y el motivo de las que no, hasta tres.
function resumir(
  hechas: readonly Hecha[],
  noHechas: readonly NoHecha[],
  palabras: Palabras,
): string {
  const total = hechas.length + noHechas.length
  const frases: string[] = []
  const [unica] = hechas
  if (total === 1 && unica) {
    frases.push(palabras.una(unica.titulo))
  } else if (hechas.length > 0) {
    const cuenta = `${hechas.length === 1 ? palabras.singular : palabras.plural} ${String(hechas.length)}`
    frases.push(`${cuenta}${noHechas.length > 0 ? ` de ${String(total)}` : ''}.`)
  } else if (total > 1) {
    frases.push(`${palabras.noSeHizo} ninguna.`)
  }
  for (const una of noHechas.slice(0, MOTIVOS_A_LA_VISTA)) {
    frases.push(`${palabras.noSeHizo} «${una.titulo}»: ${una.motivo}`)
  }
  const resto = noHechas.length - MOTIVOS_A_LA_VISTA
  if (resto > 0) {
    frases.push(`Y ${String(resto)} más.`)
  }
  return frases.join(' ')
}

export function resumenDeRestauracion(restauracion: ResultadoDeRestaurar): string {
  return resumir(restauracion.restaurados, restauracion.pendientes, {
    una: (titulo) => `«${titulo}» volvió a tus cotizaciones.`,
    singular: 'Se restauró',
    plural: 'Se restauraron',
    noSeHizo: 'No se restauró',
  })
}

export function resumenDePurga(purga: ResultadoDePurgar): string {
  return resumir(purga.purgados, purga.bloqueados, {
    una: (titulo) => `«${titulo}» se purgó.`,
    singular: 'Se purgó',
    plural: 'Se purgaron',
    noSeHizo: 'No se purgó',
  })
}

// Enviar (4.24-3). La base devuelve el título de una enviada tal cual (nulo si no tiene); aquí se completa como lo completan restaurar y purgar. Un rechazo trae
// el título sólo si quien llama la ve. Sin enviadas, el lote y su versión son nulos (no queda lote).
type Rechazo = { id: string; titulo: string | null; codigo: string; motivo: string }

export type ResultadoDeEnvio = {
  lote: string | null
  actualizadoEn: string | null
  enviados: Hecha[]
  rechazados: Rechazo[]
}

const esquemaEnvio = z.object({
  lote: z.guid().nullable(),
  actualizado_en: z.string().nullable(),
  enviados: z.array(
    z.object({ id: z.guid(), numero: z.number().int(), titulo: z.string().nullable() }),
  ),
  rechazados: z.array(
    z.object({
      id: z.guid(),
      titulo: z.string().nullable(),
      codigo: z.string(),
      motivo: z.string(),
    }),
  ),
})

export function envioDesde(crudo: unknown): ResultadoDeEnvio | null {
  const leido = esquemaEnvio.safeParse(crudo)
  if (!leido.success) {
    return null
  }
  const f = leido.data
  return {
    lote: f.lote,
    actualizadoEn: f.actualizado_en,
    enviados: f.enviados.map(({ id, numero, titulo }) => ({
      id,
      numero,
      titulo: titulo ?? `Cotización #${String(numero)}`,
    })),
    rechazados: f.rechazados,
  }
}

// Lo enviado: la guardada manda una, que se nombra por su título.
export function resumenDeEnvio(envio: ResultadoDeEnvio): string {
  const [unica, ...mas] = envio.enviados
  if (unica && mas.length === 0) {
    return `«${unica.titulo}» se envió a la papelera.`
  }
  return `Se enviaron ${String(envio.enviados.length)} a la papelera.`
}

const CODIGO_POR_RECHAZO: Partial<Record<string, CodigoError>> = {
  PT409: 'conflicto',
  '42501': 'sin_permiso',
}

// Sin enviadas, el resultado es un error con el motivo de la base (son textos nuestros: el PT409 dice quién la cambió y cuándo). Un conflicto ofrece «Recargar».
export function errorDeEnvio(envio: ResultadoDeEnvio): ErrorApp {
  const [primero] = envio.rechazados
  if (!primero) {
    return { codigo: 'regla', mensaje: 'No se pudo enviar.' }
  }
  return { codigo: CODIGO_POR_RECHAZO[primero.codigo] ?? 'regla', mensaje: primero.motivo }
}
