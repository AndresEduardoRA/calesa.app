import type { Condicion } from '../src/modules/vehiculos/entities/filtros'
import { FILTRO_DE_PORTADA } from '../src/modules/vehiculos/entities/vehiculo'
import { aplicarCondiciones } from '../src/modules/vehiculos/infra/queries/condiciones'
import { armarPagina, leerCursor, type Cursor } from '../src/shared/lib/paginacion'
import { aplicarCursor } from '../src/shared/lib/supabase/consultas'
import { expect, test } from './soporte/prueba'
import { CLAVE } from './soporte/inventario'
import {
  ANTES_DE,
  ATRIBUTO,
  limpiarInventarioPostgrest,
  prepararInventarioPostgrest,
  type TerrenoPostgrest,
} from './soporte/inventario-postgrest'
import { sesionDe } from './soporte/leads-alta'

// @sin-celular-archivo: no abre ninguna página: compara dos lecturas de la base por PostgREST

// La equivalencia del inventario (4.16-2a, C9): lo que lee hoy `buscarVehiculos()` por PostgREST sobre la tabla (`aplicarCondiciones` y
// `aplicarCursor` de `src`, sin `server-only`) y lo que devuelve `vehiculos_inventario()`, contra el PostgREST de verdad y con la RLS de
// cada persona. Por persona y caso, de a 3, hacia adelante hasta el final y de vuelta con «Anterior»: las mismas páginas, con la misma
// `limpieza_el`, la misma portada y la misma situación por id. Todo «lo de hoy» corre antes que «lo nuevo»: `pg_stat_statements` guarda sus textos aunque
// la función no exista (S1). Ata `aplicarCondiciones` con C5: es dirigido cuando cambia `src/modules/vehiculos/`.

const TAMANO = 3
const TOPE_DE_PAGINAS = 40

type Cliente = Awaited<ReturnType<typeof sesionDe>>
type Fila = {
  id: string
  creadoEn: string
  limpiezaEl: string | null
  portada: string | null
  situacion: string
}
type Lector = (cursor: Cursor | null) => Promise<Fila[]>
type Caso = { nombre: string; origen: 'corea' | 'subasta'; condiciones: Condicion[] }
type Cruda = { id: string; creado_en: string; limpieza_el: string | null; situacion: string }
type FilaDeHoy = Cruda & { vehiculos_imagenes: { ruta_miniatura: string }[] }
type FilaNueva = Cruda & { portada_ruta: string | null }

const SIN_FILTROS = 'sin filtros'
const { numero, texto, fecha, lista, llave, opcion } = ATRIBUTO

// Cada `Condicion` con su forma de TS, en una línea.
const buscar = (uno: string): Condicion => ({ tipo: 'busqueda', texto: uno })
const en = (
  columna: 'fase_id' | 'categoria_id',
  valores: string[],
  incluirNulo = false,
): Condicion => ({
  tipo: 'columna_en',
  columna,
  valores,
  incluirNulo,
})
const anio = (min: number | null, max: number | null): Condicion => ({
  tipo: 'columna_rango',
  columna: 'anio',
  min,
  max,
})
const vitrina = (valor: boolean, fases: string[]): Condicion => ({
  tipo: 'en_vitrina',
  valor,
  fases,
})
const contiene = (...alternativas: Record<string, string | boolean | string[]>[]): Condicion => ({
  tipo: 'atributos_contienen',
  alternativas,
})
const entre = (min: number | null, max: number | null): Condicion => ({
  tipo: 'atributo_rango_numero',
  clave: numero,
  min,
  max,
})
const fechas = (desde: string | null, antesDe: string | null): Condicion => ({
  tipo: 'atributo_rango_texto',
  clave: fecha,
  desde,
  antesDe,
})
const conTexto = (uno: string): Condicion => ({ tipo: 'atributo_texto', clave: texto, texto: uno })
const enCorea = (nombre: string, ...condiciones: Condicion[]): Caso => ({
  nombre,
  origen: 'corea',
  condiciones,
})
const enSubasta = (nombre: string, ...condiciones: Condicion[]): Caso => ({
  nombre,
  origen: 'subasta',
  condiciones,
})

