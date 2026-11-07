// El PDF de una cotización guardada pedido desde el navegador (4.18-3b, C5): «Descargar PDF» de «Vista previa» pide la ruta del 4.18-3a con la sesión de quien mira y recibe
// los bytes, para bajarlos como archivo sin salir de la página. No sigue la redirección (sin sesión la ruta manda al ingreso: bajaría la página de ingreso) y no guarda en
// caché. Los textos los pone quien dibuja: el cuerpo de la respuesta no se muestra nunca.
import { fallo, ok, type Resultado } from '@/shared/lib/errores'

const ES_PDF = /^application\/pdf\b/

export async function pedirElPdf(ruta: string): Promise<Resultado<Blob>> {
  let respuesta: Response
  try {
    respuesta = await fetch(ruta, { redirect: 'manual', cache: 'no-store' })
  } catch {
    return fallo('inesperado', 'No se pudo pedir el PDF.')
  }
  if (respuesta.type === 'opaqueredirect' || (respuesta.status >= 300 && respuesta.status < 400)) {
    return fallo('no_autenticado', 'La sesión no vale.')
  }
  if (respuesta.status === 404) {
    return fallo('no_encontrado', 'No está disponible.')
  }
  if (!respuesta.ok || !ES_PDF.test(respuesta.headers.get('content-type') ?? '')) {
    return fallo('inesperado', 'No se pudo armar el PDF.')
  }
  try {
    return ok(await respuesta.blob())
  } catch {
    return fallo('inesperado', 'No se pudo leer el PDF.')
  }
}
