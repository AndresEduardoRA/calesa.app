import 'server-only'
import { errorDePostgrest, fallo } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/server'
import type {
  FalloDeTransicion,
  RepositorioDeTransiciones,
  ResultadoDeTransicion,
} from '../../entities/transiciones/repositorios'
import {
  versionDeTransicionDesde,
  type VersionDeTransicion,
} from '../../entities/transiciones/respuestas'

// Las escrituras de una salida (`transicion_*`, `fase_roles_poner`, `transicion_roles_poner`): el permiso del flujo (`42501`), la versión (`PT409`) y las reglas de la transición con
// el campo en el `hint` (`22023`, `23505`). Ninguna devuelve la lista: devuelven la versión nueva del flujo y la pantalla relee.
const NO_SE_LEYO = 'No pudimos leer la respuesta. Recarga para ver cómo quedó.'

type SalidaDeRpc = {
  data: unknown
  error: { code?: string | null; message: string; hint?: string | null } | null
}

function comoResultado(salida: SalidaDeRpc): ResultadoDeTransicion<VersionDeTransicion> {
  if (salida.error) {
    const fallido: FalloDeTransicion = { ok: false, error: errorDePostgrest(salida.error) }
    return salida.error.hint ? { ...fallido, campo: salida.error.hint } : fallido
  }
  const leida = versionDeTransicionDesde(salida.data)
  return leida ? { ok: true, data: leida } : fallo('inesperado', NO_SE_LEYO)
}

export const transicionesSupabase: RepositorioDeTransiciones = {
  crear: async ({
    id,
    flujoId,
    actualizadoEnEsperado,
    deFaseId,
    aFaseId,
    accion,
    notaObligatoria,
  }) => {
    const supabase = await createClient()
    return comoResultado(
      await supabase.rpc('transicion_crear', {
        p_id: id,
        p_flujo: flujoId,
        p_actualizado_en_esperado: actualizadoEnEsperado,
        p_de: deFaseId,
        p_a: aFaseId,
        // Nulo = el botón dice «Mover»; el tipo generado no lo admite.
        p_accion: accion as string,
        p_nota_obligatoria: notaObligatoria,
      }),
    )
  },
  eliminar: async ({ id, actualizadoEnEsperado }) => {
    const supabase = await createClient()
    return comoResultado(
      await supabase.rpc('transicion_eliminar', {
        p_transicion: id,
        p_actualizado_en_esperado: actualizadoEnEsperado,
      }),
    )
  },
  guardar: async ({ id, actualizadoEnEsperado, cambios }) => {
    const supabase = await createClient()
    // Sólo las claves presentes; `accion: null` viaja como nulo («Mover»), nunca ausente.
    const p_cambios = {
      ...(cambios.accion === undefined ? {} : { accion: cambios.accion }),
      ...(cambios.notaObligatoria === undefined
        ? {}
        : { nota_obligatoria: cambios.notaObligatoria }),
    }
    return comoResultado(
      await supabase.rpc('transicion_guardar', {
        p_transicion: id,
        p_actualizado_en_esperado: actualizadoEnEsperado,
        p_cambios,
      }),
    )
  },
  ponerRolesDeFase: async ({ faseId, actualizadoEnEsperado, roles }) => {
    const supabase = await createClient()
    return comoResultado(
      await supabase.rpc('fase_roles_poner', {
        p_fase: faseId,
        p_actualizado_en_esperado: actualizadoEnEsperado,
        p_roles: [...roles],
      }),
    )
  },
  ponerRolesDeTransicion: async ({ id, actualizadoEnEsperado, roles }) => {
    const supabase = await createClient()
    return comoResultado(
      await supabase.rpc('transicion_roles_poner', {
        p_transicion: id,
        p_actualizado_en_esperado: actualizadoEnEsperado,
        p_roles: [...roles],
      }),
    )
  },
}
