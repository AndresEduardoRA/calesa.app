// @vitest-environment node
import path from 'node:path'
import { createElement as h, type ReactElement } from 'react'
import { Document, Font, Page, Rect, Svg, Text, View, renderToBuffer } from '@react-pdf/renderer'
import { Image } from '@react-pdf/renderer'
import { describe, expect, it } from 'vitest'
import { textoDelPdf } from './texto-del-pdf'

// Sólo el lector (4.18-3a, C12): PDFs que arma aquí mismo `@react-pdf/renderer` con las TTF del paso, registradas por su ruta. El documento de la tarjeta tiene su prueba
// junto a él (`infra/tarjeta/pdf/pdf-de-la-tarjeta.test.ts`).
const FUENTES = path.join(process.cwd(), 'src/modules/cotizaciones/infra/tarjeta/pdf/fuentes')
Font.register({
  family: 'GeistDelLector',
  fonts: [
    { src: path.join(FUENTES, 'Geist-Regular.ttf') },
    { src: path.join(FUENTES, 'Geist-SemiBold.ttf'), fontWeight: 600 },
  ],
})
Font.registerHyphenationCallback((palabra) => [palabra])

// Un PNG de 1 × 1 con alfa: pdfkit lo escribe como dos XObject `/Image` (la imagen y su `/SMask`), y es una sola imagen.
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
)

const conGeist = { fontFamily: 'GeistDelLector', fontSize: 10, padding: 30 }

async function pdf(...paginas: ReactElement[][]): Promise<Uint8Array> {
  const doc = h(
    Document,
    null,
    ...paginas.map((hijos, i) => h(Page, { key: i, size: 'A4', style: conGeist }, ...hijos)),
  )
  return new Uint8Array(await renderToBuffer(doc))
}

describe('textoDelPdf: lo que dice un PDF de react-pdf', () => {
  it('lee el texto con acentos, «ñ» y la ligadura «fi» (dos letras en un glifo), en Regular y SemiBold, línea por línea de arriba abajo', async () => {
    const leido = textoDelPdf(
      await pdf([
        h(Text, { key: 'a' }, 'Cotización n.º 12 · Año del ñandú · oficial'),
        h(Text, { key: 'b', style: { fontWeight: 600 } }, 'TOTAL DÓLARES oficial'),
      ]),
    )
    expect(leido.paginas).toHaveLength(1)
    expect(leido.paginas[0]?.lineas).toEqual([
      'Cotización n.º 12 · Año del ñandú · oficial',
      'TOTAL DÓLARES oficial',
    ])
  })

  it('junta en una línea lo que va a la misma altura, en orden de izquierda a derecha', async () => {
    const fila = h(
      View,
      { key: 'f', style: { flexDirection: 'row', justifyContent: 'space-between' } },
      h(Text, { key: 'e' }, 'Remate'),
      h(Text, { key: 'm' }, 'USD 9.500,00'),
    )
    const leido = textoDelPdf(await pdf([fila, h(Text, { key: 'n' }, 'Nota')]))
    expect(leido.paginas[0]?.lineas).toEqual(['Remate USD 9.500,00', 'Nota'])
  })

  it('cuenta una imagen por PNG (no su máscara) y junta los colores de relleno, sin repetir', async () => {
    const leido = textoDelPdf(
      await pdf([
        h(
          View,
          { key: 'v', style: { backgroundColor: '#0a7f3c', padding: 4 } },
          h(Text, null, 'Compra'),
        ),
        h(
          View,
          { key: 'w', style: { backgroundColor: '#0a7f3c', padding: 4 } },
          h(Text, null, 'Otra'),
        ),
        h(Image, { key: 'i', src: PNG, style: { width: 10, height: 10 } }),
        h(
          Svg,
          { key: 's', width: 20, height: 20 },
          h(Rect, { x: 0, y: 0, width: 20, height: 20, fill: '#c2185b' }),
        ),
      ]),
    )
    expect(leido.imagenes).toBe(1)
    expect(leido.rellenos).toContain('#0a7f3c')
    expect(leido.rellenos).toContain('#c2185b')
    expect(leido.rellenos.filter((c) => c === '#0a7f3c')).toHaveLength(1)
    expect(leido.paginas[0]?.lineas).toEqual(['Compra', 'Otra'])
  })

  it('sin imágenes ni color, 0 imágenes', async () => {
    const leido = textoDelPdf(await pdf([h(Text, { key: 't' }, 'Sólo texto')]))
    expect(leido.imagenes).toBe(0)
  })

  it('cada página, la suya', async () => {
    const leido = textoDelPdf(
      await pdf([h(Text, { key: 'a' }, 'Uno')], [h(Text, { key: 'b' }, 'Dos')]),
    )
    expect(leido.paginas.map((p) => p.lineas)).toEqual([['Uno'], ['Dos']])
  })

  it('un PDF con Helvetica (sin ToUnicode) no lo adivina: lanza su error', async () => {
    const helvetica = new Uint8Array(
      await renderToBuffer(h(Document, null, h(Page, { size: 'A4' }, h(Text, null, 'Hola')))),
    )
    expect(() => textoDelPdf(helvetica)).toThrow(/^PDF que el lector no entiende: /)
  })

  it('lo que no es un PDF lanza su error', () => {
    expect(() => textoDelPdf(new TextEncoder().encode('hola'))).toThrow(
      /^PDF que el lector no entiende: /,
    )
  })
})
