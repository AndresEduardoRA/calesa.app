import 'server-only'
import { renderToBuffer } from '@react-pdf/renderer'
import { DocumentoDeLaTarjeta, type PropsDelDocumento } from './documento-de-la-tarjeta'
import { registrarFuentes } from './fuentes'

// Los bytes del PDF de la tarjeta (4.18-3a): el documento dibujado con `@react-pdf/renderer` en el servidor. Lo carga `pdfDeUnaGuardada()` con `import()` al pedir un PDF: otra
// ruta del servidor que importa `@/modules/cotizaciones` no paga react-pdf, y nunca llega al navegador (C9).
export async function pdfDeLaTarjeta(props: PropsDelDocumento): Promise<Uint8Array<ArrayBuffer>> {
  registrarFuentes()
  return new Uint8Array(await renderToBuffer(DocumentoDeLaTarjeta(props)))
}
