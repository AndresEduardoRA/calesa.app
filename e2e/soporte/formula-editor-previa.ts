// Lo que preparan los e2e de la vista previa y las filas nuevas del editor de la fórmula (4.21-3a-2): un borrador con filas de cifra conocida (`base = 900`,
// `doble = base*2`, `total = doble` y una fila `tabla` por el año 0), un tipo de cambio propio y tablas de referencia (del origen, compartidas y de volumen), todo con
// el proyecto en la clave para que `escritorio` y `movil` no se pisen. Lo propio se borra siempre (`borrarLoDePrevia()`): los orígenes los borra
// `borrarOrigenesDeCotizar()`. La fórmula se arma por el camino de verdad (`formulaDePrueba()` de `src/`, que compila cada texto).
import type { Formula } from '../../src/modules/cotizaciones/entities/formula'
import {
  formulaDePrueba,
  NODOS_DE_BASE,
} from '../../src/modules/cotizaciones/entities/formula/fila-de-prueba.soporte'
import type { Nodo } from '../../src/modules/cotizaciones/entities/nodos'
import { definicionDeNFilas } from './formula-editor'
import { literal, sql } from './sql'

const PREFIJO_TC = 'e2e_tc_previa'
const PREFIJO_TABLA = 'e2e_tabla_previa'
export const claveDelCambio = (proyecto: string) => `${PREFIJO_TC}_${proyecto}`
export const claveDeLaTabla = (proyecto: string) => `${PREFIJO_TABLA}_${proyecto}`

const json = (valor: unknown) => `$e2e$${JSON.stringify(valor)}$e2e$::jsonb`
const plano = (formula: Formula) => ({
  ...formula.params.constantes,
  tablas: formula.params.tablas,
})

// Una definición validada: `tc` (el tipo de cambio propio), `anio` (input, vale 0), `factor` (una fila de la tabla viva por `anio`) y las filas de texto.
export function formulaDePrevia(proyecto: string, congelada?: number): Formula {
  const base: Nodo[] = [
    ...NODOS_DE_BASE.filter((n) => n.id !== 'tc').map((n) => n),
    { id: 'tc', tipo: 'tipo_cambio', etiqueta: 'Tipo de cambio', clave: claveDelCambio(proyecto) },
    { id: 'anio', tipo: 'input', etiqueta: 'Año' },
    {
      id: 'factor',
      tipo: 'tabla',
      etiqueta: 'Factor',
      tabla: claveDeLaTabla(proyecto),
      match: { anio: 'anio' },
      columna: 'factor',
      formato: 'raw',
    },
  ]
  const f = formulaDePrueba(
    [
      { id: 'base', texto: '900', etiqueta: 'Base', destino: { formato: 'usd' } },
      { id: 'doble', texto: '=base*2', etiqueta: 'Doble', destino: { formato: 'usd' } },
      { id: 'total', texto: '=doble', etiqueta: 'Total', destino: { formato: 'usd' } },
    ],
    base,
  )
  return congelada === undefined
    ? f
    : {
        ...f,
        params: {
          ...f.params,
          tablas: { [claveDeLaTabla(proyecto)]: [{ anio: 0, factor: congelada }] },
        },
      }
}

// Un borrador de `autor` en un origen sin publicada, con la fórmula de arriba.
export function sembrarBorradorDePrevia(
  origenId: string,
  autor: string,
  proyecto: string,
  congelada?: number,
): void {
  const f = formulaDePrevia(proyecto, congelada)
  sql(`
    insert into public.formulas (origen_id, estado, definicion, params, nota, creado_por)
    values (${literal(origenId)}::uuid, 'borrador', ${json(f.definicion)}, ${json(plano(f))}, 'Borrador E2E 4.21-3a-2',
            (select id from public.perfiles where email = ${literal(autor)}))`)
}

