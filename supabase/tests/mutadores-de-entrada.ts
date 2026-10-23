// Los mutadores del corpus diferencial de `evaluar_formula()` (`corpus-del-motor.ts`) que cambian la ENTRADA de una llamada: lo
// tipeado, los overrides, la variante, las banderas, los tipos de cambio, el vehículo y el modo, y su forma. Cada uno cambia la
// llamada en su lugar y devuelve qué hizo, o null si no se aplica a esa fórmula (no tiene variante, ni un par…). Cuáles son
// errores de llamada y cuáles datos que faltan lo dice el motor de TS (`esperado-del-motor.ts`), nunca el mutador.
import {
  elegir,
  esObjeto,
  esOp,
  esTipo,
  idDe,
  nodosDe,
  texto,
  type Azar,
  type Json,
  type Objeto,
} from './mutadores-de-formula'

export type Llamada = { definicion: Json; params: Json; entrada: Objeto; modo?: Json }
export type MutadorDelMotor = {
  nombre: string
  aplicar: (c: Llamada, azar: Azar) => string | null
}

// Números que cambian el resultado y números en el borde de la aritmética de dobles (JSON no guarda NaN ni infinitos).
export const NUMEROS = [
  0,
  1,
  -1,
  0.1,
  0.2,
  0.3,
  1.5,
  100,
  12345.678,
  1e-6,
  1e15,
  1e200,
  1e-200,
  1e308,
  -1e308,
  5e-324,
  2 ** 53,
  2.675,
  1.005,
  -2.5,
]
export const numero = (azar: Azar) => elegir(azar, NUMEROS) ?? 1

export function sub(c: Llamada, clave: string): Objeto {
  const x = c.entrada[clave]
  if (esObjeto(x)) return x
  const nuevo: Objeto = {}
  c.entrada[clave] = nuevo
  return nuevo
}

const sobrescribible = (n: Objeto) =>
  ['tabla', 'tramo', 'calculo'].includes(texto(n, 'tipo') ?? '') && n['sobrescribible'] === true
const fijo = (n: Objeto) =>
  ['tabla', 'tramo', 'calculo'].includes(texto(n, 'tipo') ?? '') && n['sobrescribible'] !== true
export const esPar = (n: Objeto) => esOp('porcentaje_de')(n) && n['sobrescribible'] === true
const soloSiNo =
  (...fs: ((n: Objeto) => boolean)[]) =>
  (n: Objeto) =>
    fs.some((f) => f(n))

export function nodo(
  c: Llamada,
  azar: Azar,
  filtro: (n: Objeto) => boolean = () => true,
): string | undefined {
  const n = elegir(azar, nodosDe(c, filtro))
  return n === undefined ? undefined : idDe(n.n)
}

export const m = (
  nombre: string,
  f: (c: Llamada, azar: Azar) => string | undefined | null,
): MutadorDelMotor => ({
  nombre,
  aplicar: (c, azar) => {
    const detalle = f(c, azar)
    return detalle === undefined || detalle === null ? null : `${nombre}(${detalle})`
  },
})

// Pone `valor` como override del nodo que elija `filtro`.
const override = (nombre: string, filtro: (n: Objeto) => boolean) =>
  m(nombre, (c, azar) => {
    const id = nodo(c, azar, filtro)
    if (id === undefined) return null
    const valor = numero(azar)
    sub(c, 'overrides')[id] = valor
    return `${id}=${String(valor)}`
  })

// Los nodos `de` de un par, para dejar su base en 0.
function basesDelPar(par: Objeto): string[] {
  const de = par['de']
  return Array.isArray(de) ? de.filter((x): x is string => typeof x === 'string') : []
}

const OPCIONES_DE = (c: Llamada) => {
  const op = nodosDe(c, esTipo('opcion'))[0]?.n['opciones']
  return Array.isArray(op)
    ? op.flatMap((o) => (esObjeto(o) && typeof o['clave'] === 'string' ? [o['clave']] : []))
    : []
}

