import { leerAjustes } from '@/modules/empresa'
import { getPermisos } from '@/modules/equipo'
import { exportarLeadsEnCsv, type SalidaDeExportacion } from '@/modules/leads'
import { esDelimitador } from '@/shared/lib/csv/escribir'
import { ZONA_POR_DEFECTO } from '@/shared/lib/fechas'

// La exportación de leads (parte 8). Es un POST: un GET se podría disparar desde otra página y gastaría
// el cupo por hora de quien lo abre. Autentica por la cookie de sesión (el proxy ya la refrescó) y
// además comprueba que el pedido salga de esta misma dirección. Lo que se exporta lo decide
// `exportarLeadsEnCsv`: la cartera de quien llama, con los filtros del listado.
//
//   POST { consulta: "q=…&origen=…", delimitador: ";" | "," }
//   200 text/csv (con BOM) | 400 | 403 | 404 {vacia} | 409 {total} | 429 {libreEn} | 500

const SIN_GUARDAR = { 'Cache-Control': 'no-store' }

const respuesta = (cuerpo: Record<string, unknown>, status: number) =>
  Response.json(cuerpo, { status, headers: SIN_GUARDAR })

// Un pedido del navegador trae `Origin`; si no coincide con el host, no es de esta app.
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

// El pedido: los filtros del listado y el separador, o nada si no se entiende.
async function leerPedido(peticion: Request) {
  let pedido: unknown
  try {
    pedido = await peticion.json()
  } catch {
    return null
  }
  const { consulta, delimitador } = (pedido ?? {}) as Record<string, unknown>
  if (typeof consulta !== 'string' || consulta.length > 4000 || !esDelimitador(delimitador)) {
    return null
  }
  return { consulta, delimitador }
}

function respuestaDeLaSalida(salida: SalidaDeExportacion): Response {
  switch (salida.tipo) {
    case 'sin_permiso':
      return respuesta(
        { codigo: 'sin_permiso', mensaje: 'No tienes permiso para exportar leads.' },
        403,
      )
    case 'vacia':
      return respuesta(
        { codigo: 'vacia', mensaje: 'No hay leads para exportar con estos filtros.' },
        404,
      )
    case 'demasiadas':
      return respuesta({ codigo: 'demasiadas', total: salida.total }, 409)
    case 'limite':
      return respuesta({ codigo: 'limite', libreEn: salida.libreEn }, 429)
    case 'error':
      return respuesta({ codigo: 'error', mensaje: salida.mensaje }, 500)
    case 'listo':
      return new Response(salida.cuerpo, {
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
    await exportarLeadsEnCsv({
      permisos,
      consulta: pedido.consulta,
      delimitador: pedido.delimitador,
      zona: ajustes?.zonaHoraria ?? ZONA_POR_DEFECTO,
      codigoDePais: ajustes?.telefonoCc ?? null,
      ahora: new Date().toISOString(),
    }),
  )
}
