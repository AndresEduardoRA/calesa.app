import { z } from 'zod'

// Lo que cruza al servidor al registrar, corregir o eliminar un gasto (6.11-1). La base vuelve a revisarlo todo (`_gasto_validar`); aquí se corta lo que no tiene la forma.
const fecha = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
const monto = z.number().min(0)
const texto = z.string().trim().max(1000).nullable()

export const esquemaRegistrarGasto = z.object({
  id: z.guid(),
  vehiculoId: z.guid(),
  categoriaId: z.guid(),
  moneda: z.string().regex(/^[A-Z]{3}$/),
  monto,
  tipoCambioId: z.guid().nullable(),
  fecha,
  proveedor: texto,
  notas: texto,
  comprobanteRuta: z.string().max(300).nullable(),
})

// Sólo lo que `gasto_guardar` admite: las claves cerradas de `p_cambios`.
const esquemaDeCambios = z.strictObject({
  categoria_id: z.guid().optional(),
  moneda: z
    .string()
    .regex(/^[A-Z]{3}$/)
    .optional(),
  monto: monto.optional(),
  tipo_cambio_id: z.guid().nullable().optional(),
  fecha: fecha.optional(),
  proveedor: texto.optional(),
  notas: texto.optional(),
  comprobante_ruta: z.string().max(300).nullable().optional(),
})

export const esquemaGuardarGasto = z.object({
  id: z.guid(),
  actualizadoEnEsperado: z.string().min(1),
  cambios: esquemaDeCambios,
})

export const esquemaEliminarGasto = z.object({
  id: z.guid(),
  actualizadoEnEsperado: z.string().min(1),
})
