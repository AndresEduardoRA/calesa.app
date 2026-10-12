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
    // La redirección no se guarda: al regenerar, los íconos anteriores se borran de Storage, y
    // una redirección vieja apuntaría a un objeto que ya no está. El destino sí se cachea (su
    // nombre es el hash de su contenido).
    headers: { Location: destino, 'Cache-Control': 'no-cache' },
  })
}
