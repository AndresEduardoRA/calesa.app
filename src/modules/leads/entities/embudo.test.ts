import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  conFinal,
  conInicial,
  embudoDesde,
  embudosDesde,
  etapaNueva,
  etapasIguales,
  etapasParaGuardar,
  esFinal,
  moverEtapa,
  validarEtapas,
  validarNombreDeEmbudo,
  type Etapa,
} from './embudo'
import { CLAVES_DE_COLOR } from './etiqueta'

const etapa = (nombre: string, extra: Partial<Etapa> = {}): Etapa => ({
  id: null,
  nombre,
  color: 'gris',
  esInicial: false,
  esGanada: false,
  esPerdida: false,
  ...extra,
})

const validas = (): Etapa[] => [
  etapa('Nuevo', { esInicial: true }),
  etapa('Contactado'),
  etapa('Ganado', { esGanada: true }),
  etapa('Perdido', { esPerdida: true }),
]

const fila = {
  id: '00000000-0000-0000-0000-000000000001',
  nombre: 'Ventas',
  es_default: true,
  actualizado_en: '2026-10-16T10:00:00.000000+00:00',
  etapas: [
    {
      id: '00000000-0000-0000-0000-0000000000a1',
      nombre: 'Nuevo',
      color: 'gris',
      es_inicial: true,
      es_ganada: false,
      es_perdida: false,
    },
  ],
}

describe('embudoDesde y embudosDesde', () => {
  it('lee la forma de la base', () => {
    expect(embudoDesde(fila)).toEqual({
      id: fila.id,
      nombre: 'Ventas',
      esDefault: true,
      actualizadoEn: fila.actualizado_en,
      etapas: [
        {
          id: fila.etapas[0]?.id,
          nombre: 'Nuevo',
          color: 'gris',
          esInicial: true,
          esGanada: false,
          esPerdida: false,
        },
      ],
    })
  })
  it('una forma rota es null, y un color desconocido se dibuja gris', () => {
    expect(embudoDesde({ ...fila, id: 'x' })).toBeNull()
    expect(
      embudoDesde({ ...fila, etapas: [{ ...fila.etapas[0], color: 'fucsia' }] })?.etapas[0]?.color,
    ).toBe('gris')
  })
  it('ordena: el de por defecto primero, después por nombre; descarta lo roto', () => {
    const otro = {
      ...fila,
      id: '00000000-0000-0000-0000-000000000002',
      nombre: 'Autos',
      es_default: false,
    }
    const tercero = { ...otro, id: '00000000-0000-0000-0000-000000000003', nombre: 'Repuestos' }
    expect(embudosDesde([tercero, otro, fila, { roto: true }]).map((e) => e.nombre)).toEqual([
      'Ventas',
      'Autos',
      'Repuestos',
    ])
    expect(embudosDesde(null)).toEqual([])
  })
})

describe('validarNombreDeEmbudo', () => {
  const otros = [{ id: 'a', nombre: 'Ventas' }]
  it('largo y repetido sin importar mayúsculas', () => {
    expect(validarNombreDeEmbudo('  ', otros, null)).toMatch(/entre 1 y 40/)
    expect(validarNombreDeEmbudo('x'.repeat(41), otros, null)).toMatch(/entre 1 y 40/)
    expect(validarNombreDeEmbudo('VENTAS', otros, null)).toBe('Ya tienes un embudo «Ventas».')
    expect(validarNombreDeEmbudo('Ventas', otros, 'a')).toBeNull()
    expect(validarNombreDeEmbudo('Postventa', otros, null)).toBeNull()
  })
})

