import { z } from 'zod'
import { disenoDe } from './hoja'
import { esquemaDeDiseno } from './hoja-esquema'
import type { HojaDeUnaGuardada } from './hoja-de-una-guardada'

// La respuesta de `cotizacion_hoja_guardada()` (4.15-2) leída con Zod, en la forma de `hoja-de-una-guardada.ts`. Sólo la importa el servidor (la lectura): el navegador recibe la
// hoja ya leída y no necesita los esquemas. Trae además la cadena (`anterior`, `encima`, `puede_cotizar_encima`) y la publicada de hoy (4.15-3b): una respuesta sin ellas no es lo que la base promete.

const esquemaDeLaCotizacion = z.object({
  id: z.guid(),
  numero: z.int(),
  clase: z.enum(['preventa', 'final']),
  version: z.int().positive(),
  origen_id: z.guid(),
  lead_id: z.guid().nullable(),
  vehiculo_id: z.guid().nullable(),
  modo_tc: z.string().nullable(),
  ver_total_bs: z.boolean(),
  titulo: z.string().nullable(),
  notas: z.string().nullable(),
  creado_en: z.string().min(1),
  actualizado_en: z.string().min(1),
})

const esquemaDeUnaVersion = z.object({ id: z.guid(), numero: z.int(), version: z.int().positive() })

const esquemaDeUnaGuardada = esquemaDeDiseno.extend({
  estado: z.literal('lista'),
  cotizacion: esquemaDeLaCotizacion,
  valores: z.record(z.string(), z.union([z.number(), z.string(), z.null()])),
  fuentes: z.record(z.string(), z.string()),
  totales: z.object({ usd: z.number().nullable().optional() }).optional(),
  puede_guardar: z.boolean(),
  vence_el: z.string().min(1),
  vencida: z.boolean(),
  publicada: z.object({ id: z.guid(), version: z.int().positive() }).nullable(),
  anterior: esquemaDeUnaVersion.nullable(),
  encima: z.union([esquemaDeUnaVersion, z.object({ oculta: z.literal(true) })]).nullable(),
  puede_cotizar_encima: z.boolean(),
})

// La respuesta de la base ya en la forma que usa la página, o nulo si no es lo que la base promete.
export function hojaDeUnaGuardadaDesde(crudo: unknown): HojaDeUnaGuardada | null {
  const leida = esquemaDeUnaGuardada.safeParse(crudo)
  if (!leida.success) {
    return null
  }
  const h = leida.data
  const c = h.cotizacion
  return {
    diseno: disenoDe(h),
    cotizacion: {
      id: c.id,
      numero: c.numero,
      clase: c.clase,
      version: c.version,
      origenId: c.origen_id,
      leadId: c.lead_id,
      vehiculoId: c.vehiculo_id,
      modoTc: c.modo_tc,
      verTotalBs: c.ver_total_bs,
      titulo: c.titulo,
      notas: c.notas,
      creadoEn: c.creado_en,
      actualizadoEn: c.actualizado_en,
    },
    guardado: {
      valores: new Map(Object.entries(h.valores)),
      fuentes: new Map(Object.entries(h.fuentes)),
      totalUsd: h.totales?.usd ?? null,
    },
    puedeGuardar: h.puede_guardar,
    venceEl: h.vence_el,
    vencida: h.vencida,
    publicada: h.publicada,
    cadena: { anterior: h.anterior, encima: h.encima, puedeCotizarEncima: h.puede_cotizar_encima },
  }
}
