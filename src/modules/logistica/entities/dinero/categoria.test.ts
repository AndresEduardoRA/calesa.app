import { describe, expect, it } from 'vitest'
import {
  borradorDeCategoria,
  BORRADOR_NUEVO_DE_CATEGORIA,
  cambiosDeCategoria,
  nombreDelProposito,
  PROPOSITOS_DE_CATEGORIA,
  textoDeErrorDeCategoria,
  validarCategoria,
  type BorradorDeCategoria,
  type CategoriaDeGasto,
} from './categoria'

const borrador = (p: Partial<BorradorDeCategoria> = {}): BorradorDeCategoria => ({
  nombre: 'Maniobras',
  proposito: 'otro',
  activo: true,
  orden: '10',
  ...p,
})

const errores = (b: BorradorDeCategoria) => {
  const r = validarCategoria(b)
  return r.ok ? {} : r.errores
}

describe('PROPOSITOS_DE_CATEGORIA', () => {
  // La lista la fija el `check` de `categorias_gasto.proposito` en la base: si cambia allá, cambia acá.
  it('son exactamente los seis de la base', () => {
    expect([...PROPOSITOS_DE_CATEGORIA.map((p) => p.valor)].sort()).toEqual(
      ['chaperia', 'despachante', 'flete', 'grua', 'otro', 'tributos'].sort(),
    )
  })

  it('cada uno tiene su nombre y uno desconocido o nulo se dice «Sin propósito»', () => {
    expect(nombreDelProposito('grua')).toBe('Grúa')
    expect(nombreDelProposito(null)).toBe('Sin propósito')
    expect(nombreDelProposito('inventado')).toBe('Sin propósito')
  })
})

describe('validarCategoria', () => {
  it('un nombre vacío o de sólo espacios se rechaza', () => {
    expect(errores(borrador({ nombre: '' }))['nombre']).toBe('Escribe el nombre.')
    expect(errores(borrador({ nombre: '   ' }))['nombre']).toBe('Escribe el nombre.')
  })

  it('un nombre de más de 60 letras se rechaza', () => {
    expect(errores(borrador({ nombre: 'a'.repeat(61) }))['nombre']).toMatch(/60/)
  })

  it('el orden fuera de 0 a 32767, con decimales o que no es un número se rechaza', () => {
    expect(errores(borrador({ orden: '-1' }))['orden']).toBeDefined()
    expect(errores(borrador({ orden: '32768' }))['orden']).toBeDefined()
    expect(errores(borrador({ orden: '1.5' }))['orden']).toBeDefined()
    expect(errores(borrador({ orden: 'abc' }))['orden']).toBeDefined()
    expect(errores(borrador({ orden: '' }))['orden']).toBeDefined()
    expect(errores(borrador({ orden: '0' }))).toEqual({})
    expect(errores(borrador({ orden: '32767' }))).toEqual({})
  })

  it('un propósito que no es de la lista se rechaza; vacío es «sin propósito»', () => {
    expect(errores(borrador({ proposito: 'inventado' }))['proposito']).toBeDefined()
    const r = validarCategoria(borrador({ proposito: '' }))
    expect(r.ok && r.datos.proposito).toBe(null)
  })

  it('devuelve el nombre recortado y el orden como número', () => {
    const r = validarCategoria(borrador({ nombre: '  Maniobras  ', orden: ' 90 ' }))
    expect(r).toEqual({
      ok: true,
      datos: { nombre: 'Maniobras', proposito: 'otro', activo: true, orden: 90 },
    })
  })
})

describe('cambiosDeCategoria', () => {
  const original: CategoriaDeGasto = {
    id: '0b6f1a0e-6a43-4c1e-9d3b-6c1d3f7a9e11',
    nombre: 'Maniobras',
    proposito: 'otro',
    activo: true,
    orden: 10,
  }

  it('sin diferencias da nulo', () => {
    expect(
      cambiosDeCategoria(original, {
        nombre: 'Maniobras',
        proposito: 'otro',
        activo: true,
        orden: 10,
      }),
    ).toBeNull()
  })

  it('devuelve sólo lo que cambió', () => {
    expect(
      cambiosDeCategoria(original, {
        nombre: 'Maniobras',
        proposito: null,
        activo: false,
        orden: 10,
      }),
    ).toEqual({ proposito: null, activo: false })
  })
})

describe('textoDeErrorDeCategoria', () => {
  it('un nombre repetido dice cuál', () => {
    expect(textoDeErrorDeCategoria('23505', 'Flete')).toBe('Ya hay una categoría llamada «Flete».')
  })

  it('una categoría en uso no se borra: dice que se desactive', () => {
    expect(textoDeErrorDeCategoria('23503', 'Flete')).toBe(
      '«Flete» está en uso: tiene gastos. Desactívala para que no se ofrezca en lo nuevo.',
    )
  })

  it('sin permiso lo dice con las palabras del catálogo', () => {
    expect(textoDeErrorDeCategoria('42501', 'Flete')).toBe(
      'No tienes permiso para configurar los catálogos de logística.',
    )
  })

  it('un propósito fuera de la lista y cualquier otro código tienen su texto', () => {
    expect(textoDeErrorDeCategoria('23514', 'Flete')).toBe(
      'Elige uno de los propósitos de la lista.',
    )
    expect(textoDeErrorDeCategoria('XX000', 'Flete')).toBeNull()
  })
})

describe('el formulario de una categoría', () => {
  it('uno nuevo nace activo y válido en cuanto se le pone nombre', () => {
    expect(validarCategoria({ ...BORRADOR_NUEVO_DE_CATEGORIA, nombre: 'Seguro' })).toEqual({
      ok: true,
      datos: { nombre: 'Seguro', proposito: null, activo: true, orden: 0 },
    })
  })

  it('uno que se edita arranca con lo guardado y sin cambios no hay nada que mandar', () => {
    const c: CategoriaDeGasto = {
      id: 'x',
      nombre: 'Flete',
      proposito: null,
      activo: false,
      orden: 3,
    }
    const b = borradorDeCategoria(c)
    expect(b).toEqual({ nombre: 'Flete', proposito: '', activo: false, orden: '3' })
    const r = validarCategoria(b)
    expect(r.ok && cambiosDeCategoria(c, r.datos)).toBeNull()
  })
})
