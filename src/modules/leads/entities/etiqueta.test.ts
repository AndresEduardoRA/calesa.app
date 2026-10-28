// @vitest-environment node
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { definicionSql, tablaSql } from '../../../../scripts/lib/definicion-sql'
import { CONTRASTE_AA, contraste } from '@/shared/lib/color'
import {
  CLAVES_DE_COLOR,
  MAXIMO_DE_ETIQUETAS,
  NOMBRE_DEL_COLOR,
  colorSugerido,
  conEtiqueta,
  etiquetaConNombre,
  etiquetaDesde,
  etiquetasConUsoDesde,
  etiquetasDelLead,
  etiquetasDesde,
  filtrarEtiquetas,
  ordenarEtiquetas,
  sinEtiqueta,
  textoDeEliminar,
  validarNombreDeEtiqueta,
  type Etiqueta,
} from './etiqueta'

const una = (id: string, nombre: string, color: Etiqueta['color'] = 'gris'): Etiqueta => ({
  id: `00000000-0000-0000-0000-${id.padStart(12, '0')}`,
  nombre,
  color,
  actualizadoEn: '2026-10-15T12:00:00Z',
})

describe('etiquetaDesde y etiquetasDesde', () => {
  it('lee la fila de la base y un color desconocido cae a gris', () => {
    const fila = { id: una('1', 'x').id, nombre: 'VIP', color: 'fucsia', actualizado_en: 'v1' }
    expect(etiquetaDesde(fila)).toEqual({
      id: una('1', 'x').id,
      nombre: 'VIP',
      color: 'gris',
      actualizadoEn: 'v1',
    })
  })

  it('descarta lo que no cumple la forma sin tumbar la lista', () => {
    const buena = { id: una('1', 'x').id, nombre: 'VIP', color: 'rojo', actualizado_en: 'v1' }
    expect(etiquetasDesde([buena, { id: 'no', nombre: '' }, null])).toHaveLength(1)
    expect(etiquetasDesde(null)).toEqual([])
    expect(etiquetaDesde({ ...buena, nombre: '' })).toBeNull()
  })

  it('lee el uso de la vista', () => {
    const fila = {
      id: una('1', 'x').id,
      nombre: 'VIP',
      color: 'rojo',
      actualizado_en: 'v1',
      leads: 3,
    }
    expect(etiquetasConUsoDesde([fila, { ...fila, leads: -1 }])).toEqual([
      { id: fila.id, nombre: 'VIP', color: 'rojo', actualizadoEn: 'v1', leads: 3 },
    ])
  })
})

describe('ordenar y dibujar las de un lead', () => {
  const lista = [una('1', 'Urgente'), una('2', 'ámbar'), una('3', 'Azul')]

  it('ordena por nombre sin importar acentos ni mayúsculas', () => {
    expect(ordenarEtiquetas(lista).map((e) => e.nombre)).toEqual(['ámbar', 'Azul', 'Urgente'])
  })

  it('las de un lead salen ordenadas y un id que ya no está no se dibuja', () => {
    const ids = [una('1', '').id, una('9', '').id, una('2', '').id]
    expect(etiquetasDelLead(ids, lista).map((e) => e.nombre)).toEqual(['ámbar', 'Urgente'])
  })
})

describe('filtrarEtiquetas', () => {
  it('busca sin acentos ni mayúsculas y vacío devuelve todas', () => {
    const lista = [una('1', 'Ámbar'), una('2', 'Llamar'), una('3', 'VIP')]
    expect(filtrarEtiquetas(lista, 'AMB').map((e) => e.nombre)).toEqual(['Ámbar'])
    expect(filtrarEtiquetas(lista, 'ar').map((e) => e.nombre)).toEqual(['Ámbar', 'Llamar'])
    expect(filtrarEtiquetas(lista, '  ')).toHaveLength(3)
  })
})

describe('validarNombreDeEtiqueta', () => {
  const lista = [una('1', 'VIP'), una('2', 'Urgente')]

  it('recorta y acepta', () => {
    expect(validarNombreDeEtiqueta('  Llamar  ', lista)).toEqual({ ok: true, nombre: 'Llamar' })
  })

  it('rechaza vacío, largo y repetido sin importar mayúsculas', () => {
    expect(validarNombreDeEtiqueta('   ', lista)).toEqual({ ok: false, motivo: 'vacio' })
    expect(validarNombreDeEtiqueta('x'.repeat(31), lista)).toEqual({ ok: false, motivo: 'largo' })
    expect(validarNombreDeEtiqueta('x'.repeat(30), lista).ok).toBe(true)
    expect(validarNombreDeEtiqueta(' vip ', lista)).toEqual({ ok: false, motivo: 'repetido' })
  })

  it('al renombrar, la misma con otras mayúsculas vale y el tope no cuenta', () => {
    expect(validarNombreDeEtiqueta('Vip', lista, lista[0]?.id ?? null)).toEqual({
      ok: true,
      nombre: 'Vip',
    })
    expect(validarNombreDeEtiqueta('urgente', lista, lista[0]?.id ?? null)).toEqual({
      ok: false,
      motivo: 'repetido',
    })
    const llena = Array.from({ length: MAXIMO_DE_ETIQUETAS }, (_, i) => una(String(i + 1), `E${i}`))
    expect(validarNombreDeEtiqueta('Otra', llena)).toEqual({ ok: false, motivo: 'tope' })
    expect(validarNombreDeEtiqueta('Otra', llena, llena[0]?.id ?? null).ok).toBe(true)
  })

  it('etiquetaConNombre encuentra la que ya existe', () => {
    expect(etiquetaConNombre('urgente ', lista)?.nombre).toBe('Urgente')
    expect(etiquetaConNombre('urgente', lista, lista[1]?.id ?? null)).toBeNull()
  })
})

