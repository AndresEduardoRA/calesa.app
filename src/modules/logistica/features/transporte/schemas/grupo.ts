import { z } from 'zod'

// Lo que cruza al servidor al editar un grupo (6.08-4). La base vuelve a revisarlo todo (`transporte_grupo_aplicar`: permiso por unidad, versiones, `_transporte_validar`); acá se corta lo
// que no tiene la forma. **Sin `notas`**: la RPC no las admite en el grupo y una de más es error de esquema, no 22023 (D39).
const fecha = z.iso.date()

const esquemaDeCambiosDelGrupo = z
  .strictObject({
    naviera_id: z.guid().nullable().optional(),
    puerto_origen_id: z.guid().nullable().optional(),
    puerto_destino_id: z.guid().nullable().optional(),
    contenedor: z.string().max(80).nullable().optional(),
    booking: z.string().max(80).nullable().optional(),
    zarpe_el: fecha.nullable().optional(),
    eta_el: fecha.nullable().optional(),
    arribo_el: fecha.nullable().optional(),
  })
  .refine((c) => Object.keys(c).length > 0, { message: 'No hay nada que guardar.' })

export const MAXIMO_DE_UNIDADES_DEL_GRUPO = 200

export const esquemaAplicarAlGrupo = z.object({
  tipo: z.enum(['booking', 'contenedor']),
  clave: z.string().min(1).max(80),
  // transporte id → versión leída; de 1 a 200 unidades (el tope de la base).
  esperadas: z.record(z.guid(), z.string().min(1)).refine(
    (e) => {
      const n = Object.keys(e).length
      return n >= 1 && n <= MAXIMO_DE_UNIDADES_DEL_GRUPO
    },
    { message: 'El grupo debe tener entre 1 y 200 unidades.' },
  ),
  cambios: esquemaDeCambiosDelGrupo,
})
