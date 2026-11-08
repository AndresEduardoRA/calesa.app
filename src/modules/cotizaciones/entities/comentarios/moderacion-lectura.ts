import { z } from 'zod'
import type { AccionDeModerar, EstadoDeLaCotizacion, MarcasDeLaCotizacion } from './moderacion'

// Lo que se lee y se manda de favorita, reportar y moderar (4.27-4), con Zod. Lo importan el servidor (la lectura de las marcas, las actions) y lo que se monta por
// `diferido()` (el modal de reportar, la lista de reportes del Confirmar); nunca un componente que viaja en frío con la guardada.

export const MOTIVO_MAXIMO = 500
// El texto de la base (`cotizacion_reportar`, 22023 `hint` `motivo`).
export const MENSAJE_DEL_MOTIVO = 'Cuéntanos qué está mal (hasta 500 caracteres).'

export const esquemaDelMotivo = z
  .string()
  .trim()
  .min(1, { error: MENSAJE_DEL_MOTIVO })
  .max(MOTIVO_MAXIMO, { error: MENSAJE_DEL_MOTIVO })

// Qué estado pide cada acción de moderar: descartar y reactivar dejan la cotización activa (y la base borra sus reportes).
export const ESTADO_DE_LA_ACCION: Record<
  AccionDeModerar,
  Exclude<EstadoDeLaCotizacion, 'reportada'>
> = {
  invalidar: 'invalida',
  descartar: 'activa',
  reactivar: 'activa',
}

const esquemaDelEstado = z.enum(['activa', 'reportada', 'invalida'])

const esquemaDeLasMarcas = z.object({
  cotizacion: z
    .array(z.object({ estado: esquemaDelEstado, reportes_count: z.int().min(0) }))
    .length(1),
  favoritos: z.array(z.object({ cotizacion_id: z.guid() })).max(1),
  reportes: z.array(z.object({ motivo: z.string().nullable() })).max(1),
})

// Las tres lecturas por clave primaria de la guardada (la fila, la favorita propia y el reporte propio) en una forma. Una forma rota es nulo: nunca un estado inventado.
export function marcasDesde(crudo: unknown): MarcasDeLaCotizacion | null {
  const leido = esquemaDeLasMarcas.safeParse(crudo)
  if (!leido.success) {
    return null
  }
  const { cotizacion, favoritos, reportes } = leido.data
  const fila = cotizacion[0]
  if (!fila) {
    return null
  }
  return {
    estado: fila.estado,
    reportesCount: fila.reportes_count,
    favorita: favoritos.length > 0,
    miMotivo: reportes[0] ? (reportes[0].motivo ?? '') : null,
  }
}

export type ReporteDeLaCotizacion = { motivo: string; creadoEn: string }

const esquemaDeLosReportes = z.array(
  z.object({ motivo: z.string().nullable(), creado_en: z.string().min(1) }),
)

// Los reportes que lee quien modera al abrir el Confirmar; uno sin motivo (de antes del 4.27-1) se dibuja vacío.
export function reportesDesde(crudo: unknown): ReporteDeLaCotizacion[] | null {
  const leido = esquemaDeLosReportes.safeParse(crudo)
  return leido.success
    ? leido.data.map((r) => ({ motivo: r.motivo ?? '', creadoEn: r.creado_en }))
    : null
}

export const esquemaDeLaFavorita = z.object({
  resultado: z.enum(['puesto', 'quitado', 'sin_cambios']),
  valor: z.boolean(),
})
export const esquemaDelReporte = z.object({
  resultado: z.enum(['reportada', 'motivo_cambiado', 'sin_cambios']),
})
export const esquemaDelRetiro = z.object({ resultado: z.enum(['retirado', 'sin_cambios']) })
export const esquemaDeLaModeracion = z.object({
  resultado: z.enum(['moderada', 'sin_cambios']),
  estado: esquemaDelEstado,
  actualizado_en: z.string().min(1),
})