describe('validarEtapas (espejo de embudo_etapas_guardar)', () => {
  it('acepta un conjunto válido', () => {
    expect(validarEtapas(validas())).toBeNull()
  })
  it('entre 3 y 12', () => {
    expect(validarEtapas(validas().slice(0, 2))).toBe('Un embudo lleva entre 3 y 12 etapas.')
    const muchas = [
      ...validas(),
      ...Array.from({ length: 9 }, (_, i) => etapa(`Extra ${String(i)}`)),
    ]
    expect(validarEtapas(muchas)).toBe('Un embudo lleva entre 3 y 12 etapas.')
  })
  it('una sola inicial, al menos una ganada y una perdida', () => {
    const dos = validas().map((e, i) => (i === 1 ? { ...e, esInicial: true } : e))
    expect(validarEtapas(dos)).toBe('Marca una sola etapa como inicial.')
    expect(
      validarEtapas(
        validas()
          .filter((e) => !e.esGanada)
          .concat(etapa('Otra')),
      ),
    ).toBe('Hace falta al menos una etapa ganada.')
    expect(
      validarEtapas(
        validas()
          .filter((e) => !e.esPerdida)
          .concat(etapa('Otra')),
      ),
    ).toBe('Hace falta al menos una etapa perdida.')
  })
  it('nombres sin repetir (sin importar mayúsculas), largo, y marcas que no chocan', () => {
    const repetida = validas().map((e, i) => (i === 1 ? { ...e, nombre: 'NUEVO' } : e))
    expect(validarEtapas(repetida)).toBe('Hay dos etapas «NUEVO». Cámbiale el nombre a una.')
    const vacia = validas().map((e, i) => (i === 1 ? { ...e, nombre: ' ' } : e))
    expect(validarEtapas(vacia)).toMatch(/entre 1 y 30/)
    const ambas = validas().map((e, i) => (i === 2 ? { ...e, esPerdida: true } : e))
    expect(validarEtapas(ambas)).toBe('«Ganado» no puede ser ganada y perdida a la vez.')
    const inicialFinal = validas().map((e, i) => (i === 0 ? { ...e, esGanada: true } : e))
    expect(validarEtapas(inicialFinal)).toBe('La etapa inicial no puede ser ganada ni perdida.')
  })
})

describe('editar etapas', () => {
  it('moverEtapa sube, baja y no se sale de los bordes', () => {
    expect(moverEtapa(['a', 'b', 'c'], 1, -1)).toEqual(['b', 'a', 'c'])
    expect(moverEtapa(['a', 'b', 'c'], 1, 1)).toEqual(['a', 'c', 'b'])
    expect(moverEtapa(['a', 'b', 'c'], 0, -1)).toEqual(['a', 'b', 'c'])
    expect(moverEtapa(['a', 'b', 'c'], 2, 1)).toEqual(['a', 'b', 'c'])
  })
  it('conInicial deja una sola, y la que pasa a inicial deja de ser final', () => {
    const r = conInicial(validas(), 2)
    expect(r.filter((e) => e.esInicial).map((e) => e.nombre)).toEqual(['Ganado'])
    expect(r[2]?.esGanada).toBe(false)
  })
  it('conFinal: ganada y perdida se excluyen y una final no es inicial', () => {
    const r = conFinal(validas(), 0, 'perdida', true)
    expect(r[0]).toMatchObject({ esInicial: false, esPerdida: true, esGanada: false })
    expect(conFinal(validas(), 2, 'ganada', false)[2]?.esGanada).toBe(false)
    expect(esFinal({ esGanada: false, esPerdida: true })).toBe(true)
  })
  it('etapaNueva no repite un nombre', () => {
    const lista = [...validas(), etapa('Etapa 5')]
    expect(etapaNueva(lista).nombre).toBe('Etapa 6')
    expect(etapaNueva(validas())).toMatchObject({ id: null, nombre: 'Etapa 5', color: 'gris' })
  })
  it('lo que viaja: el conjunto en orden, con el id sólo si ya existe', () => {
    const lista = validas().map((e, i) => (i === 0 ? { ...e, id: 'x', nombre: ' Nuevo ' } : e))
    expect(etapasParaGuardar(lista)[0]).toEqual({
      id: 'x',
      nombre: 'Nuevo',
      color: 'gris',
      es_inicial: true,
      es_ganada: false,
      es_perdida: false,
    })
    expect(etapasParaGuardar(lista)[1]).not.toHaveProperty('id')
    expect(etapasIguales(validas(), validas())).toBe(true)
    expect(etapasIguales(validas(), moverEtapa(validas(), 1, 1))).toBe(false)
  })
})

describe('la paleta de las etapas', () => {
  it('es la de las etiquetas, en el check de la base', () => {
    const esquema = readFileSync(
      join(process.cwd(), 'supabase/schemas/05_leads/01_leads.sql'),
      'utf8',
    )
    const check = /embudos_etapas_color_paleta check \(color in \(([^)]*)\)\)/.exec(esquema)?.[1]
    expect(check?.split(',').map((x) => x.trim().replaceAll("'", ''))).toEqual([...CLAVES_DE_COLOR])
  })
})
