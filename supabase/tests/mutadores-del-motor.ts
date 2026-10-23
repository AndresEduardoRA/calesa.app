// Más mutadores del corpus de `evaluar_formula()` (`corpus-del-motor.ts`): las tablas (congeladas en `params.tablas` o vivas en
// `entrada.tablas`) y la fórmula. Cambian `params` o `definicion`: el ensamblador comprueba después que la fórmula siga validando
// (`validarFormula`), y descarta el intento si no.
import {
  clonar,
  DE_VALOR,
  elegir,
  esObjeto,
  esTipo,
  idDe,
  insertar,
  nodosDe,
  texto,
  type Azar,
  type Json,
  type Objeto,
} from './mutadores-de-formula'
import { m, type Llamada, type MutadorDelMotor } from './mutadores-de-entrada'

// ---------------------------------------------------------------------------------------------------------------------------
// Las tablas, congeladas o vivas: se cambia la que toque el azar. La congelada manda sobre la viva, aunque esté vacía.
// ---------------------------------------------------------------------------------------------------------------------------
type Sitio = { padre: Objeto; clave: string; filas: Json[]; congelada: boolean }

function sitios(c: Llamada): Sitio[] {
  const salida: Sitio[] = []
  const congeladas = esObjeto(c.params) ? c.params['tablas'] : undefined
  for (const [padre, congelada] of [
    [congeladas, true] as const,
    [c.entrada['tablas'], false] as const,
  ]) {
    if (!esObjeto(padre)) continue
    for (const [clave, filas] of Object.entries(padre)) {
      if (Array.isArray(filas)) salida.push({ padre, clave, filas, congelada })
    }
  }
  return salida
}

// Las columnas con las que los nodos leen esa tabla: la que devuelven y las del `match` o del tramo.
function columnasDe(c: Llamada, tabla: string): string[] {
  const salida = new Set<string>()
  for (const { n } of nodosDe(c, (x) => texto(x, 'tabla') === tabla)) {
    const columna = texto(n, 'columna')
    if (columna) salida.add(columna)
    const match = n['match']
    if (esObjeto(match)) for (const k of Object.keys(match)) salida.add(k)
  }
  return [...salida]
}

const sobreTabla = (nombre: string, f: (s: Sitio, c: Llamada, azar: Azar) => string | null) =>
  m(nombre, (c, azar) => {
    const s = elegir(azar, sitios(c))
    if (!s) return null
    const detalle = f(s, c, azar)
    return detalle === null ? null : `${s.congelada ? 'params' : 'entrada'}.${s.clave}:${detalle}`
  })

// Cambia una columna en todas las filas, o sólo en una.
function enColumna(s: Sitio, c: Llamada, azar: Azar, valor: Json): string | null {
  const columna = elegir(azar, columnasDe(c, s.clave))
  if (columna === undefined || s.filas.length === 0) return null
  const una = azar.entero(2) === 0 ? elegir(azar, s.filas) : undefined
  for (const fila of s.filas) {
    if (esObjeto(fila) && (una === undefined || fila === una)) fila[columna] = valor
  }
  return `${columna}=${JSON.stringify(valor)}`
}

export const MUTADORES_DE_TABLAS: readonly MutadorDelMotor[] = [
  sobreTabla('tabla_vaciada', (s) => ((s.filas.length = 0), 'vaciada')),
  sobreTabla('tabla_quitada', (s) => (delete s.padre[s.clave], 'quitada')),
  sobreTabla('tabla_celda_null', (s, c, azar) => enColumna(s, c, azar, null)),
  sobreTabla('tabla_celda_texto', (s, c, azar) => enColumna(s, c, azar, 'n/d')),
  sobreTabla('tabla_celda_extrema', (s, c, azar) =>
    enColumna(s, c, azar, elegir(azar, [1e308, -1e308, 1e300, 1e-300, 5e-324, 0, 1e150]) ?? 0),
  ),
  sobreTabla('tabla_sin_coincidencia', (s, c, azar) =>
    enColumna(s, c, azar, elegir<Json>(azar, ['zzz', -999, '2024', 1e-9]) ?? 'zzz'),
  ),
  sobreTabla('tabla_fila_repetida', (s, c, azar) => {
    const primera = s.filas[0]
    const columna = elegir(azar, columnasDe(c, s.clave))
    if (!esObjeto(primera) || columna === undefined) return null
    const copia = clonar(primera)
    const v = copia[columna]
    copia[columna] = typeof v === 'number' ? v * 2 + 1 : 'otra'
    // Delante, gana la copia; detrás, gana la original: el resultado cambia sólo en el primer caso.
    if (azar.entero(2) === 0) s.filas.unshift(copia)
    else s.filas.splice(1, 0, copia)
    return columna
  }),
  sobreTabla('tramo_sin_extremo', (s, _c, azar) => {
    if (s.filas.length === 0) return null
    const que = elegir(azar, ['desde', 'hasta']) ?? 'desde'
    const como = azar.entero(2) === 0 ? 'quitado' : 'null'
    for (const fila of s.filas) {
      if (!esObjeto(fila)) continue
      if (como === 'quitado') delete fila[que]
      else fila[que] = null
    }
    return `${que}:${como}`
  }),
  // De un lado al otro: la fórmula deja de congelarla y la entrada la trae viva, o al revés. Una congelada y una viva distintas.
  m('tabla_de_lado', (c, azar) => {
    const s = elegir(azar, sitios(c))
    if (!s || !esObjeto(c.params)) return null
    const destino = s.congelada ? c.entrada['tablas'] : c.params['tablas']
    let otro: Objeto
    if (esObjeto(destino)) otro = destino
    else {
      otro = {}
      if (s.congelada) c.entrada['tablas'] = otro
      else c.params['tablas'] = otro
    }
    otro[s.clave] = clonar(s.filas)
    if (azar.entero(2) === 0) delete s.padre[s.clave]
    else if (s.filas[0] !== undefined && esObjeto(s.filas[0])) {
      const columna = elegir(azar, columnasDe(c, s.clave))
      const fila = otro[s.clave]
      if (columna && Array.isArray(fila) && esObjeto(fila[0])) fila[0][columna] = 777
    }
    return s.clave
  }),
]

