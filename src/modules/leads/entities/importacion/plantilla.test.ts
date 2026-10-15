import { describe, expect, it } from 'vitest'
import { lineaDeCsv } from '@/shared/lib/csv/escribir'
import type { ContextoDeAlta } from '../alta'
import { camposDeLeadDesde } from '../campo'
import { objetivosDeImportacion } from './emparejar'
import type { FilaPreparada } from './filas'
import type { ResultadoDeFila } from './lotes'
import { filasRechazadas, plantillaDeImportacion, tablaDeRechazadas } from './plantilla'

const CONTEXTO: ContextoDeAlta = {
  telefonoCc: '+591',
  origenes: [{ id: 'o1', clave: 'web', nombre: 'Web' }],
  tiposDeSeguimiento: [],
  ultimoOrigenId: null,
  empresa: { ciudad: null, pais: null },
}

const BASE = {
  opciones: [],
  requerido: false,
  valor_defecto: null,
  valor_defecto_empresa: null,
  grupo: null,
  en_tabla: false,
  filtrable: false,
  solo_cartera: false,
  es_sistema: false,
  activo: true,
  actualizado_en: '2026-10-14T20:00:00+00:00',
}

const CAMPOS = camposDeLeadDesde([
  {
    ...BASE,
    id: '00000000-0000-0000-0000-000000000001',
    clave: 'ciudad',
    etiqueta: 'Ciudad',
    tipo: 'texto',
    orden: 10,
  },
  {
    ...BASE,
    id: '00000000-0000-0000-0000-000000000002',
    clave: 'edad',
    etiqueta: 'Edad',
    tipo: 'numero',
    orden: 20,
  },
  {
    ...BASE,
    id: '00000000-0000-0000-0000-000000000003',
    clave: 'apagado',
    etiqueta: 'Apagado',
    tipo: 'texto',
    orden: 30,
    activo: false,
  },
])

describe('plantillaDeImportacion', () => {
  it('los encabezados salen del layout de hoy y la muestra tiene una celda por columna', () => {
    const { encabezados, muestra } = plantillaDeImportacion(
      CAMPOS,
      CONTEXTO,
      '2026-10-15T15:00:00Z',
      'America/La_Paz',
    )
    expect(encabezados).toEqual(['Nombre', 'Teléfono', 'Tipo', 'Origen', 'Ciudad', 'Edad'])
    expect(muestra).toHaveLength(encabezados.length)
    expect(muestra[2]).toBe('Prospecto')
    expect(muestra[3]).toBe('Web')
    expect(muestra[5]).toBe(10)
  })
})

describe('filasRechazadas y tablaDeRechazadas', () => {
  const objetivos = objetivosDeImportacion(CAMPOS)
  const fila = (id: string, n: number, extra: Partial<FilaPreparada>): FilaPreparada => ({
    id,
    fila: n,
    celdas: ['Ana', '70011002'],
    nombre: 'Ana',
    motivos: [],
    pedido: null,
    ...extra,
  })
  const pedido = {
    id: 'x',
    fila: 2,
    lead: {
      nombre: 'Ana',
      telefono_principal: '7',
      tipo: 'prospecto' as const,
      origen_lead_id: null,
      atributos: {},
    },
  }

  it('une lo de la vista previa, lo de la base y lo que ya existía, con el nombre del dato', () => {
    const preparadas = [
      fila('a', 2, { motivos: [{ campo: 'nombre', motivo: 'Escribe el nombre.' }] }),
      fila('b', 3, { pedido: { ...pedido, id: 'b' } }),
      fila('c', 4, { pedido: { ...pedido, id: 'c' } }),
      fila('d', 5, { pedido: { ...pedido, id: 'd' } }),
    ]
    const r = (
      id: string,
      resultado: ResultadoDeFila['resultado'],
      extra: Partial<ResultadoDeFila> = {},
    ): [string, ResultadoDeFila] => [
      id,
      {
        id,
        fila: 0,
        resultado,
        repetido: false,
        numero: null,
        campo: null,
        motivo: null,
        ...extra,
      },
    ]
    const resultados = new Map([
      r('b', 'error', { campo: 'atributos.ciudad', motivo: 'Hasta 500 caracteres.' }),
      r('c', 'ya_existe'),
      r('d', 'creado'),
    ])
    expect(
      filasRechazadas(preparadas, resultados, objetivos).map((x) => [x.fila, x.motivo]),
    ).toEqual([
      [2, 'Nombre: Escribe el nombre.'],
      [3, 'Ciudad: Hasta 500 caracteres.'],
      [4, 'Ese teléfono ya existe.'],
    ])
  })

  it('el archivo de errores se puede escribir y volver a subir', () => {
    const tabla = tablaDeRechazadas(
      ['Nombre', 'Teléfono'],
      [{ fila: 2, celdas: ['=cmd', '7001'], motivo: 'Teléfono: Al teléfono le faltan dígitos.' }],
    )
    expect(tabla[0]).toEqual(['Fila', 'Motivo', 'Nombre', 'Teléfono'])
    expect(lineaDeCsv(tabla[1] ?? [], ';')).toBe(
      "2;Teléfono: Al teléfono le faltan dígitos.;'=cmd;7001",
    )
  })
})
