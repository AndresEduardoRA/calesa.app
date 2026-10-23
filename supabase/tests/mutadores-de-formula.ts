// Los mutadores del corpus diferencial (`corpus-de-formula.ts`) que rompen una regla cruzada de `validar.ts` / `validar_formula()`,
// más lo que comparten con los de la forma. Cada uno cambia la fórmula en su lugar y devuelve qué hizo, o null si no se aplica a
// esa fórmula (no tiene grupos, ni variante, ni un par…).

export type Json = null | boolean | number | string | Json[] | { [clave: string]: Json }
export type Objeto = { [clave: string]: Json }
export type Formula = { definicion: Json; params: Json }
export type Azar = { entero: (hasta: number) => number }
export type Mutador = { nombre: string; aplicar: (f: Formula, azar: Azar) => string | null }

export const esObjeto = (x: Json | undefined): x is Objeto =>
  typeof x === 'object' && x !== null && !Array.isArray(x)

export function elegir<T>(azar: Azar, lista: readonly T[]): T | undefined {
  return lista.length === 0 ? undefined : lista[azar.entero(lista.length)]
}

export const definicionDe = (f: Formula): Objeto | undefined =>
  esObjeto(f.definicion) ? f.definicion : undefined
export const paramsDe = (f: Formula): Objeto | undefined =>
  esObjeto(f.params) ? f.params : undefined

// La lista de nodos tal cual (puede traer lo que un mutador de forma dejó).
export function listaDe(f: Formula): Json[] {
  const nodos = definicionDe(f)?.['nodos']
  return Array.isArray(nodos) ? nodos : []
}

// Los nodos que son objetos, con su posición en la lista.
export type ConPosicion = { n: Objeto; i: number }
export function nodosDe(f: Formula, filtro: (n: Objeto) => boolean = () => true): ConPosicion[] {
  const salida: ConPosicion[] = []
  listaDe(f).forEach((n, i) => {
    if (esObjeto(n) && filtro(n)) salida.push({ n, i })
  })
  return salida
}

export const texto = (n: Objeto, clave: string): string | undefined => {
  const x = n[clave]
  return typeof x === 'string' ? x : undefined
}
export const idDe = (n: Objeto) => texto(n, 'id') ?? '?'
export const esTipo =
  (...tipos: string[]) =>
  (n: Objeto) =>
    tipos.includes(texto(n, 'tipo') ?? '')
export const esOp =
  (...ops: string[]) =>
  (n: Objeto) =>
    texto(n, 'tipo') === 'calculo' && ops.includes(texto(n, 'op') ?? '')
export const DE_VALOR = ['input', 'constante', 'tabla', 'tramo', 'calculo']

// Una referencia de un nodo: dónde está (`de` con su índice, `pct`, `sobre`, `condicion`, `sugerido_de`, `requerido_si` o una
// columna de `match`).
type Ref = { campo: string; indice?: number; columna?: string }
function refsDe(n: Objeto): Ref[] {
  const refs: Ref[] = []
  const de = n['de']
  if (Array.isArray(de)) de.forEach((_, indice) => refs.push({ campo: 'de', indice }))
  for (const campo of ['pct', 'sobre', 'condicion', 'sugerido_de', 'requerido_si']) {
    if (texto(n, campo) !== undefined) refs.push({ campo })
  }
  const match = n['match']
  if (esObjeto(match))
    for (const columna of Object.keys(match)) refs.push({ campo: 'match', columna })
  return refs
}
function ponerRef(n: Objeto, r: Ref, valor: string) {
  const de = n['de']
  if (r.campo === 'de' && Array.isArray(de) && r.indice !== undefined) de[r.indice] = valor
  else if (r.campo === 'match' && esObjeto(n['match']) && r.columna !== undefined)
    n['match'][r.columna] = valor
  else n[r.campo] = valor
}
const nombreDeRef = (r: Ref) =>
  r.campo === 'de'
    ? `de[${r.indice ?? 0}]`
    : r.campo === 'match'
      ? `match.${r.columna ?? ''}`
      : r.campo

// Cambia una referencia de un nodo con referencias por lo que diga `destino` (o nada si no hay a dónde apuntar).
type CambioDeRef = {
  nombre: string
  destino: (yo: ConPosicion, r: Ref) => string | undefined
  filtroDeRef?: (r: Ref) => boolean
}
function cambiarRef(
  f: Formula,
  azar: Azar,
  { nombre, destino, filtroDeRef = () => true }: CambioDeRef,
): string | null {
  const conRefs = nodosDe(f).filter(({ n }) => refsDe(n).some(filtroDeRef))
  const yo = elegir(azar, conRefs)
  if (!yo) return null
  const r = elegir(azar, refsDe(yo.n).filter(filtroDeRef))
  if (!r) return null
  const valor = destino(yo, r)
  if (valor === undefined) return null
  ponerRef(yo.n, r, valor)
  return `${nombre}(${idDe(yo.n)}.${nombreDeRef(r)}=${valor})`
}

