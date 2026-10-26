import { describe, expect, it } from 'vitest'
import { ANCHOS, EFECTOS_DE_INTERRUPTOR, PRESENTACIONES, SECUNDARIOS } from './diseno'
import { hojaDesde, type HojaLista } from './hoja'
import { TIPOS_DE_NODO } from './hoja-esquema'
import { COLORES, ID, lista } from './hoja.soporte'
import { esquemaNodo, FORMATOS } from './nodos'

describe('hojaDesde: lo que abre la hoja de cotizar', () => {
  it('lee una hoja completa y la pasa a camelCase, con la versión y la hora de la apertura', () => {
    const hoja = hojaDesde(lista()) as HojaLista
    expect(hoja.estado).toBe('lista')
    expect(hoja.formula).toEqual({ id: ID, version: 3 })
    expect(hoja.abiertaEn).toBe('2026-10-26T14:00:00.123456+00:00')
    expect(hoja.vehiculoObligatorio).toBe(true)
    expect(hoja.cabecera).toEqual({
      modos: [{ clave: 'unificado', nombre: 'Unificado' }],
      verTotalBs: true,
    })
    expect(hoja.tarjetaTotal.secundarios).toHaveLength(1)
    expect(hoja.tonos[0]?.clave).toBe('verde')
    const items = hoja.secciones[0]?.items ?? []
    expect(items.map((i) => `${i.tipo}:${i.nodo}`)).toEqual([
      'variante:variante',
      'interruptor:garantia',
      'celda:fees',
      'celda:transferencia',
      'atajos:factor',
      'subtotal:cif',
    ])
    const fees = items[2]
    expect(fees).toMatchObject({
      tipo: 'celda',
      tipoDeNodo: 'calculo',
      tono: 'verde',
      editable: true,
      motivo: null,
      ajustes: false,
      ayuda: { tabla: 'fees' },
      soloEn: ['moto'],
      condicion: 'cuenta',
      requeridoSi: 'cuenta',
      secundario: {
        nodo: 'fees_pct',
        como: 'porcentaje',
        formato: 'pct',
        ajustes: true,
        editable: true,
        motivo: null,
      },
    })
  })
})

describe('hojaDesde: el candado, lo que falta y sin publicar', () => {
  it('un candado dice su motivo, con el nombre del nivel cuando es de un nivel', () => {
    const items = (hojaDesde(lista()) as HojaLista).secciones[0]?.items ?? []
    expect(items[1]).toMatchObject({
      editable: false,
      motivo: { codigo: 'nivel', nivel: 'Gerencia' },
    })
    expect(items[3]).toMatchObject({ editable: false, motivo: { codigo: 'se_calcula' } })
  })

  it('lo que falta en un ítem queda nulo y un chip sin valor se conserva', () => {
    const hoja = hojaDesde(lista()) as HojaLista
    const items = hoja.secciones[0]?.items ?? []
    expect(items[3]).toMatchObject({
      tono: null,
      ayuda: null,
      soloEn: null,
      condicion: null,
      requeridoSi: null,
      secundario: null,
    })
    expect(items[4]).toMatchObject({
      chips: [
        { etiqueta: '2018', valor: 0.328 },
        { etiqueta: '2019', valor: null },
      ],
    })
    expect(items[5]).toMatchObject({ tono: 'naranja' })
  })

  it('una fórmula sin publicar no trae versión ni hoja', () => {
    expect(
      hojaDesde({
        estado: 'sin_publicar',
        origen: { id: ID, nombre: 'Planilla' },
        puede_configurar: true,
      }),
    ).toEqual({
      estado: 'sin_publicar',
      origen: { id: ID, nombre: 'Planilla' },
      puedeConfigurar: true,
    })
  })

  it('lo que la base manda y el tipo no nombra se cae al leer', () => {
    const cruda = lista() as Record<string, unknown>
    cruda['buckets'] = { exterior: 'tc_paralelo' }
    ;(cruda['cabecera'] as Record<string, unknown>)['total_en'] = 'tc_paralelo'
    const hoja = hojaDesde(cruda) as HojaLista
    expect(JSON.stringify(hoja)).not.toContain('tc_paralelo')
  })
})

describe('hojaDesde: lo que la base no promete', () => {
  it('rechaza lo que la base no promete', () => {
    const casos: Record<string, (h: ReturnType<typeof lista>) => unknown> = {
      'un ítem desconocido': (h) => ({
        ...h,
        secciones: [{ ...h.secciones[0], items: [{ tipo: 'boton', nodo: 'x' }] }],
      }),
      'algo que no se edita, sin motivo': (h) => ({
        ...h,
        secciones: [
          { ...h.secciones[0], items: [{ ...h.secciones[0]?.items[3], motivo: undefined }] },
        ],
      }),
      'algo que se edita, con motivo': (h) => ({
        ...h,
        secciones: [
          {
            ...h.secciones[0],
            items: [{ ...h.secciones[0]?.items[2], motivo: { codigo: 'se_calcula' } }],
          },
        ],
      }),
      'un motivo que no existe': (h) => ({
        ...h,
        secciones: [
          {
            ...h.secciones[0],
            items: [{ ...h.secciones[0]?.items[3], motivo: { codigo: 'porque_si' } }],
          },
        ],
      }),
      'un nivel sin nombre': (h) => ({
        ...h,
        secciones: [
          {
            ...h.secciones[0],
            items: [{ ...h.secciones[0]?.items[1], motivo: { codigo: 'nivel' } }],
          },
        ],
      }),
      'un id de origen que no es guid': (h) => ({
        ...h,
        origen: { id: 'no-es-un-guid', nombre: 'X' },
      }),
      'una versión que no es un entero': (h) => ({ ...h, formula: { id: ID, version: 1.5 } }),
      'una sección sin ítems': (h) => ({ ...h, secciones: [{ ...h.secciones[0], items: [] }] }),
      'un ancho que no existe': (h) => ({
        ...h,
        secciones: [{ ...h.secciones[0], items: [{ ...h.secciones[0]?.items[2], ancho: '50%' }] }],
      }),
      'un estado desconocido': (h) => ({ ...h, estado: 'rota' }),
      'un tono con un color que no es hex': (h) => ({
        ...h,
        tonos: [{ clave: 'verde', claro: { ...COLORES, fondo: 'red' }, oscuro: COLORES }],
      }),
      nada: () => null,
    }
    for (const [caso, rompe] of Object.entries(casos)) {
      expect(hojaDesde(rompe(lista())), caso).toBeNull()
    }
  })
})

describe('hojaDesde: las listas del diseño', () => {
  it('las listas cerradas son las del diseño y las de los nodos', () => {
    // `calculo` es a su vez una unión por `op`: su tipo sale de cualquiera de sus opciones.
    const tipos = esquemaNodo.options
      .map((o) => ('shape' in o ? o.shape.tipo.value : o.options[0].shape.tipo.value))
      .sort()
    expect([...TIPOS_DE_NODO].sort()).toEqual(tipos)
    // La hoja lee con las mismas listas que el diseño y los nodos: una opción nueva en ellas entra aquí sin tocar este archivo.
    expect(ANCHOS.length).toBeGreaterThan(0)
    expect(PRESENTACIONES.length).toBeGreaterThan(0)
    expect(SECUNDARIOS.length).toBeGreaterThan(0)
    expect(EFECTOS_DE_INTERRUPTOR.length).toBeGreaterThan(0)
    expect(FORMATOS.length).toBeGreaterThan(0)
  })
})
