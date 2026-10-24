// Los mutadores del corpus diferencial de `validar_diseno()` que rompen una regla de los modos de tipo de cambio, de los niveles y de
// las secciones. Cada uno cambia la entrada en su lugar y devuelve qué hizo, o null si no se aplica a ese diseño.
import { elegir, esObjeto, type Azar, type Objeto } from './mutadores-de-formula'
import {
  deTipo,
  esNodo,
  idsDe,
  itemsDe,
  modos,
  objetos,
  raiz,
  secciones,
  texto,
  type Entrada,
  type MutadorDeDiseno,
} from './mutadores-de-diseno-base'

// --- modos --------------------------------------------------------------------------------------------------------------------
const unModo = (e: Entrada, azar: Azar) => elegir(azar, modos(e))
const unaEntrada = (m: Objeto, azar: Azar) => elegir(azar, objetos(m['buckets']))

export const MUTADORES_DE_MODOS: readonly MutadorDeDiseno[] = [
  {
    nombre: 'modo_clave_repetida',
    aplicar: (e, azar) => {
      const todos = modos(e)
      if (todos.length < 2) return null
      const i = 1 + azar.entero(todos.length - 1)
      const otro = todos[i]
      const primero = todos[0]
      if (!otro || !primero) return null
      otro['clave'] = primero['clave'] ?? null
      return `modo_clave_repetida(${texto(primero, 'clave') ?? '?'})`
    },
  },
  {
    nombre: 'modo_en_formula_sin_total_en',
    aplicar: (e) => {
      const cab = raiz(e)?.['cabecera']
      if (e.definicion['total_en'] !== undefined || !esObjeto(cab) || modos(e).length > 0)
        return null
      const tcs = idsDe(e, esNodo('tipo_cambio'))
      const buckets = e.definicion['buckets']
      const bucket = esObjeto(buckets) ? Object.keys(buckets)[0] : undefined
      const nodo = tcs[0]
      if (bucket === undefined || nodo === undefined) return null
      cab['modos'] = [
        { clave: 'extra', nombre: 'Extra', buckets: [{ bucket, nodo }], total_en: nodo },
      ]
      return 'modo_en_formula_sin_total_en'
    },
  },
  {
    nombre: 'modo_bucket_inexistente',
    aplicar: (e, azar) => {
      const m = unModo(e, azar)
      const b = m ? unaEntrada(m, azar) : undefined
      if (!b) return null
      b['bucket'] = 'zzz'
      return 'modo_bucket_inexistente'
    },
  },
  {
    nombre: 'modo_bucket_repetido',
    aplicar: (e, azar) => {
      const m = elegir(
        azar,
        modos(e).filter((x) => objetos(x['buckets']).length >= 2),
      )
      const bs = m ? objetos(m['buckets']) : []
      if (!m || !bs[0] || !bs[1]) return null
      bs[1]['bucket'] = bs[0]['bucket'] ?? null
      return 'modo_bucket_repetido'
    },
  },
  {
    nombre: 'modo_nodo_no_es_tipo_de_cambio',
    aplicar: (e, azar) => {
      const m = unModo(e, azar)
      const b = m ? unaEntrada(m, azar) : undefined
      const otros = idsDe(e, (n) => !esNodo('tipo_cambio')(n))
      if (!b) return null
      b['nodo'] = azar.entero(2) === 0 ? 'zzz' : (elegir(azar, otros) ?? 'zzz')
      return 'modo_nodo_no_es_tipo_de_cambio'
    },
  },
  {
    nombre: 'modo_total_en_no_es_tipo_de_cambio',
    aplicar: (e, azar) => {
      const m = unModo(e, azar)
      if (!m) return null
      m['total_en'] =
        elegir(
          azar,
          idsDe(e, (n) => !esNodo('tipo_cambio')(n)),
        ) ?? 'zzz'
      return 'modo_total_en_no_es_tipo_de_cambio'
    },
  },
  {
    nombre: 'modo_incompleto',
    aplicar: (e, azar) => {
      const m = elegir(
        azar,
        modos(e).filter((x) => objetos(x['buckets']).length >= 2),
      )
      const bs = m?.['buckets']
      if (!Array.isArray(bs)) return null
      bs.splice(azar.entero(bs.length), 1)
      return 'modo_incompleto'
    },
  },
]

