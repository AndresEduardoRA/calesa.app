import 'server-only'
import { errorDePostgrest, ok } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/server'
import { cambiosComoColumnas } from '../entities/cambios-de-campo'
import { impactoDesde } from '../entities/impacto'
import type { RepositorioCampos } from '../entities/repositorios'
import { respuestaDeCreacion } from './origenes'

// El layout de campos se escribe sólo por RPC. Un campo con datos no cambia de tipo ni se elimina
// (se desactiva): la base lo decide con lo que hay cargado, la pantalla lo avisa antes.

const crear: RepositorioCampos['crear'] = async (nuevo) => {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('origen_campo_crear', {
    p_origen: nuevo.origenId,
    p_clave: nuevo.clave,
    p_etiqueta: nuevo.etiqueta,
    p_tipo: nuevo.tipo,
    p_opciones: nuevo.opciones.map(({ clave, etiqueta }) => ({ clave, etiqueta })),
    p_requerido: nuevo.requerido,
    p_grupo: nuevo.grupo ?? undefined,
    p_en_tarjeta: nuevo.enTarjeta,
    p_filtrable: nuevo.filtrable,
    p_publico_web: nuevo.publicoWeb,
    p_clave_apibara: nuevo.claveApibara ?? undefined,
    p_valor_defecto: nuevo.valorDefecto ?? undefined,
  })
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  const creado = respuestaDeCreacion.parse(data)
  return ok({ id: creado.id, actualizadoEn: creado.actualizado_en })
}

const guardar: RepositorioCampos['guardar'] = async ({ id, actualizadoEnEsperado, cambios }) => {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('origen_campo_guardar', {
    p_campo: id,
    p_actualizado_en_esperado: actualizadoEnEsperado,
    p_cambios: cambiosComoColumnas(cambios),
  })
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  return ok({ actualizadoEn: data })
}

const mover: RepositorioCampos['mover'] = async ({ id, despuesDe, actualizadoEnEsperado }) => {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('origen_campo_mover', {
    p_campo: id,
    p_actualizado_en_esperado: actualizadoEnEsperado,
    // Sin parámetro = primero de todos.
    ...(despuesDe === null ? {} : { p_despues_de: despuesDe }),
  })
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  return ok({ actualizadoEn: data })
}

const eliminar: RepositorioCampos['eliminar'] = async ({ id, actualizadoEnEsperado }) => {
  const supabase = await createClient()
  const { error } = await supabase.rpc('origen_campo_eliminar', {
    p_campo: id,
    p_actualizado_en_esperado: actualizadoEnEsperado,
  })
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  return ok(null)
}

const impacto: RepositorioCampos['impacto'] = async (id) => {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('origen_campo_impacto', { p_campo: id })
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  return ok(impactoDesde(data))
}

const agregarDeApibara: RepositorioCampos['agregarDeApibara'] = async ({ origenId, rutas }) => {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('origen_apibara_agregar', {
    p_origen: origenId,
    p_rutas: [...rutas],
  })
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  return ok({ agregados: data })
}

export const camposSupabase: RepositorioCampos = {
  crear,
  guardar,
  mover,
  eliminar,
  impacto,
  agregarDeApibara,
}
