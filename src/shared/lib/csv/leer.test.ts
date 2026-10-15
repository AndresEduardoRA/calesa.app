import { describe, expect, it } from 'vitest'
import { leerCsv, mensajeDeLectura, textoDeBytes, type LimitesDeLectura } from './leer'

const LIMITES: LimitesDeLectura = { bytes: 2 * 1024 * 1024, filas: 500, columnas: 60, celda: 2000 }

const bytes = (texto: string) => new TextEncoder().encode(texto)

describe('textoDeBytes', () => {
  it('lee UTF-8 con y sin BOM', () => {
    expect(textoDeBytes(bytes('Nombre;Teléfono'), LIMITES)).toEqual({
      ok: true,
      texto: 'Nombre;Teléfono',
    })
    expect(textoDeBytes(bytes('﻿Nombre;Teléfono'), LIMITES)).toEqual({
      ok: true,
      texto: 'Nombre;Teléfono',
    })
  })

  it('rechaza un archivo vacío', () => {
    expect(textoDeBytes(new Uint8Array(), LIMITES)).toEqual({ ok: false, error: { tipo: 'vacio' } })
  })

  it('rechaza un Latin-1 (una «é» sola no es UTF-8)', () => {
    const latin1 = Uint8Array.from([0x4e, 0x6f, 0x6d, 0x62, 0x72, 0x65, 0x3b, 0x54, 0xe9, 0x6c])
    expect(textoDeBytes(latin1, LIMITES)).toEqual({ ok: false, error: { tipo: 'no_utf8' } })
  })

  it('rechaza un binario con extensión .csv', () => {
    const png = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00])
    const resultado = textoDeBytes(png, LIMITES)
    expect(resultado.ok).toBe(false)
    const conNulos = textoDeBytes(Uint8Array.from([0x61, 0x00, 0x62]), LIMITES)
    expect(conNulos).toEqual({ ok: false, error: { tipo: 'binario' } })
  })

  it('rechaza lo que pasa del tamaño', () => {
    const grande = new Uint8Array(LIMITES.bytes + 1).fill(0x61)
    expect(textoDeBytes(grande, LIMITES)).toEqual({ ok: false, error: { tipo: 'grande' } })
    expect(textoDeBytes(new Uint8Array(LIMITES.bytes).fill(0x61), LIMITES).ok).toBe(true)
  })
})

describe('leerCsv: separadores', () => {
  it.each([
    [',', 'Nombre,Teléfono\nAna,70011002\nLuis,70011003\n'],
    [';', 'Nombre;Teléfono\nAna;70011002\nLuis;70011003\n'],
    ['\t', 'Nombre\tTeléfono\nAna\t70011002\nLuis\t70011003\n'],
  ])('detecta «%s»', (delimitador, texto) => {
    const lectura = leerCsv(texto, LIMITES)
    expect(lectura).toMatchObject({
      ok: true,
      delimitador,
      encabezados: ['Nombre', 'Teléfono'],
      filas: [
        ['Ana', '70011002'],
        ['Luis', '70011003'],
      ],
    })
  })

  it('las comillas dentro de una celda y los saltos de línea quedan en la celda', () => {
    const lectura = leerCsv('Nombre;Notas\r\nAna;"Dijo ""ok"";\nluego volvió"\r\n', LIMITES)
    expect(lectura).toMatchObject({ ok: true, filas: [['Ana', 'Dijo "ok";\nluego volvió']] })
  })

  it('no ejecuta ni interpreta fórmulas: son texto', () => {
    const lectura = leerCsv('Nombre;Notas\n=1+1;=HYPERLINK("x")\n', LIMITES)
    expect(lectura).toMatchObject({ ok: true, filas: [['=1+1', '=HYPERLINK("x")']] })
  })

  it('ignora las líneas en blanco y las celdas vacías de sobra al final', () => {
    const lectura = leerCsv('Nombre;Teléfono;;\n\nAna;70011002;;\n\n', LIMITES)
    expect(lectura).toMatchObject({
      ok: true,
      encabezados: ['Nombre', 'Teléfono'],
      filas: [['Ana', '70011002']],
    })
  })
})

describe('leerCsv: lo que no se acepta', () => {
  it('vacío o sólo espacios', () => {
    expect(leerCsv('', LIMITES)).toEqual({ ok: false, error: { tipo: 'vacio' } })
    expect(leerCsv(' \n \n', LIMITES)).toEqual({ ok: false, error: { tipo: 'vacio' } })
  })

  it('sólo encabezados', () => {
    expect(leerCsv('Nombre;Teléfono\n', LIMITES)).toEqual({
      ok: false,
      error: { tipo: 'sin_filas' },
    })
  })

  it('501 filas', () => {
    const filas = Array.from(
      { length: 501 },
      (_, i) => `Ana ${String(i)};70${String(i).padStart(6, '0')}`,
    )
    const lectura = leerCsv(`Nombre;Teléfono\n${filas.join('\n')}\n`, LIMITES)
    expect(lectura).toEqual({ ok: false, error: { tipo: 'demasiadas_filas', filas: 501 } })
    const justas = leerCsv(`Nombre;Teléfono\n${filas.slice(0, 500).join('\n')}\n`, LIMITES)
    expect(justas.ok).toBe(true)
  })

  it('más de 60 columnas', () => {
    const encabezados = Array.from({ length: 61 }, (_, i) => `C${String(i)}`).join(';')
    const fila = Array.from({ length: 61 }, () => 'x').join(';')
    expect(leerCsv(`${encabezados}\n${fila}\n`, LIMITES)).toEqual({
      ok: false,
      error: { tipo: 'demasiadas_columnas', columnas: 61 },
    })
  })

  it('una celda de 2.001 caracteres, con su fila y columna', () => {
    const larga = 'x'.repeat(2001)
    expect(leerCsv(`Nombre;Notas\nAna;${larga}\n`, LIMITES)).toEqual({
      ok: false,
      error: { tipo: 'celda_larga', fila: 2, columna: 2 },
    })
    expect(leerCsv(`Nombre;Notas\nAna;${'x'.repeat(2000)}\n`, LIMITES).ok).toBe(true)
  })

  it('comillas sin cerrar', () => {
    const lectura = leerCsv('Nombre;Notas\nAna;"sin cerrar\nLuis;otra\n', LIMITES)
    expect(lectura).toMatchObject({ ok: false, error: { tipo: 'comillas' } })
  })

  it('separadores mezclados: una fila con otra cantidad de columnas', () => {
    const lectura = leerCsv(
      'Nombre;Teléfono;Tipo\nAna;70011002;Cliente\nLuis,70011003,Cliente\n',
      LIMITES,
    )
    expect(lectura).toEqual({ ok: false, error: { tipo: 'columnas_irregulares', fila: 3 } })
  })
})

describe('mensajeDeLectura', () => {
  it('cada motivo se dice con una salida concreta', () => {
    expect(mensajeDeLectura({ tipo: 'no_utf8' }, LIMITES)).toContain('CSV UTF-8')
    expect(mensajeDeLectura({ tipo: 'demasiadas_filas', filas: 501 }, LIMITES)).toContain('501')
    expect(mensajeDeLectura({ tipo: 'grande' }, LIMITES)).toContain('2 MB')
    expect(mensajeDeLectura({ tipo: 'columnas_irregulares', fila: 3 }, LIMITES)).toContain('fila 3')
    expect(mensajeDeLectura({ tipo: 'celda_larga', fila: 2, columna: 4 }, LIMITES)).toContain(
      '2000',
    )
  })
})
