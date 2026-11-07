import { z } from 'zod'
import {
  leerAsesorDeLaCotizacion,
  leerHojaDeUnaGuardada,
  pdfDeUnaGuardada,
} from '@/modules/cotizaciones'
import { PESO_MAXIMO_LOGO, leerAjustes } from '@/modules/empresa'
import { requerirSesion } from '@/modules/equipo'
import { leerVehiculo } from '@/modules/vehiculos'
import { urlPublicaONull } from '@/shared/lib/almacen'
import { formatearFecha } from '@/shared/lib/fechas'

// El PDF de una cotización guardada (4.18-3a, `docs/COTIZADOR.md` › «Plantilla de tarjeta (PDF)»): la tarjeta de **lo guardado** en A4, armada en el servidor con la sesión de
// quien lo pide (la RLS de la hoja guardada y de `cotizacion_tarjeta()` deciden; nunca la secret key). Lo ve quien ve la cotización (P4), sin clave propia.
//
//   GET /cotizaciones/<id>/pdf
//   200 application/pdf (adjunto «cotizacion-<n>.pdf») | 307 al ingreso o a cerrar la sesión | 404 text/plain | 500 text/plain
//
// Lo que no existe, está en la papelera o no se ve es el mismo 404 que la página, nunca 403: decirlo confirmaría que existe.
const NO_DISPONIBLE = 'Esta cotización ya no está disponible: no existe o ya no tienes acceso.'
const NO_SE_PUDO = 'No se pudo armar el PDF. Vuelve a intentarlo.'
const SIN_GUARDAR = { 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' }

const texto = (cuerpo: string, status: number) =>
  new Response(cuerpo, {
    status,
    headers: { 'Content-Type': 'text/plain; charset=utf-8', ...SIN_GUARDAR },
  })

// El título del vehículo si quien pide lo ve; si falla la lectura, el PDF sale sin él (como la página sin banda).
async function vehiculoDe(vehiculoId: string | null): Promise<string | null> {
  if (vehiculoId === null) {
    return null
  }
  const lectura = await leerVehiculo(vehiculoId)
  return lectura.ok ? (lectura.data?.titulo ?? null) : null
}

async function asesorDe(id: string): Promise<string | null> {
  const lectura = await leerAsesorDeLaCotizacion(id)
  return lectura.ok ? lectura.data : null
}

export async function GET(_peticion: Request, { params }: RouteContext<'/cotizaciones/[id]/pdf'>) {
  // La segunda barrera tras el proxy: sin sesión, al ingreso; con la cuenta dada de baja, a cerrar la sesión. Antes de leer nada.
  await requerirSesion()
  const { id } = await params
  if (!z.guid().safeParse(id).success) {
    return texto(NO_DISPONIBLE, 404)
  }
  const lectura = await leerHojaDeUnaGuardada(id)
  if (!lectura.ok) {
    return lectura.error.codigo === 'sin_permiso'
      ? texto(NO_DISPONIBLE, 404)
      : texto(NO_SE_PUDO, 500)
  }
  const { hoja } = lectura.data
  // Los ajustes por `leerAjustes()`, que falla: un PDF que va al cliente no sale con el locale o la zona de fábrica.
  const [vehiculo, asesor, ajustes] = await Promise.all([
    vehiculoDe(hoja.cotizacion.vehiculoId),
    asesorDe(id),
    leerAjustes(),
  ])
  if (!ajustes.ok) {
    return texto(NO_SE_PUDO, 500)
  }
  const { nombre, logoRuta, locale, zonaHoraria } = ajustes.data.ajustes
  const url = urlPublicaONull('marca', logoRuta)
  const pdf = await pdfDeUnaGuardada({
    lectura: lectura.data,
    pagina: {
      // El día del último guardado (P3 del 4.18-2), en la zona de la empresa.
      fecha: formatearFecha(hoja.cotizacion.actualizadoEn, { zona: zonaHoraria }),
      vehiculo,
      asesor,
      numero: hoja.cotizacion.numero,
      vencida: hoja.vencida,
      logo: url === null ? null : { nombre, url },
    },
    locale,
    empresa: nombre,
    topeDelLogo: PESO_MAXIMO_LOGO,
  })
  if (!pdf.ok) {
    return pdf.error.codigo === 'sin_permiso' ? texto(NO_DISPONIBLE, 404) : texto(NO_SE_PUDO, 500)
  }
  return new Response(pdf.data.bytes, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${pdf.data.archivo}"`,
      ...SIN_GUARDAR,
    },
  })
}
