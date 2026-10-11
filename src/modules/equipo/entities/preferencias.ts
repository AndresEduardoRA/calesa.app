// Preferencias de interfaz de la persona (`preferencias_usuario`: una fila por clave, valor jsonb).
// Privadas: sólo las lee y las escribe su dueña.
import { z } from 'zod'
import type { Densidad } from '@/shared/ui/densidad'

// Los mismos valores que entiende next-themes, para no traducir en el borde.
export const TEMAS = ['light', 'dark', 'system'] as const
export type Tema = (typeof TEMAS)[number]

export const DENSIDADES = ['compacta', 'comoda'] as const satisfies readonly Densidad[]

export type Preferencias = {
  // null = automática: compacta en escritorio, cómoda en táctil.
  densidad: Densidad | null
  // null = nunca eligió: manda lo que tenga el dispositivo.
  tema: Tema | null
}

const esquemaDensidad = z.enum(DENSIDADES)
const esquemaTema = z.enum(TEMAS)

// Lee el objeto `{ clave: valor }` que arma `mi_sesion()`. Una clave que falta, que no se conoce
// o que trae un valor viejo no rompe nada: esa preferencia queda sin elegir.
export function preferenciasDesde(crudo: unknown): Preferencias {
  const objeto = z.record(z.string(), z.unknown()).safeParse(crudo)
  const valores = objeto.success ? objeto.data : {}
  const densidad = esquemaDensidad.safeParse(valores['densidad'])
  const tema = esquemaTema.safeParse(valores['tema'])
  return {
    densidad: densidad.success ? densidad.data : null,
    tema: tema.success ? tema.data : null,
  }
}

// Lo que se puede guardar: cada clave con los valores que admite. `null` borra la elección.
export const esquemaPreferencia = z.discriminatedUnion('clave', [
  z.object({ clave: z.literal('densidad'), valor: esquemaDensidad.nullable() }),
  z.object({ clave: z.literal('tema'), valor: esquemaTema.nullable() }),
])

export type Preferencia = z.infer<typeof esquemaPreferencia>
