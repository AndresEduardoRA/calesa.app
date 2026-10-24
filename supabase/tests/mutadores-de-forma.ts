// Los mutadores del corpus diferencial que rompen la forma (el Zod de nodos.ts y formula.ts; §0 de `validar_formula()`). Hay uno
// por cada comprobación marcada `/*Fnn*/` en la migración `…004900`, y cada uno deja ese defecto solo en su nodo: así, con esa
// comprobación apagada (la prueba de mutación), el caso cambia.
import {
  definicionDe,
  elegir,
  esObjeto,
  esOp,
  esTipo,
  idDe,
  insertar,
  listaDe,
  nodosDe,
  paramsDe,
  type Formula,
  type Json,
  type Mutador,
  type Objeto,
} from './mutadores-de-formula'

const DE_VALOR = esTipo('input', 'constante', 'tabla', 'tramo', 'calculo')

// Cambia un nodo que cumple `filtro`.
const enNodo = (
  nombre: string,
  filtro: (n: Objeto) => boolean,
  cambio: (n: Objeto) => void,
): Mutador => ({
  nombre,
  aplicar: (f, azar) => {
    const yo = elegir(azar, nodosDe(f, filtro))
    if (!yo) return null
    cambio(yo.n)
    return `${nombre}(${idDe(yo.n)})`
  },
})

// Inserta un nodo con la forma completa salvo su defecto (sus referencias no importan: la forma va antes).
const conNodo = (nombre: string, nodo: Objeto): Mutador => ({
  nombre,
  aplicar: (f, azar) => {
    if (listaDe(f).length === 0) return null
    const j = azar.entero(listaDe(f).length + 1)
    insertar(f, j, structuredClone(nodo))
    return `${nombre}@${j}`
  },
})

// Cambia la definición, un grupo o params.
const enDefinicion = (nombre: string, cambio: (d: Objeto) => boolean): Mutador => ({
  nombre,
  aplicar: (f) => {
    const d = definicionDe(f)
    return d && cambio(d) ? nombre : null
  },
})
const enGrupo = (nombre: string, cambio: (g: Objeto) => void): Mutador => ({
  nombre,
  aplicar: (f, azar) => {
    const d = definicionDe(f)
    const g = elegir(azar, Array.isArray(d?.['grupos']) ? d['grupos'].filter(esObjeto) : [])
    if (!g) return null
    cambio(g)
    return `${nombre}(${idDe(g)})`
  },
})
const enParams = (nombre: string, cambio: (p: Objeto, f: Formula) => boolean): Mutador => ({
  nombre,
  aplicar: (f) => {
    const p = paramsDe(f)
    return p && cambio(p, f) ? nombre : null
  },
})

const opciones = [
  { clave: 'a', etiqueta: 'A', titulo: 'Opción A' },
  { clave: 'b', etiqueta: 'B', titulo: 'Opción B' },
]
const calculo = (op: string, resto: Objeto): Objeto => ({
  id: `mut_${op}`,
  tipo: 'calculo',
  op,
  etiqueta: 'Mutado',
  ...resto,
})
const tramo = (resto: Objeto): Objeto => ({
  id: 'mut_tramo',
  tipo: 'tramo',
  etiqueta: 'Mutado',
  tabla: 't',
  sobre: 'x',
  columna: 'c',
  ...resto,
})
const depreciar = (resto: Objeto) =>
  calculo('depreciar', { de: ['x'], tabla: 't', sobre: 'x', columna: 'c', ...resto })
const redondear = (n: Json) => calculo('redondear', { de: ['x'], n })
const largo = (n: number) => 'x'.repeat(n)

// La primera clave constante de params, o ninguna.
const constanteDe = (p: Objeto) => Object.keys(p).find((k) => k !== 'tablas')

