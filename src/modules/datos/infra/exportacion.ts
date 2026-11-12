import 'server-only'
import { errorDePostgrest, fallo, ok, type Resultado } from '@/shared/lib/errores'
import {
  FILAS_POR_PEDIDO,
  registroDesde,
  type FilaDeLeadAExportar,
  type LectorDeExportacion,
  type Registrador,
} from '../entities/exportacion'
import type { ClienteDelFlujo } from './cliente-del-flujo'
import { comoObjeto, contarHasta, enElRango, siguienteDe } from './paginas'

// Las lecturas de «exportar todo» (9.05-2), con el cliente del flujo (la sesión de quien exporta, token fijo): la RLS decide las filas.

// `datos_exportar_leads()` por `leads_listado_idx` (`creado_en desc, id desc`): la función se inlinea (9.05-1) y PostgREST empuja el rango, el
// cursor, el orden y el límite al índice. Medido en `supabase/tests/medir-datos-exportar.sql`. Las columnas van escritas en cada `select`
// (nunca `*`: la función trae también `en_cartera` y `actualizado_en`, que el archivo no lleva).

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

export function lectorDeLeads(cliente: ClienteDelFlujo): LectorDeExportacion<FilaDeLeadAExportar> {
  return {
    // Hasta `tope + 1` ids, de a una página, nunca un total exacto: dice cuántos hay hasta el tope y si había más.
    contar: (rango, tope) =>
      contarHasta(
        (cursor) =>
          enElRango(
            cliente.rpc('datos_exportar_leads').select('id, creado_en'),
            rango,
            cursor,
          ).limit(FILAS_POR_PEDIDO),
        tope,
      ),
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
