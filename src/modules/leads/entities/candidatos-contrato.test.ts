// @vitest-environment node
import { PGlite } from '@electric-sql/pglite'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { definicionSql } from '../../../../scripts/lib/definicion-sql'
import { condicionDeCampo, type CondicionDeAtributo } from '@/shared/lib/filtros'
import { aplicarCondicionDeAtributo, patronContiene } from '@/shared/lib/supabase/consultas'
import { filtrosDeCandidatos } from './candidatos'
import { CAMPO, CASOS, FILAS, ZONA, idDe } from './candidatos-contrato.casos'
import type { ColumnaDeAtributos } from './campo'
import type { CondicionDeLead } from './filtros'

// El contrato entre lo que la app le pide a `leads_candidatos()` y lo que la base entiende (4.03, 5a-9 y 5a-34): las condiciones que arma el filtro de un campo
// (`condicionDeCampo()`) pasan por `filtrosDeCandidatos()` y la base las cumple (`_leads_candidatos_sql`, su definición vigente entre las migraciones, en PGlite con tablas de juguete);
// la consulta de siempre las arma `aplicarCondicionDeAtributo()` para PostgREST. Las dos tienen que dar los mismos leads, con valores de todos los tipos JSON (un número, un
// texto, un booleano, un nulo, una clave que falta): `->` compara jsonb con jsonb, y un valor de texto ordena antes que cualquier número.
const YO = '00000000-0000-0000-0000-0000000000aa'

let db: PGlite

beforeAll(async () => {
  db = new PGlite()
  await db.exec(`
    create type public.alcance_permiso as enum ('propios', 'todos');
    create table public.leads (
      id uuid primary key, nombre text not null default '', creado_en timestamptz not null, eliminado_en timestamptz,
      cartera uuid[] not null, atributos jsonb not null, atributos_publicos jsonb not null, tipo_lead_id uuid, origen_lead_id uuid
    );
    create function public._leads_candidatos_tope() returns integer language sql immutable as 'select 300';
    create function public._leads_candidatos_recorrido() returns integer language sql immutable as 'select 4000';
    create function public._leads_candidatos_etiquetas(jsonb, uuid) returns uuid[] language sql as 'select ''{}''::uuid[]';
    create function public._lead_visible_para(timestamptz, uuid[], public.alcance_permiso, uuid, uuid[]) returns boolean language sql as 'select true';
  `)
  // Las tres funciones, tal como las deja la última migración que las define: una migración nueva que las redefina cambia lo que esta prueba mira, sin editarla.
  await db.exec(definicionSql('_lead_busqueda_patron').texto)
  await db.exec(definicionSql('_leads_candidatos_indexable').texto)
  await db.exec(definicionSql('_leads_candidatos_sql').texto)
  for (const [i, fila] of FILAS.entries()) {
    await db.query(
      `insert into public.leads (id, nombre, creado_en, cartera, atributos, atributos_publicos)
       values ($1, $2, now() - make_interval(mins => $3), array[$4]::uuid[], $5::jsonb, $5::jsonb)`,
      [idDe(i + 1), `Lead ${String(i + 1)}`, i + 1, YO, JSON.stringify(fila)],
    )
  }
})

afterAll(async () => {
  await db.close()
})

// --- La consulta de siempre: lo que PostgREST le pide a la vista ---------------------------------------------------------
type Llamada = { operador: string; columna: string; valor: string | number }
type Grabadora = {
  gte: (columna: string, valor: string | number) => Grabadora
  lte: (columna: string, valor: string | number) => Grabadora
  lt: (columna: string, valor: string | number) => Grabadora
  ilike: (columna: string, patron: string) => Grabadora
  in: (columna: string, valores: readonly string[]) => Grabadora
  eq: (columna: string, valor: boolean) => Grabadora
  is: (columna: string, valor: null) => Grabadora
  contains: (columna: string, valor: Record<string, unknown>) => Grabadora
  overlaps: (columna: string, valores: readonly string[]) => Grabadora
  or: (filtros: string) => Grabadora
}

function grabar(condicion: CondicionDeAtributo, columna: ColumnaDeAtributos): Llamada[] {
  const llamadas: Llamada[] = []
  const anotar = (operador: string) => (col: string, valor: string | number) => {
    llamadas.push({ operador, columna: col, valor })
    return consulta
  }
  const sinUso = () => {
    throw new Error('esta condición no pide eso')
  }
  const consulta: Grabadora = {
    gte: anotar('>='),
    lte: anotar('<='),
    lt: anotar('<'),
    ilike: anotar('ilike'),
    in: sinUso,
    eq: sinUso,
    is: sinUso,
    contains: sinUso,
    overlaps: sinUso,
    or: sinUso,
  }
  aplicarCondicionDeAtributo(consulta, condicion, columna)
  return llamadas
}

const comillas = (texto: string | number) => String(texto).replaceAll("'", "''")

// `columna->clave` (jsonb) o `columna->>clave` (texto), con el literal sin tipo que PostgREST manda: junto a un jsonb es un jsonb, junto a un texto es un texto; un `ilike`
// lleva `%` donde PostgREST lleva el `*` de los extremos.
function predicadoDeSiempre(llamadas: Llamada[]): string {
  return llamadas
    .map(({ operador, columna, valor }) => {
      const partes = /^(\w+)(->>|->)(\w+)$/.exec(columna)
      expect(partes, columna).not.toBeNull()
      const [, col = '', flecha = '', clave = ''] = partes ?? []
      const izquierda = `(t.${col} ${flecha} '${clave}')`
      if (operador === 'ilike') {
        return `${izquierda} ilike '%${comillas(String(valor).slice(1, -1))}%'`
      }
      return `${izquierda} ${operador} '${comillas(valor)}'${flecha === '->' ? '::jsonb' : ''}`
    })
    .join(' and ')
}

