// Los mutadores del corpus de `evaluar_formula()` (`corpus-del-motor.ts`) que cambian el MODO de tipo de cambio de la llamada y la
// FORMA de la entrada: lo que `esquemaModoDeCambio` y `esquemaEntrada` rechazan. El esperado, el primer campo que falla, lo dice
// el motor de TS (`esperado-del-motor.ts`).
import {
  elegir,
  esObjeto,
  esTipo,
  idDe,
  nodosDe,
  type Azar,
  type Json,
  type Objeto,
} from './mutadores-de-formula'
import { m, nodo, sub, type Llamada, type MutadorDelMotor } from './mutadores-de-entrada'

const definicion = (c: Llamada): Objeto | undefined =>
  esObjeto(c.definicion) ? c.definicion : undefined
const idsDe = (c: Llamada, filtro: (n: Objeto) => boolean) =>
  nodosDe(c, filtro).map(({ n }) => idDe(n))

// ---------------------------------------------------------------------------------------------------------------------------
// El modo: {buckets: {bucket: id de un tipo de cambio}, total_en}. Los buckets son los de la fórmula.
// ---------------------------------------------------------------------------------------------------------------------------
function modoValido(c: Llamada, azar: Azar): Objeto | null {
  const tcs = idsDe(c, esTipo('tipo_cambio'))
  const buckets = definicion(c)?.['buckets']
  const claves = esObjeto(buckets) ? Object.keys(buckets) : []
  if (tcs.length === 0 || claves.length === 0) return null
  const elegidos: Objeto = {}
  for (const k of claves) elegidos[k] = elegir(azar, tcs) ?? tcs[0] ?? ''
  return { buckets: elegidos, total_en: elegir(azar, tcs) ?? tcs[0] ?? '' }
}

const conModo = (
  nombre: string,
  cambiar: (modo: Objeto, c: Llamada, azar: Azar) => string | null,
) =>
  m(nombre, (c, azar) => {
    const modo = modoValido(c, azar)
    if (modo === null) return null
    const detalle = cambiar(modo, c, azar)
    if (detalle === null) return null
    c.modo = modo
    return detalle
  })

export const MUTADORES_DE_MODO: readonly MutadorDelMotor[] = [
  conModo('modo_valido', () => 'valido'),
  conModo('modo_bucket_no_tc', (modo, c, azar) => {
    const otro = nodo(c, azar, (n) => !esTipo('tipo_cambio')(n))
    const buckets = modo['buckets']
    const k = esObjeto(buckets) ? elegir(azar, Object.keys(buckets)) : undefined
    if (otro === undefined || k === undefined || !esObjeto(buckets)) return null
    buckets[k] = otro
    return `${k}=${otro}`
  }),
  conModo('modo_total_en_malo', (modo, c, azar) => {
    modo['total_en'] = nodo(c, azar, (n) => !esTipo('tipo_cambio')(n)) ?? 'no_existe'
    return String(modo['total_en'])
  }),
  conModo('modo_bucket_sin_cubrir', (modo, _c, azar) => {
    const buckets = modo['buckets']
    const k = esObjeto(buckets) ? elegir(azar, Object.keys(buckets)) : undefined
    if (k === undefined || !esObjeto(buckets)) return null
    delete buckets[k]
    return k
  }),
  conModo('modo_bucket_de_mas', (modo) => {
    const buckets = modo['buckets']
    if (!esObjeto(buckets)) return null
    buckets['de_mas'] = String(modo['total_en'])
    return 'de_mas'
  }),
  conModo('modo_id_inexistente', (modo, _c, azar) => {
    const buckets = modo['buckets']
    const k = esObjeto(buckets) ? elegir(azar, Object.keys(buckets)) : undefined
    if (k === undefined || !esObjeto(buckets)) return null
    buckets[k] = 'no_existe'
    return k
  }),
  // La forma del modo: lo que `esquemaModoDeCambio` rechaza.
  conModo('modo_forma', (modo, _c, azar) => {
    const cambios: (() => string)[] = [
      () => (delete modo['total_en'], 'sin_total_en'),
      () => (delete modo['buckets'], 'sin_buckets'),
      () => ((modo['extra'] = 1), 'clave_de_mas'),
      () => ((modo['buckets'] = { ninguno: String(modo['total_en']) }), 'bucket_ninguno'),
      () => ((modo['buckets'] = { b: 5 }), 'bucket_no_texto'),
      () => ((modo['total_en'] = 'Mal Id'), 'total_en_mal_id'),
      () => ((modo['buckets'] = []), 'buckets_no_objeto'),
    ]
    return elegir(azar, cambios)?.() ?? null
  }),
]

// ---------------------------------------------------------------------------------------------------------------------------
// La forma de la entrada: lo que `esquemaEntrada` rechaza. El primer campo que falla, en el orden del Zod, es el `donde`.
// ---------------------------------------------------------------------------------------------------------------------------
const CAMPOS = ['inputs', 'banderas', 'tipos_cambio', 'vehiculo', 'tablas', 'overrides']

export const MUTADORES_DE_FORMA_DE_ENTRADA: readonly MutadorDelMotor[] = [
  m('forma_campo_falta', (c, azar) => {
    const k = elegir(azar, CAMPOS)
    if (k === undefined) return null
    delete c.entrada[k]
    return k
  }),
  m('forma_clave_de_mas', (c) => {
    c.entrada['extra'] = 1
    return 'extra'
  }),
  m('forma_tipo_malo', (c, azar) => {
    const k = elegir(azar, [...CAMPOS, 'variante'])
    if (k === undefined) return null
    c.entrada[k] = elegir<Json>(azar, [[], 'x', null, 5, true]) ?? null
    return k
  }),
  m('forma_valor_malo', (c, azar) => {
    const k = elegir(azar, ['inputs', 'banderas', 'tipos_cambio', 'overrides', 'vehiculo'])
    if (k === undefined) return null
    const malo: Record<string, Json[]> = {
      inputs: ['5', null, true, [1]],
      banderas: [1, 'true', null],
      tipos_cambio: ['x', null, true, [1]],
      overrides: [null, '5', false],
      vehiculo: [true, [1], { a: 1 }],
    }
    sub(c, k)['clave_mala'] = elegir(azar, malo[k] ?? []) ?? null
    return k
  }),
  m('forma_id_malo', (c, azar) => {
    const k = elegir(
      azar,
      CAMPOS.filter((x) => x !== 'tablas'),
    )
    if (k === undefined) return null
    const clave = elegir(azar, ['Mayus', '1abc', 'con-guion', 'x'.repeat(42), '', 'a b']) ?? 'Mayus'
    sub(c, k)[clave] = k === 'banderas' ? true : 1
    return `${k}.${clave}`
  }),
  m('forma_variante_mala', (c, azar) => {
    c.entrada['variante'] = elegir<Json>(azar, [null, 5, 'Mal Id', '']) ?? null
    return 'variante'
  }),
  m('forma_vehiculo_largo', (c, azar) => {
    if (azar.entero(2) === 0) sub(c, 'vehiculo')['campo'] = 'x'.repeat(201)
    else sub(c, 'vehiculo')['a'.repeat(81)] = 1
    return 'vehiculo'
  }),
  m('forma_tabla_mala', (c, azar) => {
    const malas: Json[] = [{}, [1], [{ a: true }], [{ Mal: 1 }], [{ a: 'x'.repeat(201) }], 'x']
    sub(c, 'tablas')['t_mala'] = elegir(azar, malas) ?? {}
    return 'tablas'
  }),
]
