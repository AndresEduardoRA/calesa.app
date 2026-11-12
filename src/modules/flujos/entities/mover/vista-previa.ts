// Lo que devuelven `previsualizar_cambio_fase`, `previsualizar_cambio_fase_lote` y `cambiar_fase_lote` (6.02), validado en el borde con Zod (ids con
// `z.guid()`). Una forma que no cumple es un error visible (`inesperado`), nunca una vista a medias: un botón de mover no se habilita con lo que no se entiende.
import { z } from 'zod'
import { fallo, MENSAJE_INESPERADO, ok, type Resultado } from '@/shared/lib/errores'

const esquemaDeRequisito = z.object({
  requisito_id: z.guid(),
  tipo: z.enum(['documento', 'dato', 'espera']),
  bloqueante: z.boolean(),
  descripcion: z.string(),
  cumplido: z.boolean(),
  detalle: z.record(z.string(), z.unknown()).nullable(),
})

const esquemaDeVista = z.object({
  ok: z.boolean(),
  motivos: z.array(z.string()),
  codigos: z.array(z.string()),
  fase_actual: z.guid().nullable(),
  requisitos: z.array(esquemaDeRequisito),
  faltan: z.array(esquemaDeRequisito),
  nota_obligatoria: z.boolean(),
})

const esquemaDeVistaDelLote = z.array(esquemaDeVista.extend({ vehiculo_id: z.guid() }))

const esquemaDeFilaDelLote = z.array(
  z.object({
    vehiculo_id: z.guid(),
    ok: z.boolean(),
    codigo: z.string().nullable(),
    motivo: z.string().nullable(),
    historial_id: z.number().nullable(),
  }),
)

export type RequisitoVista = {
  requisitoId: string
  tipo: 'documento' | 'dato' | 'espera'
  bloqueante: boolean
  // Tal como la arma la base: «Documento: BL», «Dato: vehiculo.vin», «Espera: Embarcado». La frase para la persona sale de `requisitos.ts`.
  descripcion: string
  cumplido: boolean
  detalle: Record<string, unknown>
}

export type VistaPrevia = {
  ok: boolean
  // Alineados: `codigos[i]` es el código de `motivos[i]` (`acceso`, `transicion`, `rol`, `requisitos`, `nota`…).
  motivos: string[]
  codigos: string[]
  faseActual: string | null
  requisitos: RequisitoVista[]
  // Los bloqueantes sin cumplir.
  faltan: RequisitoVista[]
  notaObligatoria: boolean
}

export type VistaPreviaDeUnaUnidad = VistaPrevia & { vehiculoId: string }

// El resultado de mover una unidad dentro de un lote: `codigo` es el `hint` del rechazo de la base.
export type FilaDelLote = {
  vehiculoId: string
  ok: boolean
  codigo: string | null
  motivo: string | null
  historialId: number | null
}

type Requisito = z.infer<typeof esquemaDeRequisito>
type Vista = z.infer<typeof esquemaDeVista>

function requisito(r: Requisito): RequisitoVista {
  return {
    requisitoId: r.requisito_id,
    tipo: r.tipo,
    bloqueante: r.bloqueante,
    descripcion: r.descripcion,
    cumplido: r.cumplido,
    detalle: r.detalle ?? {},
  }
}

function vista(v: Vista): VistaPrevia {
  return {
    ok: v.ok,
    motivos: v.motivos,
    codigos: v.codigos,
    faseActual: v.fase_actual,
    requisitos: v.requisitos.map(requisito),
    faltan: v.faltan.map(requisito),
    notaObligatoria: v.nota_obligatoria,
  }
}

/** La vista previa de una unidad hacia una fase, o el error si la forma no es la esperada. */
export function vistaPreviaDesde(dato: unknown): Resultado<VistaPrevia> {
  const leida = esquemaDeVista.safeParse(dato)
  return leida.success ? ok(vista(leida.data)) : fallo('inesperado', MENSAJE_INESPERADO)
}

/** La vista previa de un lote, una por unidad y en el orden en que se pidieron. */
export function vistaPreviaDelLoteDesde(dato: unknown): Resultado<VistaPreviaDeUnaUnidad[]> {
  const leida = esquemaDeVistaDelLote.safeParse(dato)
  if (!leida.success) return fallo('inesperado', MENSAJE_INESPERADO)
  return ok(leida.data.map((v) => ({ ...vista(v), vehiculoId: v.vehiculo_id })))
}

/** Lo que pasó con cada unidad de un lote movido, en el orden del pedido. */
export function filasDelLoteDesde(dato: unknown): Resultado<FilaDelLote[]> {
  const leida = esquemaDeFilaDelLote.safeParse(dato)
  if (!leida.success) return fallo('inesperado', MENSAJE_INESPERADO)
  return ok(
    leida.data.map((f) => ({
      vehiculoId: f.vehiculo_id,
      ok: f.ok,
      codigo: f.codigo,
      motivo: f.motivo,
      historialId: f.historial_id,
    })),
  )
}