export function insertar(f: Formula, i: number, nodo: Json) {
  listaDe(f).splice(i, 0, nodo)
}
export const clonar = <T extends Json>(x: T): T => structuredClone(x)
export const totalDe = (f: Formula) => nodosDe(f, (n) => texto(n, 'salida') === 'total')[0]
const ids = (lista: ConPosicion[]) => lista.map(({ n }) => idDe(n))
const sinRefMatch = (r: Ref) => r.campo !== 'match'

// --- estructura y referencias -----------------------------------------------------------------------------------------------
const ESTRUCTURA: Mutador[] = [
  {
    nombre: 'borrar',
    aplicar: (f, azar) => {
      const lista = listaDe(f)
      if (lista.length < 2) return null
      const i = azar.entero(lista.length)
      const [n] = lista.splice(i, 1)
      return `borrar(${esObjeto(n) ? idDe(n) : i})`
    },
  },
  {
    nombre: 'duplicar',
    aplicar: (f, azar) => {
      const yo = elegir(azar, nodosDe(f))
      if (!yo) return null
      const j = azar.entero(listaDe(f).length + 1)
      insertar(f, j, clonar(yo.n))
      return `duplicar(${idDe(yo.n)}→${j})`
    },
  },
  {
    nombre: 'mover',
    aplicar: (f, azar) => {
      const lista = listaDe(f)
      if (lista.length < 2) return null
      const i = azar.entero(lista.length)
      const [n] = lista.splice(i, 1)
      const j = azar.entero(lista.length + 1)
      lista.splice(j, 0, n ?? null)
      return i === j ? null : `mover(${esObjeto(n) ? idDe(n) : i}:${i}→${j})`
    },
  },
  {
    nombre: 'intercambiar',
    aplicar: (f, azar) => {
      const lista = listaDe(f)
      if (lista.length < 2) return null
      const i = azar.entero(lista.length)
      const j = azar.entero(lista.length)
      if (i === j) return null
      const [a, b] = [lista[i] ?? null, lista[j] ?? null]
      lista[i] = b
      lista[j] = a
      return `intercambiar(${i}↔${j})`
    },
  },
  {
    nombre: 'ref_inexistente',
    aplicar: (f, azar) =>
      cambiarRef(f, azar, {
        nombre: 'ref_inexistente',
        destino: () => 'no_existe',
        filtroDeRef: sinRefMatch,
      }),
  },
  {
    nombre: 'ref_posterior',
    aplicar: (f, azar) =>
      cambiarRef(f, azar, {
        nombre: 'ref_posterior',
        destino: ({ i }) => elegir(azar, ids(nodosDe(f).filter((x) => x.i > i))),
      }),
  },
  {
    nombre: 'ref_propia',
    aplicar: (f, azar) =>
      cambiarRef(f, azar, { nombre: 'ref_propia', destino: ({ n }) => idDe(n) }),
  },
  {
    nombre: 'ref_anterior',
    aplicar: (f, azar) =>
      cambiarRef(f, azar, {
        nombre: 'ref_anterior',
        destino: ({ i }) => elegir(azar, ids(nodosDe(f).filter((x) => x.i < i))),
      }),
  },
  {
    nombre: 'condicion_no_bandera',
    aplicar: (f, azar) => {
      const yo = elegir(
        azar,
        nodosDe(f, esTipo(...DE_VALOR)).filter(({ i }) => i > 0),
      )
      if (!yo) return null
      const otro = elegir(
        azar,
        ids(nodosDe(f, (n) => !esTipo('bandera')(n)).filter((x) => x.i < yo.i)),
      )
      if (otro === undefined) return null
      yo.n['condicion'] = otro
      return `condicion_no_bandera(${idDe(yo.n)}=${otro})`
    },
  },
  {
    nombre: 'requerido_si_no_bandera',
    aplicar: (f, azar) => {
      const yo = elegir(
        azar,
        nodosDe(f, esTipo('input')).filter(({ i }) => i > 0),
      )
      if (!yo) return null
      const otro = elegir(
        azar,
        ids(nodosDe(f, (n) => !esTipo('bandera')(n)).filter((x) => x.i < yo.i)),
      )
      if (otro === undefined) return null
      yo.n['requerido_si'] = otro
      return `requerido_si_no_bandera(${idDe(yo.n)}=${otro})`
    },
  },
  {
    nombre: 'de_variante',
    aplicar: (f, azar) => {
      const v = nodosDe(f, esTipo('opcion'))[0]
      if (!v) return null
      const yo = elegir(
        azar,
        nodosDe(f, esOp('suma', 'multiplicar', 'porcentaje_de')).filter(({ i }) => i > v.i),
      )
      if (!yo || !Array.isArray(yo.n['de'])) return null
      yo.n['de'].push(idDe(v.n))
      return `de_variante(${idDe(yo.n)})`
    },
  },
]

// Los demás van por sección de `validar_formula()`: el total, params y los pares en `mutadores-del-total.ts`; los tipos de cambio y
// los grupos en `mutadores-de-grupos.ts`; la variante en `mutadores-de-variante.ts`; la forma en `mutadores-de-forma.ts`.
export const MUTADORES_BASICOS: readonly Mutador[] = ESTRUCTURA
