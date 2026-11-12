import 'server-only'
import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { fallo } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/server'
import { valoresDesde, type ValorDeCatalogo } from '../../entities/catalogos/catalogo'
import { rechazoDeValor, sinFilas } from '../../entities/catalogos/errores'
import type { RepositorioDeValores } from '../../entities/catalogos/repositorio'
import { COLUMNAS_DE_VALOR } from './leer'

// Los valores de los catálogos de repuestos se escriben directo, con el cliente de quien pide, y el límite es la RLS (`repuestos.configurar`): un valor no
// otorga permisos, así que no hay RPC (8.08-2, D23, como las categorías de gasto). Una escritura que la RLS deja en cero filas nunca es éxito: se relee la
// fila por id para decir «sin permiso» o «ya no existe» (D24). Guardar manda sólo `nombre`, `activo` y `orden`: el UPDATE es por esas columnas (8.10-1).
const NO_SE_LEYO = 'No pudimos leer la respuesta. Recarga para ver cómo quedó.'

type Cliente = Awaited<ReturnType<typeof createClient>>

async function sinFilasDe(supabase: Cliente, id: string): Promise<ResultadoDeAccion<never>> {
  const { data, error } = await supabase
    .from('repuestos_catalogos')
    .select('id')
    .eq('id', id)
    .limit(1)
  if (error) {
    return rechazoDeValor(error)
  }
  return sinFilas(data.length > 0)
}

function unValor(datos: unknown): ValorDeCatalogo | null | undefined {
  const lista = valoresDesde(datos)
  return lista === null ? undefined : (lista[0] ?? null)
}

export const valoresSupabase: RepositorioDeValores = {
  crear: async ({ catalogo, nombre, activo, orden }) => {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('repuestos_catalogos')
      .insert({ catalogo, nombre, activo, orden })
      .select(COLUMNAS_DE_VALOR)
      .limit(1)
    if (error) {
      return rechazoDeValor(error)
    }
    const valor = unValor(data)
    if (valor === undefined) return fallo('inesperado', NO_SE_LEYO)
    // Un INSERT sin permiso da 42501; sin fila devuelta es que la RLS no deja leerla: no pasa (leer es `true`), pero nunca es éxito.
    return valor === null ? sinFilas(true) : { ok: true, data: valor }
  },
  guardar: async ({ id, cambios }) => {
    const supabase = await createClient()
    const { nombre, activo, orden } = cambios
    const { data, error } = await supabase
      .from('repuestos_catalogos')
      .update({ nombre, activo, orden })
      .eq('id', id)
      .select(COLUMNAS_DE_VALOR)
      .limit(1)
    if (error) {
      return rechazoDeValor(error)
    }
    const valor = unValor(data)
    if (valor === undefined) return fallo('inesperado', NO_SE_LEYO)
    return valor === null ? sinFilasDe(supabase, id) : { ok: true, data: valor }
  },
  eliminar: async ({ id }) => {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('repuestos_catalogos')
      .delete()
      .eq('id', id)
      .select('id')
      .limit(1)
    if (error) {
      return rechazoDeValor(error)
    }
    return data.length > 0 ? { ok: true, data: { id } } : sinFilasDe(supabase, id)
  },
}
