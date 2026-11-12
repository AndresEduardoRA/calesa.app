import { z } from 'zod'

// Una unidad que devolvió `logistica_donde_esta()` al buscar vehículos para una declaración (6.09-2, D4): sólo lo que el selector muestra. Cada área lleva lo suyo (un área no importa
// otra), así que la forma se vuelve a validar acá.
export type UnidadBuscada = {
  id: string
  titulo: string
  vin: string | null
  lote: string | null
  fase: string | null
}

const esquema = z.object({
  unidades: z.array(
    z.object({
      id: z.guid(),
      titulo: z.string(),
      vin: z.string().nullable(),
      lote: z.string().nullable(),
      fase_nombre: z.string().nullable(),
    }),
  ),
  hay_mas: z.boolean(),
})

/** Lo que devolvió `logistica_donde_esta()`; nulo si no tiene la forma esperada. */
export function unidadesBuscadasDesde(
  datos: unknown,
): { unidades: UnidadBuscada[]; hayMas: boolean } | null {
  const leido = esquema.safeParse(datos)
  if (!leido.success) {
    return null
  }
  return {
    hayMas: leido.data.hay_mas,
    unidades: leido.data.unidades.map((u) => ({
      id: u.id,
      titulo: u.titulo,
      vin: u.vin,
      lote: u.lote,
      fase: u.fase_nombre,
    })),
  }
}
