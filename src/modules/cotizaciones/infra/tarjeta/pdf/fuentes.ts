import 'server-only'
import path from 'node:path'
import { Font } from '@react-pdf/renderer'

// Las fuentes del PDF (4.18-3a, C8, P1): Geist Regular y SemiBold en TTF, la fuente de la app, del release oficial (`vercel/geist-font` v1.9.2, OFL 1.1: `fuentes/OFL.txt`;
// la versión y el sha256, en `docs/DECISIONES.md` (paso 4.18-3a)). Se registran una vez por proceso con la ruta del archivo; `next.config.ts` las lleva al desplegar
// (`outputFileTracingIncludes`). Sin separación en sílabas: no parte un monto ni un nombre.
export const FAMILIA_DEL_PDF = 'Geist'

const CARPETA = path.join(process.cwd(), 'src/modules/cotizaciones/infra/tarjeta/pdf/fuentes')
let registradas = false

export function registrarFuentes(): void {
  if (registradas) {
    return
  }
  Font.register({
    family: FAMILIA_DEL_PDF,
    fonts: [
      { src: path.join(CARPETA, 'Geist-Regular.ttf'), fontWeight: 400 },
      { src: path.join(CARPETA, 'Geist-SemiBold.ttf'), fontWeight: 600 },
    ],
  })
  Font.registerHyphenationCallback((palabra) => [palabra])
  registradas = true
}
