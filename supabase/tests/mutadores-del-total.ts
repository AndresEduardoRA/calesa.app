// Los mutadores del corpus diferencial que rompen las reglas del total, de params y del par porcentaje-monto (§3 a §5 de
// `validar_formula()`).
import {
  DE_VALOR,
  elegir,
  esObjeto,
  esOp,
  esTipo,
  idDe,
  listaDe,
  nodosDe,
  paramsDe,
  texto,
  totalDe,
  type Mutador,
  type Objeto,
} from './mutadores-de-formula'

const total = totalDe
const pctDe = (lista: Objeto[], n: Objeto) => lista.find((x) => idDe(x) === texto(n, 'pct'))

// --- el total y params --------------------------------------------------------------------------------------------------------
const TOTAL_Y_PARAMS: Mutador[] = [
  {
    // Una clave de params mal escrita: la constante queda sin valor y la clave sin constante. Rechaza `constante_sin_valor`.
    nombre: 'param_renombrado',
    aplicar: (f, azar) => {
      const params = paramsDe(f)
      const clave = elegir(
        azar,
        Object.keys(params ?? {}).filter((k) => k !== 'tablas'),
      )
      if (!params || clave === undefined) return null
      params[`${clave}_x`] = params[clave] ?? 0
      delete params[clave]
      return `param_renombrado(${clave})`
    },
  },
  {
    nombre: 'quitar_total',
    aplicar: (f) => {
      const t = total(f)
      if (!t) return null
      delete t.n['salida']
      return `quitar_total(${idDe(t.n)})`
    },
  },
  {
    nombre: 'otro_total',
    aplicar: (f, azar) => {
      const yo = elegir(
        azar,
        nodosDe(f, (n) => texto(n, 'salida') !== 'total'),
      )
      if (!yo) return null
      yo.n['salida'] = 'total'
      return `otro_total(${idDe(yo.n)})`
    },
  },
  {
    nombre: 'total_fijo',
    aplicar: (f, azar) => {
      const t = total(f)
      if (!t || !esTipo(...DE_VALOR)(t.n)) return null
      const bandera = nodosDe(f, esTipo('bandera')).find(({ i }) => i < t.i)
      const opcion = nodosDe(f, esTipo('opcion')).find(({ i }) => i < t.i)
      const clave =
        opcion && Array.isArray(opcion.n['opciones']) ? opcion.n['opciones'][0] : undefined
      const formas: [string, () => void][] = []
      if (bandera) formas.push(['condicion', () => (t.n['condicion'] = idDe(bandera.n))])
      if (esObjeto(clave) && texto(clave, 'clave'))
        formas.push(['solo_en', () => (t.n['solo_en'] = [texto(clave, 'clave') ?? ''])])
      if (esTipo('tabla', 'tramo', 'calculo')(t.n))
        formas.push(['sobrescribible', () => (t.n['sobrescribible'] = true)])
      const forma = elegir(azar, formas)
      if (!forma) return null
      forma[1]()
      return `total_fijo(${idDe(t.n)}.${forma[0]})`
    },
  },
  {
    nombre: 'total_no_es_monto',
    aplicar: (f, azar) => {
      const t = total(f)
      if (!t) return null
      const base = { id: idDe(t.n), etiqueta: texto(t.n, 'etiqueta') ?? 'T', salida: 'total' }
      const nuevo = elegir<Objeto>(azar, [
        { ...base, tipo: 'tipo_cambio', clave: 'mutado', formato: 'raw' },
        { ...base, tipo: 'bandera' },
        { ...base, tipo: 'campo_vehiculo', campo: 'anio' },
        {
          ...base,
          tipo: 'opcion',
          opciones: [
            { clave: 'a', etiqueta: 'A', titulo: 'A' },
            { clave: 'b', etiqueta: 'B', titulo: 'B' },
          ],
        },
      ])
      if (!nuevo) return null
      listaDe(f)[t.i] = nuevo
      return `total_no_es_monto(${idDe(t.n)}→${texto(nuevo, 'tipo') ?? ''})`
    },
  },
  {
    nombre: 'quitar_param',
    aplicar: (f, azar) => {
      const params = paramsDe(f)
      const clave = elegir(
        azar,
        Object.keys(params ?? {}).filter((k) => k !== 'tablas'),
      )
      if (!params || clave === undefined) return null
      delete params[clave]
      return `quitar_param(${clave})`
    },
  },
  {
    nombre: 'param_extra',
    aplicar: (f, azar) => {
      const params = paramsDe(f)
      if (!params) return null
      const clave = elegir(azar, ['extra', 'flete_viejo', 'zz', 'a'])
      if (clave === undefined || clave in params) return null
      params[clave] = 1
      return `param_extra(${clave})`
    },
  },
]

const PARES: Mutador[] = [
  {
    nombre: 'pct_sin_formato',
    aplicar: (f, azar) => {
      const par = elegir(azar, nodosDe(f, esOp('porcentaje_de')))
      const pct =
        par &&
        pctDe(
          nodosDe(f).map(({ n }) => n),
          par.n,
        )
      if (!par || !pct) return null
      pct['formato'] = 'usd'
      return `pct_sin_formato(${idDe(par.n)}→${idDe(pct)})`
    },
  },
  {
    nombre: 'monto_pct',
    aplicar: (f, azar) => {
      const par = elegir(azar, nodosDe(f, esOp('porcentaje_de')))
      if (!par) return null
      par.n['formato'] = 'pct'
      return `monto_pct(${idDe(par.n)})`
    },
  },
  {
    // Un par sobrescribible cuyo pct no acepta un valor o no da un monto (o lo lee otro: pct_compartido).
    nombre: 'par_sobrescribible',
    aplicar: (f, azar) => {
      const par = elegir(
        azar,
        nodosDe(f, esOp('porcentaje_de')).filter(({ n }) => n['sobrescribible'] !== true),
      )
      if (!par) return null
      par.n['sobrescribible'] = true
      return `par_sobrescribible(${idDe(par.n)})`
    },
  },
  {
    nombre: 'pct_de_otro_tipo',
    aplicar: (f, azar) => {
      const par = elegir(azar, nodosDe(f, esOp('porcentaje_de')))
      if (!par) return null
      const otro = elegir(
        azar,
        nodosDe(f, esTipo('tipo_cambio', 'bandera', 'campo_vehiculo', 'tabla')).filter(
          ({ i }) => i < par.i,
        ),
      )
      if (!otro) return null
      par.n['sobrescribible'] = true
      par.n['pct'] = idDe(otro.n)
      otro.n['formato'] = 'pct'
      return `pct_de_otro_tipo(${idDe(par.n)}→${idDe(otro.n)})`
    },
  },
  {
    nombre: 'pct_compartido',
    aplicar: (f, azar) => {
      const par = elegir(azar, nodosDe(f, esOp('porcentaje_de')))
      const pct = par && texto(par.n, 'pct')
      if (!par || pct === undefined) return null
      const lector = elegir(
        azar,
        nodosDe(f, esOp('suma', 'multiplicar')).filter(({ i }) => i > par.i),
      )
      if (!lector || !Array.isArray(lector.n['de'])) return null
      par.n['sobrescribible'] = true
      lector.n['de'].push(pct)
      return `pct_compartido(${idDe(par.n)}.${pct} leído por ${idDe(lector.n)})`
    },
  },
]

export const MUTADORES_DEL_TOTAL: readonly Mutador[] = [...TOTAL_Y_PARAMS, ...PARES]
