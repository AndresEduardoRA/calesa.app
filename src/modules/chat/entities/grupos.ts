// Las reglas de un grupo nuevo (7.09-2), espejo de `chat_grupo_crear`: nombre de 1 a 80 caracteres y de 1 a 49 personas más quien lo crea
// (2 a 50 en total). La base vuelve a exigirlo; acá se dice antes de pedir. Sin I/O.
import { z } from 'zod'

export const NOMBRE_MAXIMO_DEL_GRUPO = 80
export const MAXIMO_DE_PERSONAS_ELEGIDAS = 49

export const MOTIVO_DEL_NOMBRE = 'Ponle al grupo un nombre de hasta 80 caracteres.'
export const MOTIVO_DE_LOS_MIEMBROS = 'Elige a quiénes sumas al grupo.'
export const MOTIVO_DEL_TAMANO = 'Un grupo tiene de 2 a 50 personas.'

export const esquemaDeGrupo = z.object({
  id: z.guid(),
  nombre: z.string().trim().min(1).max(NOMBRE_MAXIMO_DEL_GRUPO),
  miembros: z
    .array(z.guid())
    .min(1)
    .max(MAXIMO_DE_PERSONAS_ELEGIDAS)
    .refine((ids) => new Set(ids).size === ids.length),
})

export type DatosDeGrupo = z.infer<typeof esquemaDeGrupo>

// Los motivos por campo (`nombre`, `miembros`: la clave del `hint` de la base), o nulo si todo pasa.
export function validarGrupo(valores: {
  nombre: string
  miembros: readonly string[]
}): Record<string, string> | null {
  const motivos: Record<string, string> = {}
  const nombre = valores.nombre.trim()
  if (nombre === '' || [...nombre].length > NOMBRE_MAXIMO_DEL_GRUPO) {
    motivos['nombre'] = MOTIVO_DEL_NOMBRE
  }
  if (valores.miembros.length === 0) {
    motivos['miembros'] = MOTIVO_DE_LOS_MIEMBROS
  } else if (valores.miembros.length > MAXIMO_DE_PERSONAS_ELEGIDAS) {
    motivos['miembros'] = MOTIVO_DEL_TAMANO
  }
  return Object.keys(motivos).length > 0 ? motivos : null
}