// «Vacíos» que darían nada para cualquiera (`valores` vacío sin el nulo, la vitrina «sí» sin fases) no discriminan: no están.
function casosDe({ fases, categorias, hasta }: TerrenoPostgrest): Caso[] {
  const { publica, interna } = fases
  const busquedas = [
    'toyota',
    '50%',
    'a_b',
    'x*y',
    '\\',
    '"comillas"',
    'coma, y',
    '(paréntesis)',
    'ÑANDÚ',
    'jtdbr',
    // Sólo coincide por el lote (`lote(1)`): ata `lote` en la búsqueda y los paréntesis dentro del `or()` de PostgREST.
    'lote(',
  ]
  return [
    enCorea(SIN_FILTROS),
    enSubasta(`${SIN_FILTROS} (subasta)`),
    ...busquedas.map((uno) => enCorea(`búsqueda «${uno}»`, buscar(uno))),
    enCorea('fase: la que publica', en('fase_id', [publica])),
    enCorea('fase: la interna o sin fase', en('fase_id', [interna], true)),
    enCorea('fase: sólo sin fase', en('fase_id', [], true)),
    enCorea('categoría: una', en('categoria_id', [categorias.a])),
    enCorea('categoría: las dos', en('categoria_id', [categorias.a, categorias.b])),
    enCorea('año desde 2018', anio(2018, null)),
    enCorea('año hasta 2015', anio(null, 2015)),
    enCorea('año 2015 a 2020', anio(2015, 2020)),
    enCorea('en vitrina', vitrina(true, [publica])),
    enCorea('no en vitrina', vitrina(false, [publica])),
    enCorea('no en vitrina, dos fases', vitrina(false, [publica, interna])),
    enCorea('no en vitrina sin fases, y «toyota»', vitrina(false, []), buscar('toyota')),
    enSubasta('se limpiará pronto', { tipo: 'por_limpiar', valor: true, hasta }),
    enSubasta('no se limpiará pronto', { tipo: 'por_limpiar', valor: false, hasta }),
    enSubasta('situación: sin las no ganadas', {
      tipo: 'situacion_fuera_de',
      valores: ['no_ganada'],
    }),
    enSubasta('situación: fuera de sin resolver y no ganada', {
      tipo: 'situacion_fuera_de',
      valores: ['sin_resolver', 'no_ganada'],
    }),
    enCorea('opción: una', contiene({ [opcion]: 'nafta' })),
    enCorea('opción: varias', contiene({ [opcion]: 'nafta' }, { [opcion]: 'diesel' })),
    enCorea('multi_opcion', contiene({ [lista]: ['rojo'] })),
    enCorea('booleano', contiene({ [llave]: true })),
    enCorea('opción del layout', contiene({ transmision: 'automatica' })),
    enCorea('alternativas vacías, y año desde 2018', contiene(), anio(2018, null)),
    enCorea('número 5 a 50', entre(5, 50)),
    enCorea('número desde 5', entre(5, null)),
    enCorea('número hasta 10', entre(null, 10)),
    enCorea('fecha en marzo', fechas('2026-03-01', ANTES_DE)),
    enCorea('fecha antes de abril', fechas(null, ANTES_DE)),
    enCorea('fecha desde el 15', fechas('2026-03-15', null)),
    ...['a_b', '%', 'ñ', '42', 'x*y'].map((uno) => enCorea(`texto «${uno}»`, conTexto(uno))),
    enCorea(
      'búsqueda, fase y año',
      buscar('toyota'),
      en('fase_id', [publica], true),
      anio(2010, null),
    ),
    enCorea(
      'vitrina, opciones y número',
      vitrina(false, [publica]),
      contiene({ [opcion]: 'nafta' }, { [opcion]: 'diesel' }),
      entre(0, 100),
    ),
    enCorea(
      'texto, fecha y categorías',
      conTexto('a'),
      fechas('2026-01-01', null),
      en('categoria_id', [categorias.a, categorias.b]),
    ),
  ]
}

// Lo de hoy: lo que arma `buscarVehiculos()` (`listado.ts`), con las mismas funciones de `src`.
function hoy(cliente: Cliente, origen: string, condiciones: Condicion[]): Lector {
  return async (cursor) => {
    const base = cliente
      .from('vehiculos')
      .select('id, creado_en, limpieza_el, situacion, vehiculos_imagenes(ruta_miniatura)')
      .eq('origen_id', origen)
      .eq(FILTRO_DE_PORTADA.columna, FILTRO_DE_PORTADA.valor)
    const haciaAtras = cursor?.sentido === 'anterior'
    const { data, error } = await aplicarCursor(aplicarCondiciones(base, condiciones), cursor)
      .order('creado_en', { ascending: haciaAtras })
      .order('id', { ascending: haciaAtras })
      .limit(TAMANO + 1)
    if (error) {
      throw new Error(`Lo de hoy no leyó: ${error.code} ${error.message}`)
    }
    return (data as unknown as FilaDeHoy[]).map((fila) => ({
      id: fila.id,
      creadoEn: fila.creado_en,
      limpiezaEl: fila.limpieza_el,
      portada: fila.vehiculos_imagenes[0]?.ruta_miniatura ?? null,
      situacion: fila.situacion,
    }))
  }
}

// Lo nuevo: la RPC, con lo mismo que le pasaría el repositorio.
function nuevo(cliente: Cliente, origen: string, condiciones: Condicion[]): Lector {
  return async (cursor) => {
    const { data, error } = await cliente.rpc('vehiculos_inventario', {
      p_origen: origen,
      p_tamano: TAMANO,
      p_filtros: condiciones,
      p_cursor_en: cursor?.instante ?? null,
      p_cursor_id: cursor?.id ?? null,
      p_hacia_atras: cursor?.sentido === 'anterior',
    })
    if (error) {
      throw new Error(`vehiculos_inventario() no leyó: ${error.code} ${error.message}`)
    }
    return (data as FilaNueva[]).map((fila) => ({
      id: fila.id,
      creadoEn: fila.creado_en,
      limpiezaEl: fila.limpieza_el,
      portada: fila.portada_ruta,
      situacion: fila.situacion,
    }))
  }
}

