// Una fórmula, un diseño y un contexto sintéticos de `unidades` filas con todo lo que crece: celdas de pares con su porcentaje, tablas
// con atajos, subtotales, banderas con su interruptor, secciones con niveles, modos y grupos con tonos. Los usa la prueba de escala del
// validador del diseño (`validar-diseno-escala.test.ts`) y, volcados a `supabase/tests/corpus-de-diseno.json` › `sinteticas`, la
// medición de `validar_diseno()` en la base. Cada unidad son 6 nodos y entre 4 y 6 ítems.
import type { ContextoDeDiseno } from './validar-diseno-contexto'

type Obj = Record<string, unknown>

const celda = (nodo: string, extra: Obj = {}): Obj => ({
  tipo: 'celda',
  nodo,
  ancho: 'mitad',
  ...extra,
})

// Los tamaños de cada lista, en función de las unidades.
function medidas(unidades: number) {
  return {
    grupos: Math.max(2, Math.floor(unidades / 2)),
    secciones: Math.max(2, Math.floor(unidades / 4)),
    niveles: Math.max(3, Math.floor(unidades / 4)),
    tonos: Math.max(2, Math.floor(unidades / 4)),
    modos: Math.max(2, Math.floor(unidades / 8)),
  }
}

type Unidad = {
  u: number
  grupo: string
  nodos: Obj[]
  params: Record<string, number>
  dest: Obj[]
}

// Los 6 nodos de una unidad, su sitio en el diseño y, cada diez, una bandera con el input que condiciona.
function agregarUnidad({ u, grupo, nodos, params, dest }: Unidad) {
  nodos.push({ id: `i${u}`, tipo: 'input', etiqueta: `I${u}`, grupo })
  nodos.push({ id: `c${u}`, tipo: 'constante', etiqueta: `C${u}`, grupo })
  nodos.push({ id: `q${u}`, tipo: 'constante', etiqueta: `Q${u}`, formato: 'pct' })
  nodos.push({
    id: `f${u}`,
    tipo: 'calculo',
    op: 'porcentaje_de',
    de: [`i${u}`, `c${u}`],
    pct: `q${u}`,
    etiqueta: `F${u}`,
    grupo,
    sobrescribible: true,
  })
  nodos.push({
    id: `t${u}`,
    tipo: 'tabla',
    tabla: 'tab',
    match: { anio: 'anio' },
    columna: 'v',
    etiqueta: `T${u}`,
    grupo,
    sobrescribible: true,
  })
  nodos.push({
    id: `s${u}`,
    tipo: 'calculo',
    op: 'suma',
    de: [`i${u}`, `c${u}`],
    etiqueta: `S${u}`,
  })
  params[`c${u}`] = u
  params[`q${u}`] = 0.1
  dest.push(celda(`i${u}`), celda(`c${u}`), celda(`f${u}`, { secundario: 'porcentaje' }))
  dest.push(celda(`t${u}`, { ayuda: { tabla: 'tab' } }))
  // Los atajos van con la celda de su tabla, en su misma sección.
  if (u % 3 === 0) dest.push({ tipo: 'atajos', nodo: `t${u}`, columna: 'anio', filas: 6 })
  if (u % 2 === 0) dest.push({ tipo: 'subtotal', nodo: `s${u}` })
  // Una bandera con el input que condiciona, cada diez.
  if (u % 10 === 0) {
    nodos.push({ id: `b${u}`, tipo: 'bandera', etiqueta: `B${u}`, formato: 'raw' })
    nodos.push({ id: `d${u}`, tipo: 'input', etiqueta: `D${u}`, condicion: `b${u}`, grupo })
    dest.push(
      { tipo: 'interruptor', nodo: `b${u}`, efecto: u % 20 === 0 ? 'habilita' : 'muestra' },
      celda(`d${u}`),
    )
  }
}

