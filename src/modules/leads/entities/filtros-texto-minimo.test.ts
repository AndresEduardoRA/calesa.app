import { describe, expect, it } from 'vitest'
import { leerFiltros } from '@/shared/lib/filtros'
import type { CampoDeLead } from './campo'
import { condicionesDeLeads, esquemaDeFiltrosDeLeads, privadosFiltrando } from './filtros'

// El mínimo del texto de un campo (4.03, 5a-9). Aparte de `filtros.test.ts`, que ya llega al máximo de líneas por archivo.
function campo(clave: string, extra: Partial<CampoDeLead> = {}): CampoDeLead {
  return {
    id: `id-${clave}`,
    clave,
    etiqueta: clave.toUpperCase(),
    tipo: 'texto',
    opciones: [],
    requerido: false,
    valorDefecto: null,
    grupo: null,
    orden: 0,
    esSistema: false,
    activo: true,
    actualizadoEn: '2026-10-14T00:00:00Z',
    enTabla: false,
    filtrable: true,
    soloCartera: false,
    privacidadPendiente: null,
    valorDefectoEmpresa: null,
    ...extra,
  }
}

const CAMPOS = [
  campo('ciudad'),
  campo('edad', { tipo: 'numero' }),
  campo('ci', { tipo: 'documento', soloCartera: true }),
  campo('signo', {
    tipo: 'opcion',
    opciones: [
      { clave: 'aries', etiqueta: 'Aries' },
      { clave: 'leo', etiqueta: 'Leo' },
    ],
  }),
]

const esquema = (verTodos = false) =>
  esquemaDeFiltrosDeLeads({ campos: CAMPOS, origenes: [], tipos: [], verTodos, etiquetas: [] })

describe('el texto de un campo pide 3 letras o dígitos seguidos (4.03, 5a-9)', () => {
  it('sólo los filtros de texto llevan el mínimo, con su línea; un campo de opciones o de número, no', () => {
    const porClave = new Map(esquema().filtros.map((filtro) => [filtro.clave, filtro]))
    for (const clave of ['a.ciudad', 'a.ci']) {
      const filtro = porClave.get(clave)
      expect(filtro?.tipo, clave).toBe('texto')
      expect(filtro?.tipo === 'texto' ? filtro.minimo : undefined, clave).toEqual({
        letras: 3,
        numerosLibres: false,
        aviso: 'Escribe al menos 3 letras',
      })
    }
    for (const clave of ['a.signo', 'a.edad.min']) {
      const filtro = porClave.get(clave.replace(/\.min$/, ''))
      expect(filtro, clave).toBeDefined()
      expect(filtro && 'minimo' in filtro && filtro.tipo === 'texto').toBe(false)
    }
  })

  it('un texto de 1 o 2 caracteres escrito en la URL no filtra, ni agrega la cartera por un privado', () => {
    const leer = (url: string) =>
      leerFiltros(esquema(true), Object.fromEntries(new URLSearchParams(url)))
    const deCampos = (condiciones: ReturnType<typeof condicionesDeLeads>) =>
      condiciones.filter((condicion) => condicion.tipo !== 'tachado')
    for (const corto of ['a.ciudad=cr', 'a.ci=12', 'a.ciudad=%25%25']) {
      const valores = leer(corto)
      expect(valores.porClave, corto).toEqual({})
      // Sin una condición de campo ni la cartera que agrega un privado (la de los tachados es del listado y está siempre).
      expect(deCampos(condicionesDeLeads(CAMPOS, valores, { soloMios: false })), corto).toEqual([])
      expect(privadosFiltrando(CAMPOS, valores), corto).toEqual([])
    }
    expect(
      deCampos(condicionesDeLeads(CAMPOS, leer('a.ci=123'), { soloMios: false })).map(
        (c) => c.tipo,
      ),
    ).toEqual(['en_cartera', 'atributo_texto'])
  })
})