async function deSiempre(llamadas: Llamada[]): Promise<string[]> {
  const { rows } = await db.query<{ id: string }>(
    `select t.id from public.leads t where ${predicadoDeSiempre(llamadas)} order by t.id`,
  )
  return rows.map((fila) => fila.id)
}

// --- La consulta de ahora: lo que la app le pide a la base, y la base lo cumple --------------------------------------------
async function deAhora(condiciones: CondicionDeLead[]): Promise<string[]> {
  const filtros = filtrosDeCandidatos(condiciones, null, 'siguiente')
  const { rows } = await db.query<{ q: string }>(
    'select public._leads_candidatos_sql($1, $2::jsonb, $3::uuid, $4::public.alcance_permiso, $5::uuid[]) as q',
    ['indice', JSON.stringify(filtros), YO, 'todos', '{}'],
  )
  // La consulta no nombra sus columnas: la primera son los ids, la segunda cuántas filas recorrió.
  const { rows: resultado } = await db.query<[string[], number]>(rows[0]?.q ?? '', [], {
    rowMode: 'array',
  })
  return [...(resultado[0]?.[0] ?? [])].sort()
}

describe('lo que la app le pide a la base y lo que PostgREST le pide a la vista dan los mismos leads', () => {
  const COLUMNAS: ColumnaDeAtributos[] = ['atributos_publicos', 'atributos']

  for (const columna of COLUMNAS) {
    describe(
      columna === 'atributos' ? 'un campo privado (sólo la cartera)' : 'un campo público',
      () => {
        it.each(CASOS)('$nombre', async ({ campo, valor }) => {
          const condicion = condicionDeCampo(campo, valor, ZONA)
          expect(condicion).not.toBeNull()
          const de = { ...(condicion as CondicionDeAtributo), columna } as CondicionDeLead
          const siempre = await deSiempre(grabar(condicion as CondicionDeAtributo, columna))
          expect(await deAhora([de])).toEqual(siempre)
        })
      },
    )
  }

  it('las pruebas no son vacías: hay casos con filas y casos sin ninguna', async () => {
    const tamanos = await Promise.all(
      CASOS.map(async ({ campo, valor }) => {
        const condicion = condicionDeCampo(campo, valor, ZONA) as CondicionDeAtributo
        return (await deSiempre(grabar(condicion, 'atributos_publicos'))).length
      }),
    )
    expect(tamanos.filter((n) => n > 0).length).toBeGreaterThan(10)
    expect(tamanos.filter((n) => n === 0).length).toBeGreaterThanOrEqual(1)
  })

  it('dos condiciones se cumplen a la vez', async () => {
    const texto = condicionDeCampo(
      CAMPO('ciudad', 'texto'),
      { tipo: 'texto', texto: 'sucre' },
      ZONA,
    ) as CondicionDeAtributo
    const rango = condicionDeCampo(
      CAMPO('edad', 'numero'),
      { tipo: 'rango_numero', min: 18, max: null },
      ZONA,
    ) as CondicionDeAtributo
    const columna = 'atributos_publicos' as const
    const siempre = await deSiempre([...grabar(texto, columna), ...grabar(rango, columna)])
    expect(
      await deAhora([
        { ...texto, columna },
        { ...rango, columna },
      ]),
    ).toEqual(siempre)
    expect(siempre.length).toBeGreaterThan(0)
  })

  it('un valor de texto o un booleano en un campo de número entra a «desde» (jsonb contra jsonb), igual que en la vista', async () => {
    const condicion = condicionDeCampo(
      CAMPO('edad', 'numero'),
      { tipo: 'rango_numero', min: 18, max: null },
      ZONA,
    ) as CondicionDeAtributo
    const ids = await deAhora([{ ...condicion, columna: 'atributos_publicos' } as CondicionDeLead])
    // Los 17 (id 2) y los 5 (id 1) no; el booleano `true` (id 13) y el arreglo y el objeto (ids 16 y 17) ordenan después de cualquier número.
    expect(ids).toContain(idDe(13))
    expect(ids).toContain(idDe(17))
    expect(ids).not.toContain(idDe(1))
    expect(ids).not.toContain(idDe(2))
  })
})

describe('un texto de menos de 3 letras o dígitos seguidos no filtra en la base', () => {
  it('la app no lo manda (el campo lo dice), y si llegara, la base lo ignora como cualquier texto sin un tramo de 3', async () => {
    const condicion = condicionDeCampo(
      CAMPO('ciudad', 'texto'),
      { tipo: 'texto', texto: 'su' },
      ZONA,
    ) as CondicionDeAtributo
    const todos = await deAhora([])
    expect(
      await deAhora([{ ...condicion, columna: 'atributos_publicos' } as CondicionDeLead]),
    ).toEqual(todos)
    expect(patronContiene('su')).toBe('*su*')
    // Ni con signos: «a_b» y «50%» tienen letras, pero no 3 seguidas.
    for (const corto of ['a_b', '50%', "d'a", 'a\\b']) {
      const condicionCorta = condicionDeCampo(
        CAMPO('ciudad', 'texto'),
        { tipo: 'texto', texto: corto },
        ZONA,
      ) as CondicionDeAtributo
      expect(
        await deAhora([{ ...condicionCorta, columna: 'atributos_publicos' } as CondicionDeLead]),
        corto,
      ).toEqual(todos)
    }
  })
})
