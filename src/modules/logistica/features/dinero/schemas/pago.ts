import { z } from 'zod'

// Lo que cruza al servidor al registrar, corregir, eliminar, confirmar o anular un pago (6.11-2). La base vuelve a revisarlo todo; aquí se corta lo que no tiene la forma.
const fecha = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
const monto = z.number().gt(0)
const textoOpcional = z.string().trim().max(1000).nullable()
const version = z.string().min(1)

export const esquemaRegistrarPago = z.object({
  id: z.guid(),
  vehiculoId: z.guid(),
  concepto: z.string().trim().min(1).max(200),
  moneda: z.string().regex(/^[A-Z]{3}$/),
  monto,
  tipoCambioId: z.guid().nullable(),
  metodo: z.string().trim().max(100).nullable(),
  fecha,
  notas: textoOpcional,
  comprobanteRuta: z.string().max(300).nullable(),
})

// Sólo lo que `pago_guardar` admite y esta interfaz manda: las claves de `p_cambios` sin `lead_id` (D3).
const esquemaDeCambios = z.strictObject({
  concepto: z.string().trim().min(1).max(200).optional(),
  moneda: z
    .string()
    .regex(/^[A-Z]{3}$/)
    .optional(),
  monto: monto.optional(),
  tipo_cambio_id: z.guid().nullable().optional(),
  metodo: z.string().trim().max(100).nullable().optional(),
  fecha: fecha.optional(),
  notas: textoOpcional.optional(),
  comprobante_ruta: z.string().max(300).nullable().optional(),
})

export const esquemaGuardarPago = z.object({
  id: z.guid(),
  actualizadoEnEsperado: version,
  cambios: esquemaDeCambios,
})

// Eliminar y confirmar mandan lo mismo: el pago y la versión que se tenía en pantalla.
export const esquemaDeUnPago = z.object({
  id: z.guid(),
  actualizadoEnEsperado: version,
})

export const esquemaAnularPago = esquemaDeUnPago.extend({
  motivo: z.string().trim().min(1).max(500),
})
