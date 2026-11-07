// Composición del área `tarjeta` de `cotizaciones` en el servidor (4.15-4). Sale por la `composicion.ts` de la raíz.
import 'server-only'
import { fallo, ok, type Resultado } from '@/shared/lib/errores'
import type { RecalculoInicial } from '../../entities/apertura'
import { calculoDeLoGuardado } from '../../entities/calculo-de-la-tarjeta'
import type { HojaDeUnaGuardada } from '../../entities/hoja-de-una-guardada'
import { archivoDelPdf } from '../../entities/tarjeta/archivo-del-pdf'
import {
  modeloDeLaTarjeta,
  type PaginaDeLaTarjeta,
} from '../../entities/tarjeta/modelo-de-la-tarjeta'
import { getAsesorDeLaCotizacion } from '../../infra/tarjeta/asesor-de-la-cotizacion'
import { logoDelPdf } from '../../infra/tarjeta/pdf/logo-del-pdf'
import { getTarjeta } from '../../infra/tarjeta/tarjeta'

// A quien creó una cotización guardada, para «Asesor:» de su tarjeta (4.18-2, P2 a).
export const leerAsesorDeLaCotizacion = getAsesorDeLaCotizacion

export type EntradaDelPdf = {
  // Lo que leyó `leerHojaDeUnaGuardada()` con la sesión de quien pide.
  lectura: { hoja: HojaDeUnaGuardada; inicial: RecalculoInicial }
  // Lo de la página, ya armado por la ruta: la fecha del último guardado en la zona de la empresa, el vehículo, el asesor, el número, si venció y el logo.
  pagina: PaginaDeLaTarjeta
  locale: string
  empresa: string
  topeDelLogo: number
}

// El PDF de una cotización guardada (4.18-3a): la tarjeta de **lo guardado** (`calculoDeLoGuardado()`, como «Vista previa» de esa guardada; nunca lo de hoy) con la lectura de
// la tarjeta de SU versión como quien pide. react-pdf se carga sólo aquí, con `import()` (C9). `sin_permiso` si la tarjeta no se ve; lo demás que falle, `inesperado`.
export async function pdfDeUnaGuardada(
  entrada: EntradaDelPdf,
): Promise<Resultado<{ bytes: Uint8Array<ArrayBuffer>; archivo: string }>> {
  const { hoja, inicial } = entrada.lectura
  const tarjeta = await getTarjeta(hoja.diseno.formula.id)
  if (!tarjeta.ok) {
    return { ok: false, error: tarjeta.error }
  }
  const modelo = modeloDeLaTarjeta({
    lectura: tarjeta.data,
    calculo: calculoDeLoGuardado(hoja, inicial.respuesta),
    monedaBs: hoja.diseno.cabecera.monedaBs,
    pagina: entrada.pagina,
  })
  const logo = await logoDelPdf({ logo: modelo.logo, tope: entrada.topeDelLogo })
  try {
    const { pdfDeLaTarjeta } = await import('../../infra/tarjeta/pdf/pdf-de-la-tarjeta')
    const bytes = await pdfDeLaTarjeta({
      modelo,
      locale: entrada.locale,
      logo,
      empresa: entrada.empresa,
    })
    return ok({ bytes, archivo: archivoDelPdf(hoja.cotizacion.numero) ?? 'cotizacion.pdf' })
  } catch (error) {
    console.error('[pdf] No se pudo dibujar la tarjeta.', error)
    return fallo('inesperado', 'No se pudo armar el PDF.')
  }
}
