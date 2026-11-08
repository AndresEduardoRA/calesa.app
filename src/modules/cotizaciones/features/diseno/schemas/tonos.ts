import { z } from 'zod'

// Lo que cruza el límite del catálogo de tonos: sólo la forma. El largo del nombre, el repetido, el hex y el AA los dice la base con el campo en el `hint`.
const texto = z.string().max(20)
const tema = z.strictObject({ fondo: texto, borde: texto, tinta: texto })
const colores = z.strictObject({ claro: tema, oscuro: tema })
const version = z.string().min(1)

export const esquemaCrearTono = z.object({
  // El del intento: el mismo en cada reintento.
  id: z.guid(),
  nombre: z.string().max(200),
  colores,
})

// Sólo `nombre` y `colores` se cambian (la clave no): otra clave se rechaza aquí y en la base.
export const esquemaGuardarTono = z.object({
  id: z.guid(),
  actualizadoEnEsperado: version,
  cambios: z.strictObject({ nombre: z.string().max(200).optional(), colores: colores.optional() }),
})

export const esquemaEliminarTono = z.object({ id: z.guid(), actualizadoEnEsperado: version })
