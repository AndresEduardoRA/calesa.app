import { z } from 'zod'

// Lo que cruza el límite de las fases: la forma y la lista cerrada de claves (`_fase_forma()`). Lo que vale cada dato (largo, repetido, el alias del
// portal, las reglas del flujo) lo dice la base con el campo en el `hint`.
const version = z.string().min(1)
// Nulo = el flujo de repuestos (no tiene origen). La action lo necesita para exigir el permiso antes de escribir; la base lo vuelve a exigir.
const origenId = z.guid().nullable()

const texto = z.string().max(2000)
const entero = z.number().int().nullable()

// Las claves de `p_datos` y `p_cambios`. Ninguna otra (`activa`, `orden`, `flujo_id`) pasa: la base las rechaza igual.
const datos = {
  nombre: texto,
  descripcion: texto.nullable(),
  color: z.string().max(20),
  icono: z.string().max(100).nullable(),
  demora_dias: entero,
  alerta_cada_horas: entero,
  es_inicial: z.boolean(),
  es_final: z.boolean(),
  es_logistica: z.boolean(),
  nota_obligatoria: z.boolean(),
  permite_contenedor: z.boolean(),
  permite_aduana: z.boolean(),
  cuenta_llegada_repuestos: z.boolean(),
  publica_web: z.boolean(),
  visible_portal: z.boolean(),
  alias_portal: texto.nullable(),
  descripcion_portal: texto.nullable(),
}

const parcial = z.strictObject(datos).partial()

export const esquemaCrearFase = z.object({
  // El del intento: el mismo en cada reintento.
  id: z.guid(),
  flujoId: z.guid(),
  origenId,
  actualizadoEnEsperado: version,
  datos: parcial,
})

export const esquemaGuardarFase = z.object({
  id: z.guid(),
  origenId,
  actualizadoEnEsperado: version,
  cambios: parcial.refine((c) => Object.keys(c).length > 0, { error: 'No hay nada que guardar.' }),
})

export const esquemaMoverFase = z.object({
  id: z.guid(),
  origenId,
  actualizadoEnEsperado: version,
  // «Después de X»; nulo = primera.
  despuesDe: z.guid().nullable(),
})

export const esquemaEliminarFase = z.object({
  id: z.guid(),
  origenId,
  actualizadoEnEsperado: version,
})

export const esquemaReactivarFase = esquemaEliminarFase

export const esquemaLeerImpactoDeFase = z.object({ id: z.guid(), origenId })