describe('colorSugerido', () => {
  it('el menos usado y, entre empatados, el primero de la paleta', () => {
    expect(colorSugerido([])).toBe('gris')
    expect(colorSugerido([una('1', 'a', 'gris')])).toBe('rojo')
    expect(
      colorSugerido([una('1', 'a', 'gris'), una('2', 'b', 'rojo'), una('3', 'c', 'gris')]),
    ).toBe('naranja')
  })

  it('reparte la paleta', () => {
    let lista: Etiqueta[] = []
    for (let i = 0; i < CLAVES_DE_COLOR.length * 2; i++) {
      lista = [...lista, una(String(i + 1), `E${i}`, colorSugerido(lista))]
    }
    expect(new Set(lista.map((e) => e.color)).size).toBe(CLAVES_DE_COLOR.length)
  })
})

describe('conEtiqueta, sinEtiqueta y textoDeEliminar', () => {
  it('pone en su lugar, agrega y quita', () => {
    const lista = [una('1', 'A'), una('2', 'B')]
    expect(conEtiqueta(lista, { ...una('1', 'A2') }).map((e) => e.nombre)).toEqual(['A2', 'B'])
    expect(conEtiqueta(lista, una('3', 'C'))).toHaveLength(3)
    expect(sinEtiqueta(lista, una('1', '').id).map((e) => e.nombre)).toEqual(['B'])
  })

  it('dice a cuántos leads toca', () => {
    expect(textoDeEliminar({ ...una('1', 'A'), leads: 1 })).toBe(
      'Se quita de 1 lead. No se puede deshacer.',
    )
    expect(textoDeEliminar({ ...una('1', 'A'), leads: 7 })).toBe(
      'Se quita de 7 leads. No se puede deshacer.',
    )
  })
})

// La paleta vive en tres lugares: acá, en la base y en los tokens. Los tres dicen lo mismo, y el
// texto de cada etiqueta se lee sobre su fondo en claro y en oscuro.
describe('la paleta', () => {
  const tokens = readFileSync(join(process.cwd(), 'design/tokens.css'), 'utf8')
  const bloque = (selector: string) => {
    const inicio = tokens.indexOf(`${selector} {\n  --etiqueta-`)
    expect(inicio).toBeGreaterThan(-1)
    return tokens.slice(inicio, tokens.indexOf('}', inicio))
  }
  const valor = (texto: string, nombre: string) =>
    new RegExp(`--${nombre}: (#[0-9a-f]{6});`).exec(texto)?.[1]

  it('es la misma que la del check y la de _etiquetas_paleta()', () => {
    const tabla = tablaSql('etiquetas').texto
    const check = /CONSTRAINT "?etiquetas_color_paleta"? CHECK \((.*)\),?$/im.exec(tabla)?.[1]
    expect(check).toBeDefined()
    expect([...(check ?? '').matchAll(/'([a-z]+)'/g)].map((m) => m[1])).toEqual([
      ...CLAVES_DE_COLOR,
    ])
    const funcion = /select array\[([^\]]*)\];/.exec(definicionSql('_etiquetas_paleta').texto)?.[1]
    expect(funcion?.split(',').map((x) => x.trim().replaceAll("'", ''))).toEqual([
      ...CLAVES_DE_COLOR,
    ])
    expect(Object.keys(NOMBRE_DEL_COLOR)).toEqual([...CLAVES_DE_COLOR])
  })

  it.each(CLAVES_DE_COLOR)('«%s» se lee en claro y en oscuro', (clave) => {
    const claro = bloque(':root')
    const oscuro = bloque('.dark')
    expect(valor(claro, `etiqueta-${clave}`)).toBeDefined()
    for (const tema of [claro, oscuro]) {
      const fondo = valor(tema, `etiqueta-${clave}-soft`)
      const texto = valor(tema, `etiqueta-${clave}-ink`)
      expect(fondo && texto).toBeTruthy()
      expect(contraste(fondo as string, texto as string)).toBeGreaterThanOrEqual(CONTRASTE_AA)
    }
  })
})
