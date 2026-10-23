// Una evaluación sintética de unos `n` nodos para medir el motor con volumen: la fórmula, sus tablas y la entrada. Es la de
// `motor-escala.test.ts` hecha paramétrica: la usan la medición de `evaluar_formula()` en la base (volcada a
// `supabase/tests/corpus-del-motor.json` › `sinteticas`) y su propio test. Con 50 filas y 2 tablas congeladas da lo mismo que la de
// ese test; con `filas: 1000` y `tablas: 4` es el costo de las tablas grandes.
//
// Las tablas son pares: `t1`, `t3`… se leen con un `match` por clase (la fila buscada es la última) y `t2`, `t4`… con un tramo por
// año (también la última). `vivas: true` las manda en la entrada en vez de congelarlas en `params`.
type Crudo = Record<string, unknown>

export type OpcionesDeEvaluacionSintetica = {
  // Filas por tabla.
  filas?: number
  // Cuántas tablas (pares: una por clase y una por año).
  tablas?: number
  // Las tablas vienen en la entrada (vivas) y no congeladas en `params`.
  vivas?: boolean
  // El año de la primera fila de las tablas por año (2000 por defecto). Con 1.000 filas el último año es 2999: para sembrar el
  // vehículo en la base (`anio` va de 1900 a 2100) la medición de `cotizacion_evaluar()` pide 1100 y el último queda en 2099.
  anioInicial?: number
}

const opcion = (clave: string) => ({ clave, etiqueta: clave, titulo: clave })

// Lo fijo: la variante (a o b, por defecto a), dos tipos de cambio, la bandera, el año y el porcentaje.
const CABECERA: Crudo[] = [
  {
    id: 'variante',
    tipo: 'opcion',
    etiqueta: 'V',
    opciones: [opcion('a'), opcion('b')],
    por_defecto: 'a',
  },
  { id: 'tc_a', tipo: 'tipo_cambio', clave: 'oficial', etiqueta: 'A', formato: 'raw' },
  { id: 'tc_b', tipo: 'tipo_cambio', clave: 'paralelo', etiqueta: 'B', formato: 'raw' },
  { id: 'activa', tipo: 'bandera', etiqueta: 'Activa', formato: 'raw' },
  { id: 'anio', tipo: 'campo_vehiculo', campo: 'anio', etiqueta: 'Año', formato: 'raw' },
  { id: 'pct', tipo: 'constante', etiqueta: 'P', formato: 'pct' },
]

// El nodo k, en un ciclo de 8 tipos: miembros de un grupo (constantes, inputs, `porcentaje_de`, tablas y tramos) y cálculos fuera de
// los grupos (uno de cada dos `multiplicar` con una condición encendida). Cada rasgo va en un tipo del ciclo, así todas las
// sintéticas lo tienen en la misma proporción: el `multiplicar` está en su variante y el `restar`, fuera; el input sin tipear
// vale su sugerido; el tramo trae override y el `redondear`, uno que se descarta.
function forma(k: number, ids: readonly string[], grupo: string, pares: number): Crudo {
  const [a, b, c] = [ids[k - 1] ?? 'pct', ids[k - 2] ?? 'pct', ids[k - 3] ?? 'pct']
  const condicion = k % 16 === 3 ? { condicion: 'activa' } : {}
  const par = Math.floor(k / 8) % pares
  const formas: Crudo[] = [
    { tipo: 'constante', grupo },
    { tipo: 'input', sugerido_de: 'pct', grupo },
    { tipo: 'calculo', op: 'porcentaje_de', de: [a, b], pct: 'pct', grupo },
    { tipo: 'calculo', op: 'multiplicar', de: [a, b], solo_en: ['a'], ...condicion },
    { tipo: 'tabla', tabla: `t${2 * par + 1}`, match: { clase: 'clase' }, columna: 'v', grupo },
    {
      tipo: 'tramo',
      tabla: `t${2 * par + 2}`,
      sobre: 'anio',
      columna: 'v',
      sobrescribible: true,
      grupo,
    },
    { tipo: 'calculo', op: 'restar', de: [a, b, c], solo_en: ['b'] },
    { tipo: 'calculo', op: 'redondear', de: [a], n: 2 },
  ]
  return { id: `x${k}`, etiqueta: `x${k}`, ...formas[k % 8] }
}

function tablasDe(tablas: number, filas: number, anioInicial: number): Record<string, Crudo[]> {
  const salida: Record<string, Crudo[]> = {}
  for (let t = 1; t <= tablas; t += 1) {
    salida[`t${t}`] = Array.from({ length: filas }, (_, i) =>
      t % 2 === 1
        ? { clase: `c${i}`, v: i }
        : { desde: anioInicial + i, hasta: anioInicial + i, v: i },
    )
  }
  return salida
}

// Los nodos de la fórmula, los valores de `params` y los overrides de la entrada.
function nodosDe(n: number, grupos: readonly { id: string }[], pares: number) {
  const nodos = [...CABECERA]
  const params: Crudo = { pct: 0.1 }
  const overrides: Record<string, number> = { zz: 1, mm: 2, aa: 3 }
  const ids: string[] = []
  for (let k = 0, miembro = 0; nodos.length < n - 1; k += 1) {
    const nodo = forma(k, ids, grupos[miembro % grupos.length]?.id ?? 'g0', pares)
    if (nodo['grupo'] !== undefined) miembro += 1
    nodos.push(nodo)
    if (k % 8 === 0) params[`x${k}`] = k
    if (k % 8 === 5 || k % 8 === 7) overrides[`x${k}`] = k
    ids.push(`x${k}`)
  }
  const de = ids.filter((_, i) => i % 2 === 0)
  nodos.push({ id: 'total', tipo: 'calculo', op: 'suma', de, etiqueta: 'T', salida: 'total' })
  return { nodos, params, overrides }
}

export function evaluacionSintetica(n: number, opciones: OpcionesDeEvaluacionSintetica = {}) {
  const { filas = 50, tablas = 2, vivas = false, anioInicial = 2000 } = opciones
  if (tablas < 2 || tablas % 2 !== 0)
    throw new Error('las tablas van de a pares: una por clase y una por año')
  const grupos = Array.from({ length: n / 10 }, (_, i) => ({
    id: `g${i}`,
    etiqueta: `G${i}`,
    tono: 't',
    bucket: `b${i % 2}`,
  }))
  const { nodos, params, overrides } = nodosDe(n, grupos, tablas / 2)
  const congeladas = tablasDe(tablas, filas, anioInicial)
  if (!vivas) params['tablas'] = congeladas
  return {
    definicion: { nodos, buckets: { b0: 'tc_a', b1: 'tc_b' }, total_en: 'tc_b', grupos },
    params,
    entrada: {
      inputs: {},
      banderas: { activa: true },
      tipos_cambio: { oficial: 6.96, paralelo: 10 },
      // La última fila de cada tabla: el peor caso de una búsqueda.
      vehiculo: { anio: anioInicial + filas - 1, clase: `c${filas - 1}` },
      tablas: vivas ? congeladas : {},
      overrides,
    },
  }
}

export type EvaluacionSintetica = ReturnType<typeof evaluacionSintetica>
