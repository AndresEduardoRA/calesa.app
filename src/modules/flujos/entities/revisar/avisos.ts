// Los avisos de «Revisar» (`revisar_flujo`, 5.12): cómo se leen, se ordenan y se resumen. Los textos vienen de la base y nombran las fases; acá sólo el
// nivel decide el orden y el resumen. Sin I/O.
import { z } from 'zod'

export const NIVELES_DE_AVISO = ['error', 'aviso', 'info'] as const
export type NivelDeAviso = (typeof NIVELES_DE_AVISO)[number]

// Un flujo tiene decenas de fases: 200 avisos ya es un flujo roto entero. La lectura pide uno de más para saber si hay más (`cortarAlTope`).
export const TOPE_DE_AVISOS = 200

export type AvisoDeRevision = {
  nivel: NivelDeAviso
  // Un código nuevo de la base no rompe la lectura: la pantalla no decide nada por código.
  codigo: string
  mensaje: string
  // Nulo en lo que es de todo el flujo (`sin_inicial`, varias iniciales).
  faseId: string | null
}

const esquemaDeFilaDeRevision = z.object({
  nivel: z.enum(NIVELES_DE_AVISO),
  codigo: z.string(),
  mensaje: z.string(),
  fase_id: z.guid().nullable(),
})

// Las filas de la base; una que no se entiende vuelve `null` (la lectura lo dice como error), nunca una lista a medias.
export function avisosDesde(crudo: unknown): AvisoDeRevision[] | null {
  const leidas = z.array(esquemaDeFilaDeRevision).safeParse(crudo)
  return leidas.success
    ? leidas.data.map((f) => ({
        nivel: f.nivel,
        codigo: f.codigo,
        mensaje: f.mensaje,
        faseId: f.fase_id,
      }))
    : null
}

const PESO: Record<NivelDeAviso, number> = { error: 0, aviso: 1, info: 2 }

// Error › aviso › información; dentro del nivel por el texto, para que la lista no salte entre lecturas (la base no promete orden). No toca la entrada.
export function ordenarAvisos(avisos: readonly AvisoDeRevision[]): AvisoDeRevision[] {
  return [...avisos].sort(
    (a, b) => PESO[a.nivel] - PESO[b.nivel] || a.mensaje.localeCompare(b.mensaje, 'es'),
  )
}

export type ResumenDeAvisos = { texto: string; nivel: 'error' | 'aviso' | 'ok' }

function contar(n: number, singular: string, plural: string): string {
  return n === 1 ? `1 ${singular}` : `${String(n)} ${plural}`
}

// «Todo en orden», «1 error y 3 avisos»: la franja cerrada. Las de información no cuentan (describen, no son un problema). Con más del tope no hay total.
export function resumenDeAvisos(
  avisos: readonly AvisoDeRevision[],
  hayMas: boolean,
): ResumenDeAvisos {
  const errores = avisos.filter((a) => a.nivel === 'error').length
  const deAviso = avisos.filter((a) => a.nivel === 'aviso').length
  const nivel = errores > 0 ? 'error' : deAviso > 0 ? 'aviso' : 'ok'
  if (hayMas) {
    return { texto: `Más de ${String(TOPE_DE_AVISOS)} avisos`, nivel }
  }
  const partes = [
    errores > 0 ? contar(errores, 'error', 'errores') : null,
    deAviso > 0 ? contar(deAviso, 'aviso', 'avisos') : null,
  ].filter((p) => p !== null)
  return { texto: partes.length > 0 ? partes.join(' y ') : 'Todo en orden', nivel }
}