// --- niveles y secciones --------------------------------------------------------------------------------------------------------
const unaCelda = (e: Entrada, azar: Azar) => elegir(azar, itemsDe(e, deTipo('celda')))

function nivelRetirado(donde: 'seccion' | 'celda'): MutadorDeDiseno {
  return {
    nombre: `nivel_retirado_de_${donde}`,
    aplicar: (e, azar) => {
      const nivel = elegir(azar, e.contexto.niveles) ?? 'costos'
      const objetivo = donde === 'seccion' ? elegir(azar, secciones(e)) : unaCelda(e, azar)?.it
      if (!objetivo) return null
      if (!e.contexto.niveles.includes(nivel)) e.contexto.niveles.push(nivel)
      if (!e.contexto.retirados.includes(nivel)) e.contexto.retirados.push(nivel)
      objetivo[azar.entero(2) === 0 ? 'nivel_ver' : 'nivel_editar'] = nivel
      return `nivel_retirado_de_${donde}(${nivel})`
    },
  }
}

export const MUTADORES_DE_SECCIONES: readonly MutadorDeDiseno[] = [
  {
    nombre: 'seccion_id_repetido',
    aplicar: (e, azar) => {
      const todas = secciones(e)
      if (todas.length < 2) return null
      const i = 1 + azar.entero(todas.length - 1)
      const [primera, otra] = [todas[0], todas[i]]
      if (!primera || !otra) return null
      otra['id'] = primera['id'] ?? null
      return `seccion_id_repetido(${texto(primera, 'id') ?? '?'})`
    },
  },
  {
    nombre: 'nivel_inexistente_de_seccion',
    aplicar: (e, azar) => {
      const s = elegir(azar, secciones(e))
      if (!s) return null
      s[azar.entero(2) === 0 ? 'nivel_ver' : 'nivel_editar'] = 'zzz'
      return 'nivel_inexistente_de_seccion'
    },
  },
  {
    nombre: 'nivel_inexistente_de_celda',
    aplicar: (e, azar) => {
      const c = unaCelda(e, azar)
      if (!c) return null
      c.it[azar.entero(2) === 0 ? 'nivel_ver' : 'nivel_editar'] = 'zzz'
      return 'nivel_inexistente_de_celda'
    },
  },
  nivelRetirado('seccion'),
  nivelRetirado('celda'),
  {
    nombre: 'nivel_quitado_del_contexto',
    aplicar: (e, azar) => {
      const usados = new Set<string>()
      for (const s of secciones(e)) {
        for (const c of ['nivel_ver', 'nivel_editar']) usados.add(texto(s, c) ?? '')
      }
      for (const { it } of itemsDe(e, deTipo('celda'))) {
        for (const c of ['nivel_ver', 'nivel_editar']) usados.add(texto(it, c) ?? '')
      }
      const nivel = elegir(
        azar,
        e.contexto.niveles.filter((n) => usados.has(n)),
      )
      if (nivel === undefined) return null
      e.contexto.niveles = e.contexto.niveles.filter((n) => n !== nivel)
      return `nivel_quitado_del_contexto(${nivel})`
    },
  },
  {
    nombre: 'nivel_a_una_seccion_valida',
    aplicar: (e, azar) => {
      const nivel = elegir(
        azar,
        e.contexto.niveles.filter((n) => !e.contexto.retirados.includes(n)),
      )
      const s = elegir(azar, secciones(e))
      if (nivel === undefined || !s) return null
      s['nivel_ver'] = nivel
      s['nivel_editar'] = nivel
      return `nivel_a_una_seccion_valida(${nivel})`
    },
  },
]
