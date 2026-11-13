// Las lecturas de la actividad, escritas una vez con el cliente como parámetro: el servidor lee la primera página y el navegador «Ver más»,
// «Ir a una fecha» y el diff. Las dos van con la sesión de quien mira: las RPC piden `actividad.ver` (42501) y recortan cada fila.
import type { SupabaseClient } from '@supabase/supabase-js'
import { cortarAlTope } from '@/shared/lib/conteo'
import { errorDePostgrest, fallo, ok, type Resultado } from '@/shared/lib/errores'
import { TAMANO_DE_VER_MAS, TOPE_DEL_EQUIPO } from '@/shared/lib/paginacion'
import type { Database } from '@/shared/types/database.types'
import {
  diffDesde,
  paginaDesde,
  type DiffDeActividad,
  type PaginaDeActividad,
} from '../entities/actividad'
import type { CampoDeAtributo } from '../entities/diff'
import type { PedidoDeActividad, PersonaDeLaActividad } from '../entities/filtros'

export type Cliente = SupabaseClient<Database>

// Una página por cursor sobre `id` (de a `TAMANO_DE_VER_MAS`; la base acota con `_acotar_pagina(p_tamano, 20, 100)`). La base elige la ruta
// por el filtro: registro → `actividad_registro_id_idx`, persona → `actividad_actor_id_idx`, entidad → `actividad_tabla_id_idx`, sin filtro
// → `actividad_pkey`; «Ir a una fecha» ancla por `actividad_fecha_idx`. Sólo se mandan los parámetros que valen.
export async function leerPagina(
  cliente: Cliente,
  pedido: PedidoDeActividad,
): Promise<Resultado<PaginaDeActividad>> {
  const { data, error } = await cliente.rpc('actividad_listar', {
    p_tamano: TAMANO_DE_VER_MAS,
    ...(pedido.antesId === null ? {} : { p_antes_id: pedido.antesId }),
    ...(pedido.actor === null ? {} : { p_actor: pedido.actor }),
    ...(pedido.tabla === null ? {} : { p_tabla: pedido.tabla }),
    ...(pedido.tabla === null || pedido.registro === null ? {} : { p_registro: pedido.registro }),
    ...(pedido.hasta === null ? {} : { p_hasta: pedido.hasta }),
  })
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  const pagina = paginaDesde(data)
  return pagina === null ? fallo('inesperado', 'No se pudo cargar la actividad.') : ok(pagina)
}

// El diff de un cambio (`actividad_diff`, por `actividad_pkey`): sólo las claves que cambiaron y que quien mira ve; sin acceso, `visible: false`.
export async function leerUnDiff(
  cliente: Cliente,
  id: number,
): Promise<Resultado<DiffDeActividad>> {
  const { data, error } = await cliente.rpc('actividad_diff', { p_id: id })
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  const diff = diffDesde(data)
  return diff === null ? fallo('inesperado', 'No se pudo cargar el cambio.') : ok(diff)
}

// Las personas del filtro: todo el equipo, activas o no (quien dejó el equipo sigue en la actividad de estos días). Sólo `id` y `nombre`
// (`perfiles: leer`), nunca el correo; hasta `TOPE_DEL_EQUIPO` por nombre (la tabla del equipo, decenas de filas: la base ordena en memoria hasta `TOPE_DEL_EQUIPO + 1`).
export async function leerPersonas(cliente: Cliente): Promise<Resultado<PersonaDeLaActividad[]>> {
  const { data, error } = await cliente
    .from('perfiles')
    .select('id, nombre')
    .order('nombre')
    .order('id')
    .limit(TOPE_DEL_EQUIPO + 1)
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  const { filas } = cortarAlTope(data, TOPE_DEL_EQUIPO)
  return ok(filas.map((p) => ({ id: p.id, nombre: p.nombre.trim() || 'Sin nombre' })))
}

export type PedidoDeCampos = { tabla: string; origenId: string | null; claves: readonly string[] }

function porClave(
  filas: readonly { clave: string; etiqueta: string; tipo: string }[],
): ReadonlyMap<string, CampoDeAtributo> {
  return new Map(filas.map((f) => [f.clave, { etiqueta: f.etiqueta, tipo: f.tipo }]))
}

// Las etiquetas de las claves de `atributos` que trae un diff, sólo esas: de un lead, `leads_campos`; de un vehículo, `origenes_campos` de su
// origen (el de la foto). Activas o no: quien lo cambió lo cambió con ese nombre. Otra tabla, o un vehículo sin origen: ninguna.
export async function leerCampos(
  cliente: Cliente,
  { tabla, origenId, claves }: PedidoDeCampos,
): Promise<Resultado<ReadonlyMap<string, CampoDeAtributo>>> {
  if (claves.length === 0) {
    return ok(new Map())
  }
  if (tabla === 'leads') {
    // leads_campos_clave_key
    const { data, error } = await cliente
      .from('leads_campos')
      .select('clave, etiqueta, tipo')
      .in('clave', [...claves])
      .limit(claves.length)
    return error ? { ok: false, error: errorDePostgrest(error) } : ok(porClave(data))
  }
  if (tabla === 'vehiculos' && origenId !== null) {
    // origenes_campos_origen_id_clave_key
    const { data, error } = await cliente
      .from('origenes_campos')
      .select('clave, etiqueta, tipo')
      .eq('origen_id', origenId)
      .in('clave', [...claves])
      .limit(claves.length)
    return error ? { ok: false, error: errorDePostgrest(error) } : ok(porClave(data))
  }
  return ok(new Map())
}
