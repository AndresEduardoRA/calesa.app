import 'server-only'
import { z } from 'zod'
import { errorDePostgrest, ok } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/server'
import { cambiosComoColumnas } from '../entities/cambios-de-campo'
import { impactoDesde } from '../entities/impacto'
import type { RepositorioCamposDeLead } from '../entities/repositorios'

// El layout de campos de los leads se escribe sólo por RPC. Un campo con datos no cambia de tipo ni
// se elimina (se desactiva): la base lo decide con lo que hay cargado, la pantalla lo avisa antes.

const respuestaDeCreacion = z.object({ id: z.guid(), actualizado_en: z.string() })

const crear: RepositorioCamposDeLead['crear'] = async (nuevo) => {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('lead_campo_crear', {
    p_clave: nuevo.clave,
    p_etiqueta: nuevo.etiqueta,
    p_tipo: nuevo.tipo,
    p_opciones: nuevo.opciones.map(({ clave, etiqueta }) => ({ clave, etiqueta })),
    p_requerido: nuevo.requerido,
    p_grupo: nuevo.grupo ?? undefined,
    p_en_tabla: nuevo.enTabla,
    p_filtrable: nuevo.filtrable,
    p_solo_cartera: nuevo.soloCartera,
    p_valor_defecto: nuevo.valorDefecto ?? undefined,
    p_valor_defecto_empresa: nuevo.valorDefectoEmpresa ?? undefined,
  })
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  const creado = respuestaDeCreacion.parse(data)
  return ok({ id: creado.id, actualizadoEn: creado.actualizado_en })
}

const guardar: RepositorioCamposDeLead['guardar'] = async ({
  id,
  actualizadoEnEsperado,
  cambios,
}) => {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('lead_campo_guardar', {
    p_campo: id,
    p_actualizado_en_esperado: actualizadoEnEsperado,
    p_cambios: cambiosComoColumnas(cambios),
  })
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  return ok({ actualizadoEn: data })
}

const mover: RepositorioCamposDeLead['mover'] = async ({
  id,
  despuesDe,
  actualizadoEnEsperado,
}) => {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('lead_campo_mover', {
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

const eliminar: RepositorioCamposDeLead['eliminar'] = async ({ id, actualizadoEnEsperado }) => {
  const supabase = await createClient()
  const { error } = await supabase.rpc('lead_campo_eliminar', {
    p_campo: id,
    p_actualizado_en_esperado: actualizadoEnEsperado,
  })
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  return ok(null)
}

const impacto: RepositorioCamposDeLead['impacto'] = async (id) => {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('lead_campo_impacto', { p_campo: id })
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  return ok(impactoDesde(data))
}

export const camposDeLeadSupabase: RepositorioCamposDeLead = {
  crear,
  guardar,
  mover,
  eliminar,
  impacto,
}
