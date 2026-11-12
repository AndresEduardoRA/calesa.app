import 'server-only'
import { errorDePostgrest, fallo, ok, type Resultado } from '@/shared/lib/errores'
import type { Cursor } from '@/shared/lib/paginacion'
import { POR_ALTA } from '@/shared/lib/paginacion'
import {
  aplicarCursor,
  ordenarPorCursor,
  type Filtrable,
  type Ordenable,
} from '@/shared/lib/supabase/consultas'
import {
  FILAS_POR_PEDIDO,
  registroDesde,
  type FilaDeLeadAExportar,
  type LectorDeExportacion,
  type Rango,
  type Registrador,
} from '../entities/exportacion'
import type { ClienteDelFlujo } from './cliente-del-flujo'

// Las lecturas de «exportar todo» (9.05-2), con el cliente del flujo (la sesión de quien exporta, token fijo): la RLS decide las filas.

// `datos_exportar_leads()` por `leads_listado_idx` (`creado_en desc, id desc`): la función se inlinea (9.05-1) y PostgREST empuja el rango, el
// cursor, el orden y el límite al índice. Medido en `supabase/tests/medir-datos-exportar.sql`. Las columnas van escritas en cada `select`
// (nunca `*`: la función trae también `en_cartera` y `actualizado_en`, que el archivo no lleva).
function enElRango<Consulta extends Filtrable<Consulta> & Ordenable<Consulta>>(
  consulta: Consulta,
  rango: Rango,
  cursor: Cursor | null,
): Consulta {
  const desde = rango.desdeEn === null ? consulta : consulta.gte('creado_en', rango.desdeEn)
  const hasta = rango.hastaIncluido
    ? desde.lte('creado_en', rango.hastaEn)
    : desde.lt('creado_en', rango.hastaEn)
  return ordenarPorCursor(aplicarCursor(hasta, cursor, POR_ALTA), cursor, POR_ALTA)
}

type FilaCruda = {
  id: string
  numero: number | null
  nombre: string
  telefono_principal: string | null
  telefono_visible: boolean
  tipo_lead_id: string
  origen_lead_id: string | null
  atributos: unknown
  dueno_id: string | null
  creado_en: string
  ultimo_seguimiento_en: string | null
}

const comoObjeto = (valor: unknown): Record<string, unknown> =>
  typeof valor === 'object' && valor !== null && !Array.isArray(valor)
    ? (valor as Record<string, unknown>)
    : {}

function filaDeLeadAExportar(fila: FilaCruda): FilaDeLeadAExportar {
  return {
    id: fila.id,
    numero: fila.numero,
    nombre: fila.nombre,
    telefono: fila.telefono_principal,
    telefonoVisible: fila.telefono_visible,
    tipoLeadId: fila.tipo_lead_id,
    origenLeadId: fila.origen_lead_id,
    atributos: comoObjeto(fila.atributos),
    duenoId: fila.dueno_id,
    creadoEn: fila.creado_en,
    ultimoSeguimientoEn: fila.ultimo_seguimiento_en,
  }
}

const siguienteDe = (filas: readonly { id: string; creado_en: string }[]): Cursor | null => {
  const ultima = filas.at(-1)
  return filas.length < FILAS_POR_PEDIDO || ultima === undefined
    ? null
    : { instante: ultima.creado_en, id: ultima.id, sentido: 'siguiente' }
}

export function lectorDeLeads(cliente: ClienteDelFlujo): LectorDeExportacion<FilaDeLeadAExportar> {
  return {
    // Hasta `tope + 1` ids, de a una página, nunca un total exacto: dice cuántos hay hasta el tope y si había más.
    async contar(rango, tope) {
      let cursor: Cursor | null = null
      let leidos = 0
      while (leidos <= tope) {
        const { data, error } = await enElRango(
          cliente.rpc('datos_exportar_leads').select('id, creado_en'),
          rango,
          cursor,
        ).limit(FILAS_POR_PEDIDO)
        if (error) {
          return { ok: false, error: errorDePostgrest(error) }
        }
        leidos += data.length
        cursor = siguienteDe(data)
        if (cursor === null) {
          break
        }
      }
      return ok({ n: Math.min(leidos, tope), hayMas: leidos > tope })
    },
    async pagina(rango, cursor) {
      const { data, error } = await enElRango(
        cliente
          .rpc('datos_exportar_leads')
          .select(
            'id, numero, nombre, telefono_principal, telefono_visible, tipo_lead_id, origen_lead_id, atributos, dueno_id, creado_en, ultimo_seguimiento_en',
          ),
        rango,
        cursor,
      ).limit(FILAS_POR_PEDIDO)
      if (error) {
        return { ok: false, error: errorDePostgrest(error) }
      }
      return ok({ filas: data.map(filaDeLeadAExportar), siguiente: siguienteDe(data) })
    },
  }
}

// La constancia y el cupo (`datos_exportacion_registrar`): uno solo para todas las entidades. Un 42501 llega como `sin_permiso`.
export function registradorDe(cliente: ClienteDelFlujo): Registrador {
  return async (entidad, filas, filtros) => {
    const { data, error } = await cliente.rpc('datos_exportacion_registrar', {
      p_entidad: entidad,
      p_filas: filas,
      p_filtros: filtros,
    })
    if (error) {
      return { ok: false, error: errorDePostgrest(error) }
    }
    const registro = registroDesde(data)
    return registro === null
      ? fallo('inesperado', 'La base no confirmó la constancia de la exportación.')
      : ok(registro)
  }
}

// El nombre de cada persona por id, de los que falten (un pedido por página como mucho, nunca por fila). Bajo «perfiles: leer».
export async function nombresDePersonas(
  cliente: ClienteDelFlujo,
  ids: readonly string[],
): Promise<Resultado<ReadonlyMap<string, string>>> {
  if (ids.length === 0) {
    return ok(new Map())
  }
  const { data, error } = await cliente
    .from('perfiles')
    .select('id, nombre')
    .in('id', ids)
    .limit(ids.length)
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  return ok(new Map(data.map((perfil) => [perfil.id, perfil.nombre])))
}