export function sembrarTipoDeCambio(proyecto: string, valor: number, activo = true): void {
  sql(`
    insert into public.tipos_cambio (clave, nombre, moneda_de, moneda_a, valor, activo, orden)
    values (${literal(claveDelCambio(proyecto))}, 'E2E previa', 'USD', 'BOB', ${String(valor)}, ${String(activo)}, 99)
    on conflict (clave) do update set valor = excluded.valor, activo = excluded.activo`)
}

const COLUMNAS = [
  { clave: 'anio', etiqueta: 'Año', tipo: 'anio' },
  { clave: 'factor', etiqueta: 'Factor', tipo: 'numero' },
]

// Una tabla de referencia (del origen o compartida con `origenId` nulo) con una fila por año 0 y el factor dado.
export function sembrarTabla(t: {
  proyecto: string
  origenId: string | null
  factor: number
  activa?: boolean
}): void {
  const { proyecto, origenId, factor, activa = true } = t
  const clave = claveDeLaTabla(proyecto)
  sql(`
    do $f$
    declare v_tabla uuid;
    begin
      insert into public.tablas_referencia (origen_id, clave, nombre, columnas, activa)
      values (${origenId === null ? 'null' : `${literal(origenId)}::uuid`}, ${literal(clave)}, 'E2E previa', ${json(COLUMNAS)}, ${String(activa)})
      returning id into v_tabla;
      insert into public.tablas_referencia_filas (tabla_id, valores, orden)
      values (v_tabla, ${json({ anio: 0, factor })}, 0);
    end $f$`)
}

// Una tabla compartida de `n` filas (anio 0 … n-1, factor 1), por SQL: para los volúmenes de 999, 1.000, 1.001 y 600 filas.
export function sembrarTablaDeVolumen(clave: string, n: number): void {
  sql(`
    do $f$
    declare v_tabla uuid;
    begin
      insert into public.tablas_referencia (origen_id, clave, nombre, columnas)
      values (null, ${literal(clave)}, 'E2E previa volumen', ${json(COLUMNAS)}) returning id into v_tabla;
      insert into public.tablas_referencia_filas (tabla_id, valores, orden)
      select v_tabla, jsonb_build_object('anio', g, 'factor', 1), g from generate_series(0, ${String(n - 1)}) g;
    end $f$`)
}

// Lo propio de estos e2e: las tablas y el tipo de cambio (los orígenes los borra `borrarOrigenesDeCotizar()`).
export function borrarLoDePrevia(): void {
  sql(`
    delete from public.tablas_referencia where clave like '${PREFIJO_TABLA}%';
    delete from public.tipos_cambio where clave like '${PREFIJO_TC}%'`)
}

export const claveDeVolumen = (proyecto: string, sufijo: string) =>
  `${PREFIJO_TABLA}_${proyecto}_${sufijo}`

// La definición de `definicionDeNFilas(n)` con un nodo `anio` (vale 0) y un nodo `tabla` por clave (`t_<i>`), tras el tipo de cambio: cada uno lee el factor del año 0.
export function definicionConTablas(n: number, claves: readonly string[]) {
  const d = definicionDeNFilas(n)
  const [tc, ...resto] = d.nodos
  const tablas = claves.map((clave, i) => ({
    id: `t_${String(i + 1)}`,
    tipo: 'tabla',
    etiqueta: `Tabla ${String(i + 1)}`,
    tabla: clave,
    match: { anio: 'anio' },
    columna: 'factor',
  }))
  return { ...d, nodos: [tc, { id: 'anio', tipo: 'input', etiqueta: 'Año' }, ...tablas, ...resto] }
}

// Un borrador de `autor` con esa definición (sin params), en un origen sin publicada.
export function sembrarBorradorDeLaDefinicion(
  origenId: string,
  definicion: unknown,
  autor: string,
): void {
  sql(`
    insert into public.formulas (origen_id, estado, definicion, params, nota, creado_por)
    values (${literal(origenId)}::uuid, 'borrador', ${json(definicion)}, '{}'::jsonb, 'Borrador E2E 4.21-3a-2 volumen',
            (select id from public.perfiles where email = ${literal(autor)}))`)
}
