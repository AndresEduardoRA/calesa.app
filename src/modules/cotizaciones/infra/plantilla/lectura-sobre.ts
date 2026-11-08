// Lo que lee el editor de la plantilla de la tarjeta de un origen, sobre el cliente que recibe (4.19-3a): las tres consultas en paralelo y cada fila leída con Zod.
// Sin `server-only`, para que una prueba la corra contra la base; `lectura.ts` la envuelve con el cliente de la sesión.
import type { SupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { errorDePostgrest, fallo, ok, type Resultado } from '@/shared/lib/errores'
import type { Database } from '@/shared/types/database.types'
import {
  contextoDeValidacion,
  esquemaDefinicionParaPlantilla,
  esquemaDisenoParaPlantilla,
  versionDePlantilla,
  type FormulaParaLaPlantilla,
  type PlantillaDelOrigen,
  type TonoDelCatalogo,
  type VersionDePlantilla,
} from '../../entities/plantilla/lectura-de-la-plantilla'
import {
  consultaDeLaFormulaPublicada,
  consultaDeLasPlantillas,
  consultaDeLosTonos,
} from './consulta-de-la-plantilla'

type Cliente = SupabaseClient<Database>
type Respuesta = { data: unknown; error: { code?: string | null; message: string } | null }

// Las dos horas llegan como texto y se quedan como texto: la versión esperada de las escrituras es ese texto, con sus microsegundos.
const esquemaDeLaFila = z.strictObject({
  id: z.guid(),
  estado: z.enum(['borrador', 'publicada']),
  version: z.number().int().nullable(),
  definicion: z.unknown(),
  nota: z.string().nullable(),
  actualizado_en: z.string().min(1),
  publicado_en: z.string().nullable(),
})

const esquemaDeLaFormula = z.strictObject({
  id: z.guid(),
  version: z.number().int(),
  definicion: z.unknown(),
  diseno: z.unknown(),
  visibilidad: z.unknown(),
})

const esquemaDeLosTonos = z.array(z.strictObject({ clave: z.string(), nombre: z.string() }))

const filas = (data: unknown): unknown[] => (Array.isArray(data) ? data : [])

const NO_SE_LEYO_LA_PLANTILLA = 'No pudimos leer la plantilla.'
const NO_SE_LEYO_LA_FORMULA = 'No pudimos leer la fórmula.'

// A lo sumo una de cada estado: dos del mismo estado, o uno ajeno, es algo que los índices únicos no dejan y no se esperaba.
function leerPlantillas(data: unknown): Resultado<{
  publicada: VersionDePlantilla | null
  borrador: VersionDePlantilla | null
}> {
  const leidas = z.array(esquemaDeLaFila).safeParse(filas(data))
  if (!leidas.success) return fallo('inesperado', NO_SE_LEYO_LA_PLANTILLA)
  const porEstado: Partial<Record<'borrador' | 'publicada', VersionDePlantilla>> = {}
  for (const fila of leidas.data) {
    if (porEstado[fila.estado] !== undefined) return fallo('inesperado', NO_SE_LEYO_LA_PLANTILLA)
    porEstado[fila.estado] = versionDePlantilla({
      id: fila.id,
      version: fila.version,
      nota: fila.nota,
      actualizadoEn: fila.actualizado_en,
      publicadoEn: fila.publicado_en,
      definicion: fila.definicion,
    })
  }
  return ok({ publicada: porEstado.publicada ?? null, borrador: porEstado.borrador ?? null })
}

// Un valor que puede ser nulo y, si no lo es, tiene que pasar su Zod.
function opcional<T>(
  esquema: z.ZodType<T>,
  valor: unknown,
): { ok: true; valor: T | null } | { ok: false } {
  if (valor === null) return { ok: true, valor: null }
  const leido = esquema.safeParse(valor)
  return leido.success ? { ok: true, valor: leido.data } : { ok: false }
}

const esquemaDeLaVisibilidad = z.record(z.string(), z.unknown())

// La definición y el diseño, con lo que mira el validador (lo que no lo tiene no se puede validar contra); la visibilidad compilada es un objeto o nula.
function leerFormula(data: unknown): Resultado<FormulaParaLaPlantilla | null> {
  const [primera] = filas(data)
  if (primera === undefined) return ok(null)
  const fila = esquemaDeLaFormula.safeParse(primera)
  const definicion = esquemaDefinicionParaPlantilla.safeParse(fila.data?.definicion)
  const diseno = opcional(esquemaDisenoParaPlantilla, fila.data?.diseno)
  const visibilidad = opcional(esquemaDeLaVisibilidad, fila.data?.visibilidad)
  if (!fila.success || !definicion.success || !diseno.ok || !visibilidad.ok) {
    return fallo('inesperado', NO_SE_LEYO_LA_FORMULA)
  }
  return ok({
    id: fila.data.id,
    version: fila.data.version,
    definicion: definicion.data,
    diseno: diseno.valor,
    visibilidad: visibilidad.valor,
  })
}

function leerTonos(data: unknown): Resultado<readonly TonoDelCatalogo[]> {
  const leidos = esquemaDeLosTonos.safeParse(filas(data))
  return leidos.success ? ok(leidos.data) : fallo('inesperado', 'No pudimos leer los tonos.')
}

// El primer error de las tres (en el orden plantillas, fórmula, tonos): una lectura que falla sube al `error.tsx` de la ruta, con `datosO()`.
const falla = (respuestas: Respuesta[]) => respuestas.find((r) => r.error !== null)?.error ?? null

export async function leerPlantillaSobre(
  cliente: Cliente,
  origenId: string,
): Promise<Resultado<PlantillaDelOrigen>> {
  if (!z.guid().safeParse(origenId).success) {
    return fallo('validacion', 'Ese origen no es válido.')
  }
  const respuestas = await Promise.all([
    consultaDeLasPlantillas(cliente, origenId),
    consultaDeLaFormulaPublicada(cliente, origenId),
    consultaDeLosTonos(cliente),
  ])
  const error = falla(respuestas)
  if (error !== null) return { ok: false, error: errorDePostgrest(error) }
  const [dePlantillas, deLaFormula, deLosTonos] = respuestas
  const plantillas = leerPlantillas(dePlantillas.data)
  if (!plantillas.ok) return plantillas
  const formula = leerFormula(deLaFormula.data)
  if (!formula.ok) return formula
  const tonos = leerTonos(deLosTonos.data)
  if (!tonos.ok) return tonos
  return ok({
    ...plantillas.data,
    formula: formula.data === null ? null : { id: formula.data.id, version: formula.data.version },
    contexto: contextoDeValidacion(formula.data, tonos.data),
    tonos: tonos.data,
  })
}
