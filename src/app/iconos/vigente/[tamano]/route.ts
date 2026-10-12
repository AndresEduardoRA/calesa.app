import { claveDeIconoVigente, getAjustes, urlDeIcono } from '@/modules/empresa'
import { urlPublica } from '@/shared/lib/almacen'

// A dónde apuntan los <link rel="icon"> del documento. El layout raíz es estático y no puede leer
// los ajustes: enlaza a esta dirección fija, que redirige al ícono generado desde el logo (en
// Storage) o, si la empresa no generó los suyos, al neutro de public/. Se pide sin sesión.
export async function GET(
  _peticion: Request,
  { params }: RouteContext<'/iconos/vigente/[tamano]'>,
) {
  const { tamano } = await params
  const clave = claveDeIconoVigente(tamano)
  if (!clave) {
    return new Response(null, { status: 404 })
  }
  const ajustes = await getAjustes()
  const destino = urlDeIcono(ajustes.iconos, clave, (ruta) => urlPublica('marca', ruta))
  return new Response(null, {
    status: 307,
    // Cinco minutos: un ícono regenerado se ve pronto sin pedirle a la base en cada pestaña.
    headers: { Location: destino, 'Cache-Control': 'public, max-age=300' },
  })
}
