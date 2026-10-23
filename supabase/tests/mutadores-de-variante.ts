// Los mutadores del corpus diferencial que rompen las reglas de la variante (§7 de `validar_formula()`: `opcion` y `solo_en`).
import {
  clonar,
  elegir,
  esObjeto,
  esTipo,
  idDe,
  insertar,
  listaDe,
  nodosDe,
  texto,
  type Formula,
  type Mutador,
  type Objeto,
} from './mutadores-de-formula'

const opcionDe = (f: Formula) => nodosDe(f, esTipo('opcion'))[0]
const opcionesDe = (n: Objeto): Objeto[] =>
  Array.isArray(n['opciones']) ? n['opciones'].filter(esObjeto) : []

// Un nodo con `solo_en` y sin referencias, movido justo antes de la variante: lo rechaza `solo_en` (§7), no §2.
const sinRefs = (n: Objeto) =>
  ['de', 'pct', 'sobre', 'condicion', 'sugerido_de', 'requerido_si', 'match'].every(
    (k) => n[k] === undefined,
  )

export const MUTADORES_DE_VARIANTE: readonly Mutador[] = [
  {
    nombre: 'solo_en_antes_de_variante',
    aplicar: (f, azar) => {
      const v = opcionDe(f)
      const yo =
        v &&
        elegir(
          azar,
          nodosDe(f, (n) => Array.isArray(n['solo_en']) && sinRefs(n)).filter(({ i }) => i > v.i),
        )
      if (!v || !yo) return null
      const lista = listaDe(f)
      lista.splice(yo.i, 1)
      lista.splice(v.i, 0, yo.n)
      return `solo_en_antes_de_variante(${idDe(yo.n)})`
    },
  },
  {
    // Una segunda variante con una clave repetida: rechaza `opcion_repetida`, antes que mirar sus claves.
    nombre: 'segunda_variante_mala',
    aplicar: (f) => {
      const v = opcionDe(f)
      if (!v) return null
      const copia = clonar(v.n)
      copia['id'] = 'variante_bis'
      const [a, b] = opcionesDe(copia)
      if (!a || !b) return null
      b['clave'] = texto(a, 'clave') ?? 'x'
      insertar(f, v.i + 1, copia)
      return 'segunda_variante_mala'
    },
  },
  {
    // La primera variante con una clave repetida y una segunda: rechaza la clave de la primera, que se ve antes.
    nombre: 'primera_variante_mala_y_otra',
    aplicar: (f) => {
      const v = opcionDe(f)
      const [a, b] = v ? opcionesDe(v.n) : []
      if (!v || !a || !b) return null
      const copia = clonar(v.n)
      copia['id'] = 'variante_bis'
      b['clave'] = texto(a, 'clave') ?? 'x'
      insertar(f, v.i + 1, copia)
      return 'primera_variante_mala_y_otra'
    },
  },
  {
    nombre: 'opcion_repetida',
    aplicar: (f, azar) => {
      const v = opcionDe(f)
      if (!v) return null
      const copia = clonar(v.n)
      copia['id'] = 'variante_bis'
      insertar(f, v.i + 1 + azar.entero(listaDe(f).length - v.i), copia)
      return 'opcion_repetida(variante_bis)'
    },
  },
  {
    nombre: 'opcion_clave_repetida',
    aplicar: (f, azar) => {
      const v = opcionDe(f)
      const ops = v ? opcionesDe(v.n) : []
      const [a, b] = [elegir(azar, ops), elegir(azar, ops)]
      if (!a || !b || a === b) return null
      b['clave'] = texto(a, 'clave') ?? 'x'
      return `opcion_clave_repetida(${texto(a, 'clave') ?? ''})`
    },
  },
  {
    nombre: 'por_defecto_inexistente',
    aplicar: (f) => {
      const v = opcionDe(f)
      if (!v) return null
      v.n['por_defecto'] = 'no_hay'
      return 'por_defecto_inexistente'
    },
  },
  {
    nombre: 'quitar_variante',
    aplicar: (f) => {
      const v = opcionDe(f)
      if (!v) return null
      listaDe(f).splice(v.i, 1)
      return `quitar_variante(${idDe(v.n)})`
    },
  },
  {
    nombre: 'solo_en_inexistente',
    aplicar: (f, azar) => {
      const yo = elegir(
        azar,
        nodosDe(f, (n) => Array.isArray(n['solo_en'])),
      )
      if (!yo || !Array.isArray(yo.n['solo_en'])) return null
      yo.n['solo_en'].push('no_hay')
      return `solo_en_inexistente(${idDe(yo.n)})`
    },
  },
  {
    nombre: 'variante_al_final',
    aplicar: (f) => {
      const v = opcionDe(f)
      const lista = listaDe(f)
      if (!v || v.i === lista.length - 1) return null
      lista.splice(v.i, 1)
      lista.push(v.n)
      return 'variante_al_final'
    },
  },
  {
    nombre: 'solo_en_sin_variante',
    aplicar: (f, azar) => {
      if (opcionDe(f)) return null
      const yo = elegir(
        azar,
        nodosDe(f, esTipo('input', 'constante', 'tabla', 'calculo', 'bandera')),
      )
      if (!yo || texto(yo.n, 'salida') === 'total') return null
      yo.n['solo_en'] = ['moto']
      return `solo_en_sin_variante(${idDe(yo.n)})`
    },
  },
]
