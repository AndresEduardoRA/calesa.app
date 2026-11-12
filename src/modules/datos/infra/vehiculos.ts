import 'server-only'
import { errorDePostgrest, ok } from '@/shared/lib/errores'
import {
  FILAS_POR_PEDIDO,
  type FilaDeVehiculoAExportar,
  type LectorDeExportacion,
} from '../entities/exportacion'
import type { ClienteDelFlujo } from './cliente-del-flujo'
import { comoObjeto, contarHasta, enElRango, siguienteDe } from './paginas'

// Los vehículos de un origen para «exportar todo» (9.05-2b), de la tabla `vehiculos` con el cliente del flujo (la sesión de quien exporta, token
// fijo). Por `vehiculos_origen_listado_idx` (`origen_id, creado_en desc, id desc`, parcial sin papelera: la policy «vehiculos: leer» trae
// `eliminado_en is null`). La RLS de quien exporta decide las filas; con «propios», una pasada por el origen. No es `vehiculos_inventario()`: esa
// corta en 100 y suma la portada por página. Medido en `supabase/tests/medir-datos-exportar-vehiculos.sql`.
// Las columnas van escritas (nunca `*`): sin vitrina, lead, creador, portada ni limpieza.

const COLUMNAS =
  'id, numero, titulo, marca, modelo, anio, vin, lote, plataforma, url_origen, precio, precio_negociable, acepta_permuta, placado, kilometraje, categoria_id, fase_id, atributos, creado_en, actualizado_en'

type FilaCruda = {
  id: string
  numero: number
  titulo: string
  marca: string | null
  modelo: string | null
  anio: number | null
  vin: string | null
  lote: string | null
  plataforma: string | null
  url_origen: string | null
  precio: number | null
  precio_negociable: boolean | null
  acepta_permuta: boolean | null
  placado: boolean | null
  kilometraje: number | null
  categoria_id: string | null
  fase_id: string | null
  atributos: unknown
  creado_en: string
  actualizado_en: string
}

function filaDeVehiculoAExportar(fila: FilaCruda): FilaDeVehiculoAExportar {
  return {
    id: fila.id,
    numero: fila.numero,
    titulo: fila.titulo,
    marca: fila.marca,
    modelo: fila.modelo,
    anio: fila.anio,
    vin: fila.vin,
    categoriaId: fila.categoria_id,
    kilometraje: fila.kilometraje,
    placado: fila.placado,
    lote: fila.lote,
    plataforma: fila.plataforma,
    urlOrigen: fila.url_origen,
    // Tal como lo entrega la base (`numeric(18,2)`): sin redondear ni convertir.
    precio: fila.precio,
    precioNegociable: fila.precio_negociable,
    aceptaPermuta: fila.acepta_permuta,
    faseId: fila.fase_id,
    atributos: comoObjeto(fila.atributos),
    creadoEn: fila.creado_en,
    actualizadoEn: fila.actualizado_en,
  }
}

export function lectorDeVehiculos(
  cliente: ClienteDelFlujo,
  origenId: string,
): LectorDeExportacion<FilaDeVehiculoAExportar> {
  return {
    contar: (rango, tope) =>
      contarHasta(
        (cursor) =>
          enElRango(
            cliente.from('vehiculos').select('id, creado_en').eq('origen_id', origenId),
            rango,
            cursor,
          ).limit(FILAS_POR_PEDIDO),
        tope,
      ),
    async pagina(rango, cursor) {
      const { data, error } = await enElRango(
        cliente.from('vehiculos').select(COLUMNAS).eq('origen_id', origenId),
        rango,
        cursor,
      ).limit(FILAS_POR_PEDIDO)
      if (error) {
        return { ok: false, error: errorDePostgrest(error) }
      }
      return ok({ filas: data.map(filaDeVehiculoAExportar), siguiente: siguienteDe(data) })
    },
  }
}