const NODOS: Mutador[] = [
  {
    nombre: 'nodo_no_objeto',
    aplicar: (f) => (listaDe(f).length > 0 ? ((listaDe(f)[0] = 7), 'nodo_no_objeto') : null),
  }, // F01
  enNodo(
    'tipo_inexistente',
    () => true,
    (n) => (n['tipo'] = 'formula'),
  ), // F02
  enNodo(
    'op_inexistente',
    esOp('suma', 'multiplicar', 'porcentaje_de', 'restar'),
    (n) => (n['op'] = 'potencia'),
  ), // F03
  enNodo(
    'clave_desconocida',
    () => true,
    (n) => (n['solo_em'] = ['a']),
  ), // F04
  enNodo('tipo_cambio_con_solo_en', esTipo('tipo_cambio'), (n) => (n['solo_en'] = ['a'])), // F04
  enNodo('input_sobrescribible', esTipo('input'), (n) => (n['sobrescribible'] = true)), // F04
  enNodo(
    'id_con_mayuscula',
    () => true,
    (n) => (n['id'] = `X${idDe(n)}`),
  ), // F05
  enNodo(
    'id_numero',
    () => true,
    (n) => (n['id'] = 5),
  ), // F05
  conNodo('constante_tablas', { id: 'tablas', tipo: 'constante', etiqueta: 'Tablas' }), // F06
  enNodo(
    'sin_etiqueta',
    () => true,
    (n) => delete n['etiqueta'],
  ), // F07
  enNodo(
    'etiqueta_larga',
    () => true,
    (n) => (n['etiqueta'] = largo(81)),
  ), // F07
  enNodo(
    'formato_malo',
    () => true,
    (n) => (n['formato'] = 'eur'),
  ), // F08
  enNodo(
    'formato_nulo',
    () => true,
    (n) => (n['formato'] = null),
  ), // F08
  enNodo(
    'descripcion_larga',
    () => true,
    (n) => (n['descripcion'] = largo(301)),
  ), // F09
  enNodo(
    'seccion_vacia',
    () => true,
    (n) => (n['seccion'] = ''),
  ), // F10
  enNodo(
    'color_malo',
    () => true,
    (n) => (n['color'] = 'rojo'),
  ), // F11
  enNodo(
    'salida_mala',
    () => true,
    (n) => (n['salida'] = 'parcial'),
  ), // F12
  enNodo(
    'bucket_id_malo',
    () => true,
    (n) => (n['bucket'] = 'Origen'),
  ), // F13
  enNodo(
    'grupo_id_malo',
    () => true,
    (n) => (n['grupo'] = 'G 1'),
  ), // F14
  enNodo('solo_en_vacio', DE_VALOR, (n) => (n['solo_en'] = [])), // F15
  enNodo('solo_en_elemento_malo', DE_VALOR, (n) => (n['solo_en'] = ['Moto'])), // F16
  enNodo('condicion_mala', DE_VALOR, (n) => (n['condicion'] = 'Cond')), // F17
  conNodo('si_sin_condicion', calculo('si', { de: ['x'] })), // F17
  enNodo(
    'sobrescribible_texto',
    esTipo('tabla', 'tramo', 'calculo'),
    (n) => (n['sobrescribible'] = 'si'),
  ), // F18
  enNodo('texto_vacio', esTipo('constante', 'calculo'), (n) => (n['texto'] = '')), // F70
  enNodo('texto_largo', esTipo('constante', 'calculo'), (n) => (n['texto'] = largo(2001))), // F70
  enNodo('texto_no_texto', esTipo('constante', 'calculo'), (n) => (n['texto'] = 5)), // F70
  enNodo('texto_null', esTipo('constante', 'calculo'), (n) => (n['texto'] = null)), // F70
  enNodo('texto_en_input', esTipo('input'), (n) => (n['texto'] = '=a+b')), // F04
  enNodo('texto_en_tabla', esTipo('tabla'), (n) => (n['texto'] = '=a+b')), // F04
  enNodo('texto_en_tramo', esTipo('tramo'), (n) => (n['texto'] = '=a+b')), // F04
  enNodo('sugerido_de_malo', esTipo('input'), (n) => (n['sugerido_de'] = 'X')), // F19
  enNodo('requerido_si_malo', esTipo('input'), (n) => (n['requerido_si'] = 5)), // F20
  enNodo('clave_mala', esTipo('tipo_cambio'), (n) => (n['clave'] = 'Paralelo')), // F21
  enNodo('campo_malo', esTipo('campo_vehiculo'), (n) => (n['campo'] = 'Año')), // F22
  conNodo('opciones_una', {
    id: 'mut_opcion',
    tipo: 'opcion',
    etiqueta: 'V',
    opciones: opciones.slice(0, 1),
  }), // F23
  conNodo('opcion_sin_titulo', {
    id: 'mut_opcion',
    tipo: 'opcion',
    etiqueta: 'V',
    opciones: [opciones[0] ?? null, { clave: 'b', etiqueta: 'B' }],
  }), // F24
  conNodo('por_defecto_malo', {
    id: 'mut_opcion',
    tipo: 'opcion',
    etiqueta: 'V',
    opciones,
    por_defecto: 'A',
  }), // F25
  enNodo('tabla_mala', esTipo('tabla'), (n) => (n['tabla'] = 'Tabla')), // F26
  enNodo('match_no_objeto', esTipo('tabla'), (n) => (n['match'] = [])), // F27
  enNodo('match_valor_malo', esTipo('tabla'), (n) => (n['match'] = { anio: 'Año' })), // F28
  enNodo('columna_mala', esTipo('tabla'), (n) => (n['columna'] = '')), // F29
  conNodo('tramo_tabla_mala', tramo({ tabla: 5 })), // F30
  conNodo('tramo_sin_sobre', tramo({ sobre: null })), // F31
  conNodo('tramo_columna_mala', tramo({ columna: 'C' })), // F32
  conNodo('dividir_tres', calculo('dividir', { de: ['a', 'b', 'c'] })), // F33
  conNodo('multiplicar_uno', calculo('multiplicar', { de: ['a'] })), // F33
  enNodo('de_vacio', esOp('suma'), (n) => (n['de'] = [])), // F33
  enNodo('de_elemento_malo', esOp('suma', 'multiplicar', 'porcentaje_de'), (n) => {
    if (Array.isArray(n['de'])) n['de'][0] = 'A' // la aridad no cambia: lo atrapa sólo F34
  }), // F34
  enNodo('pct_falta', esOp('porcentaje_de'), (n) => delete n['pct']), // F35
  conNodo('depreciar_tabla_mala', depreciar({ tabla: 'T' })), // F36
  conNodo('depreciar_sin_sobre', depreciar({ sobre: '' })), // F37
  conNodo('depreciar_columna_mala', depreciar({ columna: 3 })), // F38
  conNodo('redondear_n_texto', redondear('3')), // F39
  conNodo('redondear_n_diminuto', redondear(1e-310)), // F40
  conNodo('redondear_n_grande', redondear(7)), // F41
  conNodo('redondear_n_decimal', redondear(2.5)), // F42
  conNodo('redondear_n_negativo', redondear(-1)), // F42
]

