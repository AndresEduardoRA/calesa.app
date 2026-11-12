import 'server-only'
import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { errorDePostgrest } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/server'
import {
  navierasDesde,
  puertosDesde,
  SIN_PERMISO_PARA_LOS_CATALOGOS_DE_TRANSPORTE,
  textoDeErrorDeCatalogo,
  textoDeRepetido,
  type RepetidoDeCatalogo,
} from '../../entities/transporte/catalogo'
import type { RepositorioDeCatalogosDeTransporte } from '../../entities/transporte/repositorio-de-catalogos'

// Puertos y navieras son catálogos de la empresa (decenas de filas): se escriben directo, con el cliente de quien pide, y el límite es la RLS (`logistica.catalogos.gestionar`). No otorgan permisos,
// así que no hay RPC (6.08-1, D4). Una escritura que la RLS deja en cero filas es «sin permiso», nunca éxito. No se borra: borrar deja nulos los transportes (D3).
const COLUMNAS_DE_PUERTO = 'id, nombre, pais, codigo, activo, orden'
const COLUMNAS_DE_NAVIERA = 'id, nombre, activo'

type ErrorDeLaBase = { code?: string | null; message: string }

function rechazo(error: ErrorDeLaBase, repetido: RepetidoDeCatalogo): ResultadoDeAccion<never> {
  const app = errorDePostgrest(error)
  const texto = error.code ? textoDeErrorDeCatalogo(error.code, repetido) : null
  const porCampo = error.code === '23505' && texto ? { nombre: texto } : undefined
  return {
    ok: false,
    error: texto ? { ...app, mensaje: texto } : app,
    ...(porCampo ? { porCampo } : {}),
  }
}

const sinPermiso = (): ResultadoDeAccion<never> => ({
  ok: false,
  error: { codigo: 'sin_permiso', mensaje: SIN_PERMISO_PARA_LOS_CATALOGOS_DE_TRANSPORTE },
})

const inesperado = (): ResultadoDeAccion<never> => ({
  ok: false,
  error: { codigo: 'inesperado', mensaje: 'No se pudo guardar. Inténtalo de nuevo.' },
})

// Con el país nulo la unicidad `(nombre, pais)` de la base no impide dos puertos iguales (NULL ≠ NULL): se mira antes. Una alta simultánea de dos personas puede duplicarlo; se tolera (D5).
async function repetidoSinPais(
  nombre: string,
  propioId: string | null,
): Promise<ResultadoDeAccion<never> | null> {
  const supabase = await createClient()
  let consulta = supabase.from('puertos').select('id').eq('nombre', nombre).is('pais', null)
  if (propioId !== null) {
    consulta = consulta.neq('id', propioId)
  }
  const { data, error } = await consulta.limit(1)
  if (error) {
    return rechazo(error, { tipo: 'puerto', nombre, pais: null })
  }
  if (data.length === 0) {
    return null
  }
  return {
    ok: false,
    error: {
      codigo: 'duplicado',
      mensaje: textoDeRepetido({ tipo: 'puerto', nombre, pais: null }),
    },
    porCampo: { nombre: textoDeRepetido({ tipo: 'puerto', nombre, pais: null }) },
  }
}

export const catalogosDeTransporteSupabase: RepositorioDeCatalogosDeTransporte = {
  crearPuerto: async (datos) => {
    if (datos.pais === null) {
      const repetido = await repetidoSinPais(datos.nombre, null)
      if (repetido) {
        return repetido
      }
    }
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('puertos')
      .insert(datos)
      .select(COLUMNAS_DE_PUERTO)
      .limit(1)
    if (error) {
      return rechazo(error, { tipo: 'puerto', nombre: datos.nombre, pais: datos.pais })
    }
    const lista = puertosDesde(data)
    const uno = lista?.[0]
    return lista === null ? inesperado() : uno ? { ok: true, data: uno } : sinPermiso()
  },
  guardarPuerto: async ({ id, nombre, pais, cambios }) => {
    const nombreFinal = cambios.nombre ?? nombre
    const paisFinal = 'pais' in cambios ? (cambios.pais ?? null) : pais
    if (paisFinal === null && (cambios.nombre !== undefined || 'pais' in cambios)) {
      const repetido = await repetidoSinPais(nombreFinal, id)
      if (repetido) {
        return repetido
      }
    }
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('puertos')
      .update(cambios)
      .eq('id', id)
      .select(COLUMNAS_DE_PUERTO)
      .limit(1)
    if (error) {
      return rechazo(error, { tipo: 'puerto', nombre: nombreFinal, pais: paisFinal })
    }
    const lista = puertosDesde(data)
    const uno = lista?.[0]
    return lista === null ? inesperado() : uno ? { ok: true, data: uno } : sinPermiso()
  },
  crearNaviera: async (datos) => {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('navieras')
      .insert(datos)
      .select(COLUMNAS_DE_NAVIERA)
      .limit(1)
    if (error) {
      return rechazo(error, { tipo: 'naviera', nombre: datos.nombre })
    }
    const lista = navierasDesde(data)
    const una = lista?.[0]
    return lista === null ? inesperado() : una ? { ok: true, data: una } : sinPermiso()
  },
  guardarNaviera: async ({ id, nombre, cambios }) => {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('navieras')
      .update(cambios)
      .eq('id', id)
      .select(COLUMNAS_DE_NAVIERA)
      .limit(1)
    if (error) {
      return rechazo(error, { tipo: 'naviera', nombre: cambios.nombre ?? nombre })
    }
    const lista = navierasDesde(data)
    const una = lista?.[0]
    return lista === null ? inesperado() : una ? { ok: true, data: una } : sinPermiso()
  },
}