// ---------------------------------------------------------------------------------------------------------------------------
// La fórmula (válida: el ensamblador lo comprueba).
// ---------------------------------------------------------------------------------------------------------------------------
const OTROS_CAMPOS = ['a_b', 'a1', 'ab', 'a.b', 'b2', 'a0']

export const MUTADORES_DE_FORMULA_DEL_MOTOR: readonly MutadorDelMotor[] = [
  // Un `match` de dos campos del vehículo: si faltan los dos, el faltante nombra el menor en orden de código (a1 < a_b, y no al
  // revés como en un orden de idioma), no el primero.
  m('match_con_campos', (c, azar) => {
    const t = elegir(azar, nodosDe(c, esTipo('tabla')))
    if (!t || !esObjeto(t.n['match'])) return null
    const [x, y] = [elegir(azar, OTROS_CAMPOS), elegir(azar, OTROS_CAMPOS)]
    if (x === undefined || y === undefined || x === y) return null
    t.n['match'] = { ...t.n['match'], b: x, aa: y }
    return `${idDe(t.n)}:${x},${y}`
  }),
  // Un nodo que anota un faltante entre el pct y su par: la división por cero de un pct pisado se anota al llegar el par, no antes.
  m('campo_entre_pct_y_par', (c) => {
    const pares = nodosDe(
      c,
      (n) => texto(n, 'op') === 'porcentaje_de' && n['sobrescribible'] === true,
    )
    for (const par of pares) {
      const pct = nodosDe(c, (n) => idDe(n) === texto(par.n, 'pct'))[0]
      if (pct === undefined || pct.i >= par.i) continue
      insertar(c, pct.i + 1, {
        id: 'campo_de_paso',
        tipo: 'campo_vehiculo',
        campo: 'campo_de_paso',
        etiqueta: 'Campo de paso',
        formato: 'raw',
      })
      return idDe(par.n)
    }
    return null
  }),
  m('por_defecto_quitado', (c) => {
    const o = nodosDe(c, esTipo('opcion'))[0]
    if (!o || o.n['por_defecto'] === undefined) return null
    delete o.n['por_defecto']
    return idDe(o.n)
  }),
  m('solo_en_cambiado', (c, azar) => {
    const o = nodosDe(c, esTipo('opcion'))[0]
    const claves = Array.isArray(o?.n['opciones'])
      ? o.n['opciones'].flatMap((x) =>
          esObjeto(x) && typeof x['clave'] === 'string' ? [x['clave']] : [],
        )
      : []
    const n = elegir(
      azar,
      nodosDe(c, (x) => Array.isArray(x['solo_en'])),
    )
    if (!n || claves.length < 2) return null
    n.n['solo_en'] = [elegir(azar, claves) ?? claves[0] ?? '']
    return idDe(n.n)
  }),
  m('sobrescribible_alternado', (c, azar) => {
    const n = elegir(
      azar,
      nodosDe(
        c,
        (x) =>
          ['tabla', 'tramo', 'calculo'].includes(texto(x, 'tipo') ?? '') && x['salida'] !== 'total',
      ),
    )
    if (!n) return null
    n.n['sobrescribible'] = n.n['sobrescribible'] !== true
    return idDe(n.n)
  }),
  m('condicion_agregada', (c, azar) => {
    const bandera = nodosDe(c, esTipo('bandera'))[0]
    const destino = elegir(
      azar,
      nodosDe(
        c,
        (n) =>
          DE_VALOR.includes(texto(n, 'tipo') ?? '') &&
          n['salida'] !== 'total' &&
          n['condicion'] === undefined,
      ),
    )
    if (!bandera || !destino || destino.i < bandera.i || texto(destino.n, 'op') === 'si')
      return null
    destino.n['condicion'] = idDe(bandera.n)
    return `${idDe(destino.n)}:${idDe(bandera.n)}`
  }),
]
