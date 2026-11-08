// Favorita, reportar y moderar una cotización (4.27-4): qué se dibuja según lo que la página leyó. Lo decide la base en cada RPC (`cotizacion_moderar`,
// `cotizacion_reportar`, `cotizacion_favorito_poner`, 4.27-1); esto sólo no dibuja lo que la base rechazaría. Sin Zod ni React: lo usa el servidor para
// elegir qué llega al navegador, y al navegador llegan sólo las acciones ya calculadas (el JS en frío de la guardada está cerca de su tope).
import { puede, type Permisos } from '@/shared/lib/permisos'
import type { CotizacionDeLaHoja } from '../hoja-de-una-guardada'

// `reportada` es un valor del enum que quedó sin uso (P6 a del 4.27): se lee como `activa`.
export type EstadoDeLaCotizacion = 'activa' | 'reportada' | 'invalida'

export type MarcasDeLaCotizacion = {
  estado: EstadoDeLaCotizacion
  // El contador de la base (`reportes_count`): no es un total que se muestre, sólo dice si hay.
  reportesCount: number
  // La favorita y el motivo del reporte de quien mira (nulo si no la reportó).
  favorita: boolean
  miMotivo: string | null
}

export type AccionDeModerar = 'invalidar' | 'descartar' | 'reactivar'

export type InsigniaDeLaCotizacion = {
  texto: 'Inválida' | 'Reportada'
  tono: 'destructive' | 'outline'
}

// El espejo de `cotizacion_moderar`: `cotizaciones.moderar` (global, como `tiene_permiso()` sin origen) y, en una final, `cotizaciones.final.gestionar` de su origen.
export function puedeModerarLaCotizacion(
  cotizacion: Pick<CotizacionDeLaHoja, 'clase' | 'origenId'>,
  permisos: Permisos,
): boolean {
  return (
    puede(permisos, 'cotizaciones.moderar') &&
    (cotizacion.clase !== 'final' ||
      puede(permisos, 'cotizaciones.final.gestionar', cotizacion.origenId))
  )
}

// «Inválida» la ven todos; «Reportada» (activa con reportes) sólo quien la puede moderar (P1 a del 4.27-4): nadie se entera de un reporte que no se juzgó.
export function insigniaDeLaCotizacion(
  marcas: Pick<MarcasDeLaCotizacion, 'estado' | 'reportesCount'>,
  puedeModerar: boolean,
): InsigniaDeLaCotizacion | null {
  if (marcas.estado === 'invalida') {
    return { texto: 'Inválida', tono: 'destructive' }
  }
  return marcas.reportesCount > 0 && puedeModerar ? { texto: 'Reportada', tono: 'outline' } : null
}

// Lo que quien modera puede hacer: invalidar toda activa (P3 a), descartar los reportes si los tiene, y reactivar una inválida (P2 a), que también los descarta.
export function accionesDeModerar(
  marcas: Pick<MarcasDeLaCotizacion, 'estado' | 'reportesCount'>,
): AccionDeModerar[] {
  if (marcas.estado === 'invalida') {
    return ['reactivar']
  }
  return marcas.reportesCount > 0 ? ['invalidar', 'descartar'] : ['invalidar']
}
