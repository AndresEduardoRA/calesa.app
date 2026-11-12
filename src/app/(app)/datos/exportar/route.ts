import { leerAjustes } from '@/modules/empresa'
import { getPermisos } from '@/modules/equipo'
import { esquemaDelPedido, exportarTodo, type SalidaDeExportacionTotal } from '@/modules/datos'
import { MENSAJE_SESION_VENCIDA } from '@/shared/lib/errores'
import { ZONA_POR_DEFECTO } from '@/shared/lib/fechas'

// Exportar todo (9.05-2, `datos.exportar.todo`). Es un POST: un GET se podría disparar desde otra página y gastaría el cupo por hora de quien
// lo abre. Autentica por la cookie de sesión y comprueba que el pedido salga de esta misma dirección. La constancia
// (`datos_exportacion_registrar`: el permiso real y 3 por hora) se deja **antes** del primer byte: sin ella, 403 o 429 y ningún dato.
//
//   POST { entidad: "leads" | "vehiculos" | "cotizaciones", delimitador: ";" | ",", desde?: "AAAA-MM-DD", hasta?: "AAAA-MM-DD", origen?: uuid }
//   (vehículos: `origen` obligatorio, un archivo por origen; cotizaciones: `origen` optativo; leads: sin `origen`)
//   200 text/csv (con BOM, por un flujo) | 400 {pedido} | 401 {sesion} | 403 {origen|sin_permiso} | 404 {vacia} | 409 {demasiadas, tope}
//   | 429 {limite, libreEn} | 500 {error}

const SIN_GUARDAR = { 'Cache-Control': 'no-store' }

const respuesta = (cuerpo: Record<string, unknown>, status: number) =>
  Response.json(cuerpo, { status, headers: SIN_GUARDAR })

// Un pedido del navegador trae `Origin`; si no coincide con el host, no es de esta app. (La misma regla que `POST /leads/exportar`.)
function esDeEstaApp(peticion: Request): boolean {
  const origen = peticion.headers.get('origin')
  if (origen === null) {
    return true
  }
  try {
    return new URL(origen).host === peticion.headers.get('host')
  } catch {
    return false
  }
}

async function leerPedido(peticion: Request) {
  try {
    const leido = esquemaDelPedido.safeParse(await peticion.json())
    return leido.success ? leido.data : null
  } catch {
    return null
  }
}

function respuestaDeLaSalida(salida: SalidaDeExportacionTotal): Response {
  switch (salida.tipo) {
    case 'sin_permiso':
      return respuesta(
        { codigo: 'sin_permiso', mensaje: 'No tienes permiso para exportar todo.' },
        403,
      )
    case 'sesion':
      return respuesta({ codigo: 'sesion', mensaje: MENSAJE_SESION_VENCIDA }, 401)
    case 'vacia':
      return respuesta({ codigo: 'vacia', mensaje: 'No hay nada para exportar en ese rango.' }, 404)
    case 'demasiadas':
      return respuesta({ codigo: 'demasiadas', tope: salida.tope }, 409)
    case 'limite':
      return respuesta({ codigo: 'limite', libreEn: salida.libreEn }, 429)
    case 'error':
      return respuesta({ codigo: 'error', mensaje: salida.mensaje }, 500)
    case 'listo':
      return new Response(salida.flujo, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${salida.nombre}"`,
          'X-Total-De-Filas': String(salida.filas),
          ...SIN_GUARDAR,
        },
      })
  }
}

export async function POST(peticion: Request) {
  if (!esDeEstaApp(peticion)) {
    return respuesta({ codigo: 'origen', mensaje: 'El pedido no salió de esta aplicación.' }, 403)
  }
  const pedido = await leerPedido(peticion)
  if (!pedido) {
    return respuesta({ codigo: 'pedido', mensaje: 'No entendimos el pedido.' }, 400)
  }
  const [permisos, ajustesLeidos] = await Promise.all([getPermisos(), leerAjustes()])
  // Si no se pueden leer: la zona por defecto y el teléfono con «+» (como el listado).
  const ajustes = ajustesLeidos.ok ? ajustesLeidos.data.ajustes : null
  return respuestaDeLaSalida(
    await exportarTodo({
      pedido,
      permisos,
      zona: ajustes?.zonaHoraria ?? ZONA_POR_DEFECTO,
      codigoDePais: ajustes?.telefonoCc ?? null,
      monedaBase: ajustes?.monedaBase ?? null,
    }),
  )
}
