import { z } from 'zod'

// Lo que manda la pantalla para crear la importación total (9.06-4). La ruta no viaja: la arma el servidor con quien llama (D36). Los
// mensajes son los de `importacion_crear`, que lo vuelve a mirar.
export const esquemaCrearImportacion = z
  .object({
    id: z.guid(),
    entidad: z.enum(['leads', 'vehiculos']),
    mapeo: z.record(z.string().min(1).max(120), z.string().min(1).max(120).nullable()),
    asignarA: z.guid().nullable(),
    origenId: z.guid().nullable(),
  })
  .superRefine((entrada, ctx) => {
    const columnas = Object.keys(entrada.mapeo).length
    if (columnas < 1 || columnas > 200) {
      ctx.addIssue({
        code: 'custom',
        path: ['mapeo'],
        message: 'El emparejamiento lleva de 1 a 200 columnas.',
      })
    }
    if (entrada.entidad === 'leads' && entrada.origenId !== null) {
      ctx.addIssue({
        code: 'custom',
        path: ['origenId'],
        message: 'Una importación de leads no lleva origen.',
      })
    }
    if (entrada.entidad === 'vehiculos' && entrada.origenId === null) {
      ctx.addIssue({
        code: 'custom',
        path: ['origenId'],
        message: 'Elige un origen activo para los vehículos.',
      })
    }
    if (entrada.entidad === 'vehiculos' && entrada.asignarA !== null) {
      ctx.addIssue({
        code: 'custom',
        path: ['asignarA'],
        message: 'Una importación de vehículos no se asigna a nadie.',
      })
    }
  })

export type EntradaCrearImportacion = z.infer<typeof esquemaCrearImportacion>
