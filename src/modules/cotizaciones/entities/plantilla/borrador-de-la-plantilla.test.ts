import { describe, expect, it } from 'vitest'
import { alinearConLaFormula, plantillaParaEditar } from './borrador-de-la-plantilla'
import type { Plantilla } from './forma-de-plantilla'
import type { VersionDePlantilla } from './lectura-de-la-plantilla'
import type { ContextoDePlantilla } from './validar-plantilla'

const contexto: ContextoDePlantilla = {
  definicion: {
    nodos: [
      { id: 'fees', etiqueta: 'Fees', grupo: 'compra' },
      { id: 'grua', etiqueta: 'Grúa', grupo: 'logistica' },
      { id: 'cif', etiqueta: 'Valor CIF', salida: 'base_imponible' },
      { id: 'total', etiqueta: 'TOTAL DE LA FÓRMULA', salida: 'total' },
    ],
    grupos: [
      { id: 'compra', etiqueta: 'Compra' },
      { id: 'logistica', etiqueta: 'Logística' },
    ],
  },
  diseno: null,
  visibilidad: null,
  tonos: ['verde'],
}
const col = { leyenda: false, plazo: false, tipo_cambio: false }
const p = (o: Partial<Plantilla> = {}): Plantilla => ({
  grupos: [{ grupo: 'compra' }, { grupo: 'logistica' }],
  total: { etiqueta: 'T' },
  logo: false,
  columnas: col,
  ...o,
})
const version = (
  plantilla: Plantilla | null,
  extra: Partial<VersionDePlantilla> = {},
): VersionDePlantilla => ({
  id: 'x',
  version: null,
  nota: null,
  actualizadoEn: 'h',
  publicadoEn: null,
  plantilla,
  motivo: plantilla === null ? 'La plantilla no tiene la forma esperada.' : null,
  ...extra,
})

describe('alinearConLaFormula', () => {
  it('quita el grupo que ya no está, deduplica y suma el que falta al final sin tono', () => {
    const r = alinearConLaFormula(
      p({ grupos: [{ grupo: 'viejo' }, { grupo: 'compra', tono: 'verde' }, { grupo: 'compra' }] }),
      contexto,
    )
    expect(r.plantilla.grupos).toEqual([{ grupo: 'compra', tono: 'verde' }, { grupo: 'logistica' }])
    expect(r.avisos).toEqual([
      'El grupo «viejo» ya no está en la fórmula: se quitó.',
      'El grupo «Compra» estaba repetido: se quitó el segundo.',
      'El grupo «Logística» es nuevo en la fórmula: se sumó al final, sin tono.',
    ])
  })
  it('quita las etiquetas y leyendas sin lugar, con la etiqueta del nodo o el id', () => {
    const r = alinearConLaFormula(
      p({ etiquetas: { fees: 'F', cif: 'C' }, leyendas: { zzz: 'z' } }),
      contexto,
    )
    expect(r.plantilla.etiquetas).toEqual({ fees: 'F' })
    expect(Object.hasOwn(r.plantilla, 'leyendas')).toBe(false)
    expect(r.avisos).toEqual([
      'La etiqueta de «Valor CIF» ya no tiene lugar en la tarjeta: se quitó.',
      'La leyenda de «zzz» ya no tiene lugar en la tarjeta: se quitó.',
    ])
  })
  it('no muta su entrada y una plantilla alineada no cambia', () => {
    const entrada = p({ etiquetas: { cif: 'C' } })
    const antes = JSON.stringify(entrada)
    alinearConLaFormula(entrada, contexto)
    expect(JSON.stringify(entrada)).toBe(antes)
    const ok = p()
    expect(alinearConLaFormula(ok, contexto)).toEqual({ plantilla: ok, avisos: [] })
  })
})

describe('plantillaParaEditar', () => {
  it('nace del borrador', () => {
    const r = plantillaParaEditar({
      borrador: version(p({ logo: true })),
      publicada: version(p()),
      contexto,
    })
    expect(r).toMatchObject({ de: 'borrador', avisos: [] })
    expect(r.plantilla.logo).toBe(true)
  })
  it('sin borrador, de la copia de la publicada', () => {
    const r = plantillaParaEditar({
      borrador: null,
      publicada: version(p({ nota: 'N' }), { version: 2 }),
      contexto,
    })
    expect(r.de).toBe('publicada')
    expect(r.plantilla.nota).toBe('N')
  })
  it('sin ninguna, la omisión: grupos de la fórmula, total de ≤ 40 caracteres, logo y columnas apagadas', () => {
    const r = plantillaParaEditar({ borrador: null, publicada: null, contexto })
    expect(r.de).toBe('omision')
    expect(r.plantilla).toEqual({
      grupos: [{ grupo: 'compra' }, { grupo: 'logistica' }],
      total: { etiqueta: 'TOTAL DE LA FÓRMULA' },
      logo: true,
      columnas: col,
    })
    const largo = {
      ...contexto,
      definicion: {
        ...contexto.definicion,
        nodos: [{ id: 'total', etiqueta: '😀'.repeat(50), salida: 'total' }],
      },
    }
    expect([
      ...plantillaParaEditar({ borrador: null, publicada: null, contexto: largo }).plantilla.total
        .etiqueta,
    ]).toHaveLength(40)
    const sinEtiqueta = { ...contexto, definicion: { ...contexto.definicion, nodos: [] } }
    expect(
      plantillaParaEditar({ borrador: null, publicada: null, contexto: sinEtiqueta }).plantilla
        .total.etiqueta,
    ).toBe('Total')
  })
  it('un borrador ilegible parte de lo siguiente con su aviso', () => {
    const r = plantillaParaEditar({
      borrador: version(null),
      publicada: version(p(), { version: 3 }),
      contexto,
    })
    expect(r.de).toBe('publicada')
    expect(r.avisos[0]).toBe(
      'El borrador guardado no se pudo leer (La plantilla no tiene la forma esperada.): al guardar se reemplaza.',
    )
  })
  it('una publicada ilegible parte de los grupos de la fórmula', () => {
    const r = plantillaParaEditar({
      borrador: null,
      publicada: version(null, { version: 4 }),
      contexto,
    })
    expect(r.de).toBe('omision')
    expect(r.avisos[0]).toBe(
      'La versión 4 publicada no se pudo leer (La plantilla no tiene la forma esperada.): se parte de los grupos de la fórmula.',
    )
  })
  it('siempre alinea', () => {
    const r = plantillaParaEditar({
      borrador: version(p({ grupos: [{ grupo: 'compra' }] })),
      publicada: null,
      contexto,
    })
    expect(r.plantilla.grupos.map((g) => g.grupo)).toEqual(['compra', 'logistica'])
    expect(r.avisos).toHaveLength(1)
  })
})