// Los nodos de siempre (tipos de cambio, año, la variante y el porcentaje de la garantía) y lo que crece con cada unidad.
function formula(unidades: number, grupos: number, porSeccion: (u: number) => Obj[]) {
  const nodos: Obj[] = [
    { id: 'tc_a', tipo: 'tipo_cambio', clave: 'oficial', etiqueta: 'A', formato: 'raw' },
    { id: 'tc_b', tipo: 'tipo_cambio', clave: 'paralelo', etiqueta: 'B', formato: 'raw' },
    { id: 'anio', tipo: 'campo_vehiculo', campo: 'anio', etiqueta: 'Año', formato: 'raw' },
    {
      id: 'variante',
      tipo: 'opcion',
      etiqueta: 'V',
      opciones: Array.from({ length: 10 }, (_, i) => ({
        clave: `o${i}`,
        etiqueta: `O${i}`,
        titulo: `Opción ${i}`,
      })),
      por_defecto: 'o0',
    },
    { id: 'qg', tipo: 'constante', etiqueta: 'QG', formato: 'pct' },
  ]
  const params: Record<string, number> = { qg: 0.15 }
  const miembros: string[] = []
  for (let u = 0; u < unidades; u += 1) {
    agregarUnidad({ u, grupo: `g${u % grupos}`, nodos, params, dest: porSeccion(u) })
    miembros.push(`f${u}`)
  }
  nodos.push({
    id: 'garantia',
    tipo: 'calculo',
    op: 'porcentaje_de',
    de: ['i0'],
    pct: 'qg',
    etiqueta: 'G',
    salida: 'aparte',
  })
  nodos.push({
    id: 'total',
    tipo: 'calculo',
    op: 'suma',
    de: miembros,
    etiqueta: 'T',
    salida: 'total',
  })
  return { nodos, params }
}

export function disenoSintetico(unidades: number) {
  const { grupos, secciones, niveles, tonos, modos } = medidas(unidades)
  const items: Obj[][] = Array.from({ length: secciones }, () => [])
  const { nodos, params } = formula(unidades, grupos, (u) => items[u % secciones] as Obj[])

  // Las secciones usan los niveles n0 a n{niveles-2}; el último está retirado y nadie lo usa.
  const lista = Array.from({ length: niveles }, (_, i) => `n${i}`)
  const diseno = {
    cabecera: {
      modos: Array.from({ length: modos }, (_, k) => ({
        clave: `m${k}`,
        nombre: `Modo ${k}`,
        buckets: [
          { bucket: 'b0', nodo: 'tc_a' },
          { bucket: 'b1', nodo: 'tc_b' },
        ],
        total_en: 'tc_b',
      })),
      ver_total_bs: true,
    },
    secciones: [
      {
        id: 'hoja',
        presentacion: 'principal',
        items: [
          { tipo: 'variante', nodo: 'variante' },
          celda('tc_a', { ancho: 'tercio' }),
          celda('tc_b', { ancho: 'tercio' }),
          // `qg` lo muestra la celda de `garantia` como su secundario: no tiene celda propia.
          celda('garantia', { secundario: 'porcentaje' }),
        ],
      },
      ...items.map((its, s) => ({
        id: `s${s}`,
        titulo: `Sección ${s}`,
        presentacion: s % 3 === 0 ? 'avanzado' : 'principal',
        ...(s % 4 === 1
          ? { nivel_ver: lista[s % (niveles - 1)], nivel_editar: lista[s % (niveles - 1)] }
          : {}),
        items: its,
      })),
    ],
    tarjeta_total: { nodo: 'total', secundarios: ['garantia'] },
  }
  const definicion = {
    nodos,
    buckets: { b0: 'tc_a', b1: 'tc_b' },
    total_en: 'tc_b',
    grupos: Array.from({ length: grupos }, (_, g) => ({
      id: `g${g}`,
      etiqueta: `G${g}`,
      tono: `t${g % tonos}`,
      bucket: `b${g % 2}`,
    })),
  }
  const contexto: ContextoDeDiseno = {
    niveles: lista,
    retirados: [lista[niveles - 1] as string],
    tonos: Array.from({ length: tonos }, (_, i) => `t${i}`),
  }
  return { definicion, params, diseno, contexto }
}

export type DisenoSintetico = ReturnType<typeof disenoSintetico>
