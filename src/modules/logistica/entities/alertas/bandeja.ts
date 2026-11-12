import { z } from 'zod'
import { fallo, MENSAJE_INESPERADO, ok, type Resultado } from '@/shared/lib/errores'
import { textoDeDiasEnLaFase } from '../nucleo/dias-en-la-fase'

// La bandeja de logística en Inicio (6.12-2): lo que devuelve `logistica_bandeja(p_tope)` (6.12-1), validado con Zod en el borde (ids con `z.guid()`,
// fechas como texto ISO; su `Returns` es `Json`). Tres listas cortas, cada una con `hayMas` y nunca un total. Puro: ninguna lectura.

export type FilaDemorada = {
  id: string
  titulo: string
  origenId: string
  fase: string
  faseDesde: string | null
}

export type FilaTrabada = {
  id: string
  titulo: string
  fase: string
  faseSiguiente: string
  motivo: string
}

export type FilaPorAprobar = {
  // El documento; la fila abre el panel de su vehículo.
  id: string
  vehiculoId: string
  titulo: string
  tipo: string
  creadoEn: string
}

export type ListaDeLaBandeja<F> = { filas: F[]; hayMas: boolean }

export type BandejaDeLogistica = {
  demoradas: ListaDeLaBandeja<FilaDemorada>
  trabados: ListaDeLaBandeja<FilaTrabada>
  porAprobar: ListaDeLaBandeja<FilaPorAprobar>
}

/** Lee la bandeja con `tope` filas por lista (la base lo acota a 5…20). */
export type LectorDeLaBandeja = (tope: number) => Promise<Resultado<BandejaDeLogistica>>

const lista = <T extends z.ZodType>(fila: T) =>
  z.object({ filas: z.array(fila), hay_mas: z.boolean() })

const esquemaDeLaBandeja = z.object({
  demoradas: lista(
    z.object({
      id: z.guid(),
      titulo: z.string(),
      origen_id: z.guid(),
      fase: z.string(),
      fase_desde: z.string().nullable(),
    }),
  ),
  trabados: lista(
    z.object({
      id: z.guid(),
      titulo: z.string(),
      fase: z.string(),
      fase_siguiente: z.string(),
      motivo: z.string(),
    }),
  ),
  por_aprobar: lista(
    z.object({
      id: z.guid(),
      vehiculo_id: z.guid(),
      titulo: z.string(),
      tipo: z.string(),
      creado_en: z.string(),
    }),
  ),
})

/** La bandeja que devolvió `logistica_bandeja()`; `inesperado` si alguna lista no tiene la forma esperada. */
export function bandejaDesde(datos: unknown): Resultado<BandejaDeLogistica> {
  const leida = esquemaDeLaBandeja.safeParse(datos)
  if (!leida.success) return fallo('inesperado', MENSAJE_INESPERADO)
  const { demoradas, trabados, por_aprobar } = leida.data
  return ok({
    demoradas: {
      filas: demoradas.filas.map((f) => ({
        id: f.id,
        titulo: f.titulo,
        origenId: f.origen_id,
        fase: f.fase,
        faseDesde: f.fase_desde,
      })),
      hayMas: demoradas.hay_mas,
    },
    trabados: {
      filas: trabados.filas.map((f) => ({
        id: f.id,
        titulo: f.titulo,
        fase: f.fase,
        faseSiguiente: f.fase_siguiente,
        motivo: f.motivo,
      })),
      hayMas: trabados.hay_mas,
    },
    porAprobar: {
      filas: por_aprobar.filas.map((f) => ({
        id: f.id,
        vehiculoId: f.vehiculo_id,
        titulo: f.titulo,
        tipo: f.tipo,
        creadoEn: f.creado_en,
      })),
      hayMas: por_aprobar.hay_mas,
    },
  })
}

/** «Tránsito» · Desde hace 3 días en esta fase (el mismo texto que el panel de la unidad). */
export function detalleDeDemorada(
  fila: Pick<FilaDemorada, 'fase' | 'faseDesde'>,
  ahora: Date = new Date(),
): string {
  const dias = textoDeDiasEnLaFase(fila.faseDesde, ahora)
  return dias ? `«${fila.fase}» · ${dias}` : `«${fila.fase}»`
}

/** Falta para «Aduana»: Documento: BL (el motivo lo arma la base). */
export function detalleDeTrabado(fila: Pick<FilaTrabada, 'faseSiguiente' | 'motivo'>): string {
  return `Falta para «${fila.faseSiguiente}»: ${fila.motivo}`
}
