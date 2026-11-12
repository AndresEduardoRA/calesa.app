// Cómo se escribe una cotización en el archivo de «exportar todo» (9.05-2c). Puro: la fila ya viene de la tabla `cotizaciones` con la sesión de
// quien exporta (la RLS decidió qué filas) y los nombres de su página ya están en los mapas (sólo los que la RLS dejó ver).
//
// Columnas: «N.º», «Título», «Cliente», «Vehículo», «Origen», «Clase», «Estado», «Total (<moneda base>)», «Creado» y «Actualizado». El total sale tal
// como lo guarda la base (en moneda base, sin redondear ni convertir). Las fechas, en la zona de la empresa (`AAAA-MM-DDTHH:mm`).
import type { Celda } from '@/shared/lib/csv/escribir'
import { localDeInstante } from '@/shared/lib/fechas'
import type { FilaDeCotizacionAExportar } from '../../entities/exportacion'

export type ContextoDeCotizaciones = {
  origenes: ReadonlyMap<string, string>
  // Los de la página que se escribe: los llena `antesDeEscribir` de la fuente.
  clientes: ReadonlyMap<string, string>
  vehiculos: ReadonlyMap<string, string>
  // La de los ajustes de la empresa; si no se pudieron leer, el encabezado dice «Total».
  monedaBase: string | null
  zona: string
}

// Las mismas palabras que `ETIQUETA_DE_CLASE` de `cotizaciones` (`entities/historial-del-vehiculo.ts`), que no sale por su entrada. Exhaustivo: si
// el enum crece, no compila.
const ETIQUETA_DE_CLASE: Record<FilaDeCotizacionAExportar['clase'], string> = {
  preventa: 'Preventa',
  final: 'Final',
}

const ETIQUETA_DE_ESTADO: Record<FilaDeCotizacionAExportar['estado'], string> = {
  activa: 'Activa',
  reportada: 'Reportada',
  invalida: 'Inválida',
}

export function encabezadosDeCotizaciones(contexto: ContextoDeCotizaciones): string[] {
  return [
    'N.º',
    'Título',
    'Cliente',
    'Vehículo',
    'Origen',
    'Clase',
    'Estado',
    contexto.monedaBase === null ? 'Total' : `Total (${contexto.monedaBase})`,
    'Creado',
    'Actualizado',
  ]
}

const nombre = (mapa: ReadonlyMap<string, string>, id: string | null): string =>
  id === null ? '' : (mapa.get(id) ?? '')

export function filaDeCotizacion(
  fila: FilaDeCotizacionAExportar,
  contexto: ContextoDeCotizaciones,
): Celda[] {
  return [
    fila.numero,
    fila.titulo ?? '',
    nombre(contexto.clientes, fila.leadId),
    nombre(contexto.vehiculos, fila.vehiculoId),
    nombre(contexto.origenes, fila.origenId),
    ETIQUETA_DE_CLASE[fila.clase],
    ETIQUETA_DE_ESTADO[fila.estado],
    // Tal como lo entrega la base: el escritor CSV lo dice con coma decimal, sin completar decimales.
    fila.totalBase,
    localDeInstante(fila.creadoEn, { zona: contexto.zona }),
    localDeInstante(fila.actualizadoEn, { zona: contexto.zona }),
  ]
}
