// Lo que responde restaurar de la papelera de cotizaciones y cómo se dice (4.24-2). Lo lee `restauracionDesde()` de lo que devuelve
// `cotizaciones_papelera_restaurar()`; `resumenDeRestauracion()` lo pone en palabras, entero: lo que volvió y, de lo que no, el motivo de cada una.
import { z } from 'zod'

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

// Cuántos motivos se escriben antes de resumir el resto.
const MOTIVOS_A_LA_VISTA = 3

// El resultado, dicho entero: una sola, por su título; varias, cuántas (y de cuántas si alguna no volvió); y el motivo de las que no, hasta tres.
export function resumenDeRestauracion(restauracion: ResultadoDeRestaurar): string {
  const { restaurados, pendientes } = restauracion
  const total = restaurados.length + pendientes.length
  const frases: string[] = []
  const [unica] = restaurados
  if (total === 1 && unica) {
    frases.push(`«${unica.titulo}» volvió a tus cotizaciones.`)
  } else if (restaurados.length > 0) {
    const cuenta = `${restaurados.length === 1 ? 'Se restauró' : 'Se restauraron'} ${String(restaurados.length)}`
    frases.push(`${cuenta}${pendientes.length > 0 ? ` de ${String(total)}` : ''}.`)
  } else if (total > 1) {
    frases.push('No se restauró ninguna.')
  }
  for (const una of pendientes.slice(0, MOTIVOS_A_LA_VISTA)) {
    frases.push(`No se restauró «${una.titulo}»: ${una.motivo}`)
  }
  const resto = pendientes.length - MOTIVOS_A_LA_VISTA
  if (resto > 0) {
    frases.push(`Y ${String(resto)} más.`)
  }
  return frases.join(' ')
}
