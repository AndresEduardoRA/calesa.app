import 'server-only'
import { cache } from 'react'
import { errorDePostgrest, ok } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/server'
import { catalogoDesde } from '../../entities/matriz'
import type { LectorDeMatriz } from '../../entities/repositorios-equipo'
import { rolesDesde } from '../../entities/rol'

// Lo que dibuja la matriz: los roles con sus concesiones y cuántas personas los tienen, y el
// catálogo de permisos en su orden. Tres lecturas en paralelo, una vez por request. Las personas de cada
// rol salen de `roles_personas()`, que cuenta hasta 1.001 por `usuarios_roles_rol_idx` (5a-27): nunca el total.
export const getMatriz: LectorDeMatriz = cache(async () => {
  const supabase = await createClient()
  const [roles, personas, permisos] = await Promise.all([
    supabase
      .from('roles')
      .select(
        'id, clave, nombre, color, es_sistema, actualizado_en, roles_permisos(permiso_clave, origen_id, alcance)',
      )
      .order('orden')
      .order('nombre'),
    supabase.rpc('roles_personas'),
    supabase
      .from('permisos')
      .select('clave, nombre, descripcion, por_origen, con_alcance')
      .order('orden'),
  ])
  if (roles.error) {
    return { ok: false, error: errorDePostgrest(roles.error) }
  }
  if (personas.error) {
    return { ok: false, error: errorDePostgrest(personas.error) }
  }
  if (permisos.error) {
    return { ok: false, error: errorDePostgrest(permisos.error) }
  }
  return ok({
    roles: rolesDesde(roles.data, personas.data),
    catalogo: catalogoDesde(permisos.data),
  })
})
