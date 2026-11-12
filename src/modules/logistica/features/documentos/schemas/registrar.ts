import { z } from 'zod'

// Lo que cruza al servidor al registrar un documento ya subido (6.06-2). La base vuelve a revisarlo todo (`documento_registrar`); aquí se corta lo que no tiene la forma.
const fecha = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)

export const esquemaRegistrarDocumentos = z
  .object({
    id: z.guid(),
    vehiculos: z.array(z.guid()).max(100),
    repuestoId: z.guid().nullable(),
    tipoId: z.guid(),
    ruta: z.string().min(1).max(300),
    nombre: z.string().min(1).max(200),
    mime: z.string().min(1).max(100),
    bytes: z.number().int().min(1).max(26_214_400),
    emitidoEl: fecha.nullable(),
    venceEl: fecha.nullable(),
    nota: z.string().trim().max(2000).nullable(),
  })
  .refine((p) => (p.repuestoId === null) !== (p.vehiculos.length === 0), {
    error: 'Elige los vehículos o el repuesto del documento.',
  })