const DEFINICION: Mutador[] = [
  { nombre: 'definicion_lista', aplicar: (f) => ((f.definicion = []), 'definicion_lista') }, // F50
  enDefinicion('nodos_objeto', (d) => ((d['nodos'] = {}), true)), // F51
  enDefinicion('buckets_lista', (d) => d['buckets'] !== undefined && ((d['buckets'] = []), true)), // F53
  enDefinicion(
    'bucket_ninguno',
    (d) => esObjeto(d['buckets']) && ((d['buckets']['ninguno'] = 'tc_paralelo'), true),
  ), // F54
  enDefinicion(
    'bucket_valor_malo',
    (d) => esObjeto(d['buckets']) && ((d['buckets']['extra'] = 5), true),
  ), // F54
  enDefinicion('total_en_malo', (d) => ((d['total_en'] = 'TC'), true)), // F55
  enDefinicion('grupos_objeto', (d) => d['grupos'] !== undefined && ((d['grupos'] = {}), true)), // F56
  enGrupo('grupo_clave_extra', (g) => (g['color'] = 'verde')), // F57
  enGrupo('grupo_id_malo', (g) => (g['id'] = 'Compra')), // F58
  enGrupo('grupo_etiqueta_vacia', (g) => (g['etiqueta'] = '')), // F59
  enGrupo('grupo_plazo_vacio', (g) => (g['plazo'] = '')), // F60
  enGrupo('grupo_sin_tono', (g) => delete g['tono']), // F61
  enGrupo('grupo_bucket_malo', (g) => (g['bucket'] = 'Ext')), // F62
  enDefinicion('definicion_clave_extra', (d) => ((d['modo'] = 'aduana'), true)), // F63
]

const PARAMS: Mutador[] = [
  { nombre: 'params_lista', aplicar: (f) => ((f.params = []), 'params_lista') }, // F64
  enParams('tablas_lista', (p) => ((p['tablas'] = []), true)), // F65
  enParams('tabla_no_lista', (p) => ((p['tablas'] = { t: { anio: 2020 } }), true)), // F66
  enParams('tabla_clave_mala', (p) => ((p['tablas'] = { T: [] }), true)), // F66
  enParams('fila_no_objeto', (p) => ((p['tablas'] = { t: [5] }), true)), // F67
  enParams('celda_booleana', (p) => ((p['tablas'] = { t: [{ anio: true }] }), true)), // F68
  enParams('celda_larga', (p) => ((p['tablas'] = { t: [{ ruta: largo(201) }] }), true)), // F68
  enParams('param_texto', (p) => {
    const k = constanteDe(p)
    return k !== undefined && ((p[k] = 'x'), true)
  }), // F69
  enParams('param_nulo', (p) => {
    const k = constanteDe(p)
    return k !== undefined && ((p[k] = null), true)
  }), // F69
]

export const MUTADORES_DE_FORMA: readonly Mutador[] = [...NODOS, ...DEFINICION, ...PARAMS]
