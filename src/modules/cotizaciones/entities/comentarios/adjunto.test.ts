import { describe, expect, it } from 'vitest'
import {
  adjuntosDesde,
  claseDeArchivo,
  MENSAJE_DEL_TOPE,
  MIME_DE_WORD,
  nombreDelAdjunto,
  PESO_MAXIMO_DE_ADJUNTO,
  puedeQuitarAdjunto,
  repartirElegidos,
  tamanoLegible,
} from './adjunto'

const archivo = (name: string, type: string, size = 1000) => ({ name, type, size })

describe('puedeQuitarAdjunto', () => {
  const propio = { mio: true }
  const ajeno = { mio: false }
  it('quita quien lo subió mientras todavía puede adjuntar', () => {
    expect(puedeQuitarAdjunto(propio, { puedeAdjuntar: true, puedeModerar: false })).toBe(true)
    expect(puedeQuitarAdjunto(propio, { puedeAdjuntar: false, puedeModerar: false })).toBe(false)
  })
  it('lo ajeno sólo lo quita quien modera', () => {
    expect(puedeQuitarAdjunto(ajeno, { puedeAdjuntar: true, puedeModerar: true })).toBe(true)
    expect(puedeQuitarAdjunto(ajeno, { puedeAdjuntar: false, puedeModerar: true })).toBe(true)
    expect(puedeQuitarAdjunto(ajeno, { puedeAdjuntar: true, puedeModerar: false })).toBe(false)
  })
})

describe('claseDeArchivo', () => {
  it('reconoce PDF, Word e imágenes por el tipo y, sin tipo, PDF y Word por la extensión', () => {
    expect(claseDeArchivo(archivo('a.pdf', 'application/pdf'))).toBe('pdf')
    expect(claseDeArchivo(archivo('a.docx', MIME_DE_WORD))).toBe('docx')
    expect(claseDeArchivo(archivo('a.heic', 'image/heic'))).toBe('imagen')
    expect(claseDeArchivo(archivo('Informe.DOCX', ''))).toBe('docx')
    expect(claseDeArchivo(archivo('a.pdf', ''))).toBe('pdf')
  })
  it('rechaza lo demás', () => {
    expect(
      claseDeArchivo(
        archivo('a.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'),
      ),
    ).toBeNull()
    expect(claseDeArchivo(archivo('a.doc', 'application/msword'))).toBeNull()
    expect(claseDeArchivo(archivo('sin-tipo', ''))).toBeNull()
  })
})

describe('repartirElegidos', () => {
  it('con 18 cargados sube 2 de 3 válidos y avisa el tope una vez', () => {
    const elegidos = [
      archivo('a.pdf', 'application/pdf'),
      archivo('b.png', 'image/png'),
      archivo('c.pdf', 'application/pdf'),
    ]
    const { aceptados, rechazos } = repartirElegidos(elegidos, 18)
    expect(aceptados.map((a) => a.name)).toEqual(['a.pdf', 'b.png'])
    expect(rechazos).toEqual([MENSAJE_DEL_TOPE])
  })
  it('rechaza un tipo ajeno y un PDF o Word de más de 25 MB; una imagen grande pasa (se mide convertida)', () => {
    const { aceptados, rechazos } = repartirElegidos(
      [
        archivo('planilla.xlsx', 'application/vnd.ms-excel'),
        archivo('grande.docx', MIME_DE_WORD, PESO_MAXIMO_DE_ADJUNTO + 1),
        archivo('foto.jpg', 'image/jpeg', PESO_MAXIMO_DE_ADJUNTO + 1),
        archivo('justo.pdf', 'application/pdf', PESO_MAXIMO_DE_ADJUNTO),
      ],
      0,
    )
    expect(aceptados.map((a) => a.name)).toEqual(['foto.jpg', 'justo.pdf'])
    expect(rechazos).toEqual([
      'planilla.xlsx: sólo PDF, imágenes o Word.',
      'grande.docx pesa más de 25 MB.',
    ])
  })
  it('en el tope no sube nada', () => {
    const { aceptados, rechazos } = repartirElegidos([archivo('a.pdf', 'application/pdf')], 20)
    expect(aceptados).toEqual([])
    expect(rechazos).toEqual([MENSAJE_DEL_TOPE])
  })
})

describe('nombreDelAdjunto', () => {
  it('una imagen convertida cambia la extensión y lo demás conserva su nombre', () => {
    expect(nombreDelAdjunto('foto.HEIC', 'webp')).toBe('foto.webp')
    expect(nombreDelAdjunto('Presupuesto.PDF', 'pdf')).toBe('Presupuesto.pdf')
    expect(nombreDelAdjunto('sin-extension', 'docx')).toBe('sin-extension.docx')
  })
  it('saca las barras y el nulo, y lo vacío queda «archivo»', () => {
    expect(nombreDelAdjunto('a/b\\c\u0000.pdf', 'pdf')).toBe('abc.pdf')
    expect(nombreDelAdjunto(' / ', 'pdf')).toBe('archivo.pdf')
    expect(nombreDelAdjunto('.env', 'pdf')).toBe('.env.pdf')
  })
  it('a lo sumo 200 caracteres, con su extensión', () => {
    const nombre = nombreDelAdjunto(`${'x'.repeat(250)}.pdf`, 'pdf')
    expect(nombre).toHaveLength(200)
    expect(nombre.endsWith('x.pdf')).toBe(true)
  })
})

describe('adjuntosDesde', () => {
  const fila = {
    id: '4f1c2b0e-8a3d-4c55-9e21-0d6f7a1b2c3d',
    ruta: `4f1c2b0e-8a3d-4c55-9e21-0d6f7a1b2c3d/${'a'.repeat(64)}.pdf`,
    nombre: 'p.pdf',
    mime: 'application/pdf',
    bytes: 1200,
    creado_en: '2026-11-08T10:00:00.123456+00:00',
    subido_por: '0b6a3c1e-2f4d-4e5a-8b7c-9d0e1f2a3b4c',
    autor: { nombre: 'Ana' },
  }
  it('dice cuál es de quien mira', () => {
    const leidos = adjuntosDesde([fila], '0b6a3c1e-2f4d-4e5a-8b7c-9d0e1f2a3b4c')
    expect(leidos?.[0]?.mio).toBe(true)
    expect(adjuntosDesde([fila], null)?.[0]?.mio).toBe(false)
  })
  it('una forma rota es null, nunca una lista vacía', () => {
    expect(adjuntosDesde([{ ...fila, bytes: 'mucho' }], null)).toBeNull()
  })
})

describe('tamanoLegible', () => {
  it('en KB bajo 1 MB (nunca 0) y en MB con un decimal', () => {
    expect(tamanoLegible(10)).toBe('1 KB')
    expect(tamanoLegible(340 * 1024)).toBe('340 KB')
    expect(tamanoLegible(1.25 * 1024 * 1024)).toBe('1,3 MB')
  })
})