export const MUTADORES_DE_ENTRADA: readonly MutadorDelMotor[] = [
  // Lo tipeado.
  m('input_sin_tipear', (c, azar) => {
    const k = elegir(azar, Object.keys(sub(c, 'inputs')))
    if (k === undefined) return null
    delete sub(c, 'inputs')[k]
    return k
  }),
  m('input_raro', (c, azar) => {
    const id = nodo(c, azar, esTipo('input'))
    if (id === undefined) return null
    const valor = numero(azar)
    sub(c, 'inputs')[id] = valor
    return `${id}=${String(valor)}`
  }),
  m('input_ajeno', (c, azar) => {
    const id = nodo(c, azar, (n) => !esTipo('input')(n))
    if (id === undefined) return null
    sub(c, 'inputs')[id] = 1
    return id
  }),
  // Los overrides, por tipo de nodo y por motivo de descarte.
  override('override_constante', esTipo('constante')),
  override('override_tipo_cambio', esTipo('tipo_cambio')),
  override('override_sugerido', sobrescribible),
  override('override_input', esTipo('input')),
  override('override_fijo', fijo),
  override('override_bandera_o_campo', soloSiNo(esTipo('bandera'), esTipo('campo_vehiculo'))),
  override('override_opcion', esTipo('opcion')),
  override('override_cualquiera', () => true),
  m('override_inexistente', (c, azar) => {
    const id = elegir(azar, ['a_b', 'ab', 'a1', 'zz', 'x9', 'q_q'])
    if (id === undefined || nodo(c, azar, (n) => idDe(n) === id) !== undefined) return null
    sub(c, 'overrides')[id] = numero(azar)
    return id
  }),
  m('override_tc_no_positivo', (c, azar) => {
    const id = nodo(c, azar, esTipo('tipo_cambio'))
    if (id === undefined) return null
    const valor = elegir(azar, [0, -3, 1e-300, 5e-324]) ?? 0
    sub(c, 'overrides')[id] = valor
    return `${id}=${String(valor)}`
  }),
  // El par porcentaje-monto: manda el monto, el pct o los dos; y con la base en 0.
  m('par_monto', (c, azar) => {
    const id = nodo(c, azar, esPar)
    if (id === undefined) return null
    sub(c, 'overrides')[id] = numero(azar)
    return id
  }),
  m('par_pct', (c, azar) => {
    const par = elegir(azar, nodosDe(c, esPar))
    const pct = par && texto(par.n, 'pct')
    if (!pct) return null
    sub(c, 'overrides')[pct] = elegir(azar, [0, 0.5, 0.25, 1e-9]) ?? 0
    return pct
  }),
  m('par_base_cero', (c, azar) => {
    const par = elegir(azar, nodosDe(c, esPar))
    if (!par) return null
    sub(c, 'overrides')[idDe(par.n)] = numero(azar)
    for (const base of basesDelPar(par.n)) {
      if (nodo(c, azar, (n) => idDe(n) === base && esTipo('input')(n)) !== undefined)
        sub(c, 'inputs')[base] = 0
      else sub(c, 'overrides')[base] = 0
    }
    return idDe(par.n)
  }),
  // La variante.
  m('variante_otra', (c, azar) => {
    const clave = elegir(azar, OPCIONES_DE(c))
    if (clave === undefined) return null
    c.entrada['variante'] = clave
    return clave
  }),
  m('variante_inexistente', (c) => {
    if (OPCIONES_DE(c).length === 0) return null
    c.entrada['variante'] = 'no_existe'
    return 'no_existe'
  }),
  m('variante_quitada', (c) => {
    if (OPCIONES_DE(c).length === 0 || c.entrada['variante'] === undefined) return null
    delete c.entrada['variante']
    return 'quitada'
  }),
  m('variante_sin_opcion', (c) => {
    if (OPCIONES_DE(c).length > 0) return null
    c.entrada['variante'] = 'a'
    return 'a'
  }),
  // Las banderas.
  m('bandera_cambiada', (c, azar) => {
    const id = nodo(c, azar, esTipo('bandera'))
    if (id === undefined) return null
    const b = sub(c, 'banderas')
    if (azar.entero(4) === 0) delete b[id]
    else b[id] = azar.entero(2) === 0
    return `${id}=${String(b[id])}`
  }),
  m('bandera_ajena', (c, azar) => {
    const id = nodo(c, azar, (n) => !esTipo('bandera')(n))
    if (id === undefined) return null
    sub(c, 'banderas')[id] = true
    return id
  }),
  // Los tipos de cambio.
  m('tc_falta', (c, azar) => {
    const k = elegir(azar, Object.keys(sub(c, 'tipos_cambio')))
    if (k === undefined) return null
    delete sub(c, 'tipos_cambio')[k]
    return k
  }),
  m('tc_extremo', (c, azar) => {
    const k = elegir(azar, Object.keys(sub(c, 'tipos_cambio')))
    if (k === undefined) return null
    const v = elegir(azar, [1e-300, 1e300, 5e-324, 1, 0.5, 1e-150, 1e150]) ?? 1
    sub(c, 'tipos_cambio')[k] = v
    return `${k}=${String(v)}`
  }),
  m('tc_no_positivo', (c, azar) => {
    const k = elegir(azar, Object.keys(sub(c, 'tipos_cambio')))
    if (k === undefined) return null
    sub(c, 'tipos_cambio')[k] = elegir(azar, [0, -1]) ?? 0
    return k
  }),
  // El vehículo.
  m('vehiculo_campo_falta', (c, azar) => {
    const k = elegir(azar, Object.keys(sub(c, 'vehiculo')))
    if (k === undefined) return null
    delete sub(c, 'vehiculo')[k]
    return k
  }),
  m('vehiculo_campo_cambiado', (c, azar) => {
    const k = elegir(azar, Object.keys(sub(c, 'vehiculo')))
    if (k === undefined) return null
    const v = elegir(azar, [null, 'texto', '2024', 2024, 0, -1, 1e308, 5e-324]) ?? null
    sub(c, 'vehiculo')[k] = v
    return `${k}=${JSON.stringify(v)}`
  }),
]
