// Lo que apuntan las menciones y las fichas del hilo, leído desde el navegador con la sesión de quien mira (7.10-1): cada clase bajo su RLS, una lectura
// por clase y por tanda de 100 ids (por clave primaria, con `limit`). Sin teléfono, campos privados ni montos.
import { errorDePostgrest, ok, type Resultado } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/browser'
import { type ClaseDeMencion, type Referencia } from '../entities/menciones'
import type { LectorDeReferencias } from '../entities/repositorios'
import {
  COLUMNAS_DE_REFERENCIA,
  resolverClase,
  type EstadoDeReferencia,
} from '../entities/referencias'

const TANDA = 100

type Cliente = ReturnType<typeof createClient>
type Leida = { data: unknown; error: { code?: string | null; message: string } | null }

// Índices: la clave primaria de cada tabla (`leads_vista_por_ids` recorta teléfono y privados con la RLS de quien mira).
async function leerTanda(supabase: Cliente, clase: ClaseDeMencion, ids: string[]): Promise<Leida> {
  switch (clase) {
    case 'lead':
      return supabase
        .rpc('leads_vista_por_ids', { p_leads: ids })
        .select(COLUMNAS_DE_REFERENCIA.lead)
        .limit(ids.length)
    case 'vehiculo':
      return supabase
        .from('vehiculos')
        .select(COLUMNAS_DE_REFERENCIA.vehiculo)
        .in('id', ids)
        .limit(ids.length)
    case 'cotizacion':
      return supabase
        .from('cotizaciones')
        .select(COLUMNAS_DE_REFERENCIA.cotizacion)
        .in('id', ids)
        .limit(ids.length)
    case 'usuario':
      return supabase
        .from('perfiles')
        .select(COLUMNAS_DE_REFERENCIA.usuario)
        .in('id', ids)
        .limit(ids.length)
  }
}

async function leerClase(
  supabase: Cliente,
  clase: ClaseDeMencion,
  ids: string[],
): Promise<Resultado<Map<string, EstadoDeReferencia>>> {
  const filas: unknown[] = []
  for (let i = 0; i < ids.length; i += TANDA) {
    const { data, error } = await leerTanda(supabase, clase, ids.slice(i, i + TANDA))
    if (error) {
      return { ok: false, error: errorDePostgrest(error) }
    }
    filas.push(...(Array.isArray(data) ? data : []))
  }
  return resolverClase(clase, ids, filas)
}

export const leerReferencias: LectorDeReferencias = async (referencias) => {
  const porClase = new Map<ClaseDeMencion, string[]>()
  for (const r of referencias as readonly Referencia[]) {
    porClase.set(r.clase, [...(porClase.get(r.clase) ?? []), r.id])
  }
  const supabase = createClient()
  const resueltas = new Map<string, EstadoDeReferencia>()
  for (const [clase, ids] of porClase) {
    const leida = await leerClase(supabase, clase, [...new Set(ids)])
    if (!leida.ok) {
      return leida
    }
    for (const [clave, estado] of leida.data) {
      resueltas.set(clave, estado)
    }
  }
  return ok(resueltas)
}