function cursorDe(texto: string): Cursor {
  const cursor = leerCursor(texto)
  if (!cursor) {
    throw new Error(`El cursor «${texto}» no se lee.`)
  }
  return cursor
}

// Hacia adelante hasta la última página y de vuelta con «Anterior» hasta la primera, como la pantalla (`armarPagina`).
async function recorrer(leer: Lector): Promise<Fila[][]> {
  const paginas: Fila[][] = []
  const pedir = async (cursor: Cursor | null) => {
    if (paginas.length >= TOPE_DE_PAGINAS) {
      throw new Error(`Más de ${TOPE_DE_PAGINAS} páginas: el recorrido no termina.`)
    }
    const pagina = armarPagina(await leer(cursor), TAMANO, cursor)
    paginas.push(pagina.filas)
    return pagina
  }
  let pagina = await pedir(null)
  while (pagina.siguiente) {
    pagina = await pedir(cursorDe(pagina.siguiente))
  }
  while (pagina.anterior) {
    pagina = await pedir(cursorDe(pagina.anterior))
  }
  return paginas
}

// Lo que se compara: el id, su `limpieza_el`, su portada y su situación, página por página.
const comparable = (paginas: Fila[][]) =>
  paginas.map((filas) =>
    filas.map(({ id, limpiezaEl, portada, situacion }) => ({ id, limpiezaEl, portada, situacion })),
  )
// Cada fila una vez: el recorrido pasa dos veces por las del medio.
const unicas = (paginas: Fila[][]) => new Map(paginas.flat().map((una) => [una.id, una]))

let terreno: TerrenoPostgrest | undefined

test.beforeAll(async ({}, info) => {
  info.setTimeout(180_000)
  terreno = await prepararInventarioPostgrest(info.project.name)
})

test.afterAll(async ({}, info) => {
  info.setTimeout(120_000)
  await limpiarInventarioPostgrest(terreno?.ajustesAntes)
})

test('vehiculos_inventario() da las mismas páginas que lo de hoy por PostgREST, con cada filtro y persona', async () => {
  test.setTimeout(300_000)
  if (!terreno) {
    throw new Error('No hay terreno.')
  }
  const t = terreno
  const personas = [
    { nombre: 'la dueña', cliente: await sesionDe(t.duena, CLAVE) },
    { nombre: 'Pía', cliente: await sesionDe(t.pia, CLAVE) },
  ]
  const casos = casosDe(t)
  const origenDe = (caso: Caso) => (caso.origen === 'corea' ? t.corea : t.subasta)

  // 1. Todo lo de hoy.
  const deHoy = new Map<string, Fila[][]>()
  for (const persona of personas) {
    for (const caso of casos) {
      const paginas = await recorrer(hoy(persona.cliente, origenDe(caso), caso.condiciones))
      deHoy.set(`${persona.nombre} · ${caso.nombre}`, paginas)
    }
  }
  const de = (persona: string, caso: string) => deHoy.get(`${persona} · ${caso}`) ?? []

  // El terreno es el que se pensó: Pía ve sus 9 y los 3 de sus leads; hay portadas y fechas de limpieza que comparar.
  expect([...unicas(de('Pía', SIN_FILTROS)).keys()].sort()).toEqual([...t.dePia].sort())
  const todoCorea = [...unicas(de('la dueña', SIN_FILTROS)).values()]
  expect(todoCorea.filter((fila) => fila.portada !== null)).toHaveLength(3)
  const todaSubasta = [...unicas(de('la dueña', `${SIN_FILTROS} (subasta)`)).values()]
  expect(todaSubasta).toHaveLength(11)
  // Las tres situaciones que filtra el inventario están en el terreno.
  expect(new Set(todaSubasta.map((fila) => fila.situacion))).toEqual(
    new Set(['fase', 'sin_resolver', 'no_ganada']),
  )
  expect(todaSubasta.filter((fila) => fila.limpiezaEl !== null).length).toBeGreaterThanOrEqual(3)

  // Cada caso discrimina para la dueña: ni vacío ni todo su origen.
  for (const caso of casos.filter((uno) => !uno.nombre.startsWith(SIN_FILTROS))) {
    const total = (caso.origen === 'corea' ? todoCorea : todaSubasta).length
    const n = unicas(de('la dueña', caso.nombre)).size
    expect(n > 0 && n < total, `«${caso.nombre}» no discrimina: ${n} de ${total}`).toBe(true)
  }

  // 2. Lo nuevo, contra lo de hoy.
  for (const persona of personas) {
    for (const caso of casos) {
      const etiqueta = `${persona.nombre} · ${caso.nombre}`
      const paginas = await recorrer(nuevo(persona.cliente, origenDe(caso), caso.condiciones))
      expect(comparable(paginas), etiqueta).toEqual(comparable(deHoy.get(etiqueta) ?? []))
    }
  }
})
