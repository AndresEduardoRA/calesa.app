import { z } from 'zod'

// Lo que cruza al servidor al guardar, eliminar o restaurar una compra (8.11-3, C6). Las claves de `datos` son la lista cerrada de `repuesto_compra_guardar` sin
// `proyecto_id` (lo pone la escritura al crear): `monto_base`, la tasa o `proyecto_id` no pasan. La base vuelve a revisarlo todo.
const esquemaDatosDeCompra = z
  .strictObject({
    item_id: z.guid().nullable(),
    proveedor: z.string().max(200).nullable(),
    moneda: z.string().regex(/^[A-Z]{3}$/),
    monto: z.number().nonnegative(),
    fecha: z.iso.date(),
    notas: z.string().max(2000).nullable(),
    // `<proyecto>/<sha-256>.<ext>`: la base vuelve a mirar que la carpeta sea la del proyecto (`_comprobante_ruta_valida`).
    comprobante_ruta: z
      .string()
      .regex(/^[0-9a-f-]{36}\/[0-9a-f]{64}\.[a-z0-9]{1,8}$/)
      .nullable(),
  })
  .partial()

// Con la esperada nula crea; con la esperada puesta edita sólo las claves que llegan.
export const esquemaGuardarCompra = z.object({
  id: z.guid(),
  proyectoId: z.guid(),
  actualizadoEnEsperado: z.iso.datetime({ offset: true }).nullable(),
  datos: esquemaDatosDeCompra,
})

// Eliminar y restaurar siempre llevan la versión: con la esperada nula la base no daría `PT409` sino un rechazo genérico. `proyectoId` sólo sirve para revalidar.
const esquemaVersionDeCompra = z.object({
  id: z.guid(),
  proyectoId: z.guid(),
  actualizadoEnEsperado: z.iso.datetime({ offset: true }),
})

export const esquemaEliminarCompra = esquemaVersionDeCompra
export const esquemaRestaurarCompra = esquemaVersionDeCompra
