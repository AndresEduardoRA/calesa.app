// La perspectiva «ver como»: mirar la app con los permisos de otro rol. Es sólo interfaz. Los
// permisos efectivos los calcula la base (`permisos_efectivos()` = los míos ∩ los del rol): nunca
// dan más de lo real, y RLS, las RPC y las actions siguen usando los reales.
import { z } from 'zod'

// La cookie guarda sólo el id del rol elegido. No va firmada: lo peor que logra quien la falsea
// es que la interfaz le muestre menos.
export const COOKIE_PERSPECTIVA = 'perspectiva'

export type RolParaVerComo = { id: string; nombre: string; color: string | null }

export type Perspectiva = {
  // Puede usarla quien gestiona roles DE VERDAD: sale de los permisos reales, así «Salir» sigue
  // disponible aunque el rol que se mira no tenga nada de equipo.
  disponible: boolean
  // El rol con el que se está mirando; null = sin perspectiva.
  rol: RolParaVerComo | null
  // Los roles entre los que elegir (vacío si no está disponible).
  roles: RolParaVerComo[]
}

export const SIN_PERSPECTIVA: Perspectiva = { disponible: false, rol: null, roles: [] }

// guid y no uuid: `z.uuid()` exige versión y variante RFC, y Postgres acepta cualquier uuid.
const esquemaRol = z.object({ id: z.guid(), nombre: z.string(), color: z.string().nullable() })

const esquemaPerspectiva = z.object({
  disponible: z.boolean(),
  rol: esquemaRol.nullable(),
  roles: z.array(esquemaRol),
})

// El valor de la cookie tal como llegó del navegador: un id de rol, o nada.
export function leerPerspectiva(valor: string | undefined): string | null {
  const id = z.guid().safeParse(valor)
  return id.success ? id.data : null
}

// La parte `perspectiva` de `mi_sesion()`. Sin ella (una respuesta vieja) no hay perspectiva.
export function perspectivaDesde(json: unknown): Perspectiva {
  if (json === null || json === undefined) {
    return SIN_PERSPECTIVA
  }
  return esquemaPerspectiva.parse(json)
}
