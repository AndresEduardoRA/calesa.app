// Los mutadores del corpus diferencial que rompen las reglas de los tipos de cambio, los buckets y los grupos (§6 de
// `validar_formula()`).
import {
  clonar,
  definicionDe,
  elegir,
  esObjeto,
  esOp,
  esTipo,
  idDe,
  insertar,
  listaDe,
  nodosDe,
  texto,
  totalDe,
  type Mutador,
  type Objeto,
} from './mutadores-de-formula'

const grupos = (d: Objeto | undefined): Objeto[] =>
  Array.isArray(d?.['grupos']) ? d['grupos'].filter(esObjeto) : []
const miembros = (n: Objeto) => texto(n, 'grupo') !== undefined

const CAMBIO: Mutador[] = [
  {
    nombre: 'clave_repetida',
    aplicar: (f, azar) => {
      const tc = nodosDe(f, esTipo('tipo_cambio'))
      const a = elegir(azar, tc)
      if (!a) return null
      const b = tc.find((x) => x.i !== a.i)
      if (b) {
        b.n['clave'] = texto(a.n, 'clave') ?? 'x'
        return `clave_repetida(${idDe(b.n)}=${idDe(a.n)})`
      }
      const copia = clonar(a.n)
      copia['id'] = 'tc_copia'
      insertar(f, a.i + 1 + azar.entero(listaDe(f).length - a.i), copia)
      return `clave_repetida(tc_copia=${idDe(a.n)})`
    },
  },
  {
    nombre: 'bucket_a_no_tc',
    aplicar: (f, azar) => {
      const buckets = definicionDe(f)?.['buckets']
      const b = esObjeto(buckets) ? elegir(azar, Object.keys(buckets)) : undefined
      const otro = elegir(
        azar,
        nodosDe(f, (n) => !esTipo('tipo_cambio')(n)),
      )
      if (!esObjeto(buckets) || b === undefined || !otro) return null
      buckets[b] = idDe(otro.n)
      return `bucket_a_no_tc(${b}=${idDe(otro.n)})`
    },
  },
  {
    nombre: 'total_en_a_no_tc',
    aplicar: (f, azar) => {
      const d = definicionDe(f)
      const otro = elegir(
        azar,
        nodosDe(f, (n) => !esTipo('tipo_cambio')(n)),
      )
      if (!d || d['total_en'] === undefined || !otro) return null
      d['total_en'] = idDe(otro.n)
      return `total_en_a_no_tc(${idDe(otro.n)})`
    },
  },
  {
    nombre: 'quitar_total_en',
    aplicar: (f) => {
      const d = definicionDe(f)
      if (!d || d['total_en'] === undefined) return null
      delete d['total_en']
      return 'quitar_total_en'
    },
  },
]

const GRUPOS: Mutador[] = [
  {
    nombre: 'grupo_repetido',
    aplicar: (f, azar) => {
      const d = definicionDe(f)
      const g = elegir(azar, grupos(d))
      if (!d || !g || !Array.isArray(d['grupos'])) return null
      d['grupos'].splice(azar.entero(d['grupos'].length + 1), 0, clonar(g))
      return `grupo_repetido(${idDe(g)})`
    },
  },
  {
    nombre: 'vaciar_grupo',
    aplicar: (f, azar) => {
      const g = elegir(azar, grupos(definicionDe(f)))
      if (!g) return null
      for (const { n } of nodosDe(f, (x) => texto(x, 'grupo') === idDe(g))) delete n['grupo']
      return `vaciar_grupo(${idDe(g)})`
    },
  },
  {
    nombre: 'grupo_bucket_inexistente',
    aplicar: (f, azar) => {
      const g = elegir(azar, grupos(definicionDe(f)))
      if (!g) return null
      g['bucket'] = 'no_hay'
      return `grupo_bucket_inexistente(${idDe(g)})`
    },
  },
  {
    nombre: 'grupo_inexistente',
    aplicar: (f, azar) => {
      if (grupos(definicionDe(f)).length === 0) return null
      const yo = elegir(azar, nodosDe(f, miembros))
      if (!yo) return null
      yo.n['grupo'] = 'no_existe'
      return `grupo_inexistente(${idDe(yo.n)})`
    },
  },
  {
    nombre: 'bucket_con_grupos',
    aplicar: (f, azar) => {
      const buckets = definicionDe(f)?.['buckets']
      const b = esObjeto(buckets) ? Object.keys(buckets)[0] : undefined
      const yo = elegir(azar, nodosDe(f))
      if (grupos(definicionDe(f)).length === 0 || b === undefined || !yo) return null
      yo.n['bucket'] = b
      return `bucket_con_grupos(${idDe(yo.n)})`
    },
  },
  {
    nombre: 'miembro_no_es_monto',
    aplicar: (f, azar) => {
      const g = elegir(azar, grupos(definicionDe(f)))
      if (!g) return null
      const deTipo = elegir(
        azar,
        nodosDe(f, esTipo('bandera', 'tipo_cambio', 'campo_vehiculo', 'opcion')),
      )
      // Un miembro que no es un par: el formato pct de un `porcentaje_de` lo rechaza antes `par_mal_tipado` (§5).
      const miembro = elegir(
        azar,
        nodosDe(f, (n) => miembros(n) && !esOp('porcentaje_de')(n)),
      )
      if (deTipo && azar.entero(2) === 0) {
        // Sin formato (usd): así lo rechaza sólo el tipo (daMonto), no el formato.
        delete deTipo.n['formato']
        deTipo.n['grupo'] = idDe(g)
        return `miembro_no_es_monto(${idDe(deTipo.n)} en ${idDe(g)})`
      }
      if (!miembro) return null
      miembro.n['formato'] = 'pct'
      return `miembro_no_es_monto(${idDe(miembro.n)} pct)`
    },
  },
  {
    nombre: 'miembro_con_salida',
    aplicar: (f, azar) => {
      const yo = elegir(azar, nodosDe(f, miembros))
      if (!yo) return null
      yo.n['salida'] = 'aparte'
      return `miembro_con_salida(${idDe(yo.n)})`
    },
  },
  {
    // Los dos defectos en el mismo miembro: rechaza `miembro_no_es_monto`, que va antes que `miembro_con_salida`.
    nombre: 'miembro_pct_con_salida',
    aplicar: (f, azar) => {
      const yo = elegir(
        azar,
        nodosDe(f, (n) => miembros(n) && !esOp('porcentaje_de')(n)),
      )
      if (!yo) return null
      yo.n['formato'] = 'pct'
      yo.n['salida'] = 'aparte'
      return `miembro_pct_con_salida(${idDe(yo.n)})`
    },
  },
  {
    // Un cálculo que suma un miembro entra a un grupo: lo contaría dos veces.
    nombre: 'doble_conteo',
    aplicar: (f, azar) => {
      const g = elegir(azar, grupos(definicionDe(f)))
      const ms = nodosDe(f, miembros)
      const yo = elegir(
        azar,
        nodosDe(f, esOp('suma', 'multiplicar')).filter(({ n }) => texto(n, 'salida') === undefined),
      )
      const leido =
        yo &&
        elegir(
          azar,
          ms.filter(({ i }) => i < yo.i),
        )
      if (!g || !yo || !leido || !Array.isArray(yo.n['de'])) return null
      yo.n['grupo'] = idDe(g)
      if (!yo.n['de'].includes(idDe(leido.n))) yo.n['de'].push(idDe(leido.n))
      return `doble_conteo(${idDe(yo.n)} suma ${idDe(leido.n)})`
    },
  },
  // Sin grupos: el bucket va en el nodo y el total se reparte.
  {
    nombre: 'bucket_inexistente',
    aplicar: (f, azar) => {
      if (grupos(definicionDe(f)).length > 0) return null
      const yo = elegir(azar, nodosDe(f))
      if (!yo) return null
      yo.n['bucket'] = 'no_hay'
      return `bucket_inexistente(${idDe(yo.n)})`
    },
  },
  {
    nombre: 'total_sin_bucket',
    aplicar: (f) => {
      const t = totalDe(f)
      if (grupos(definicionDe(f)).length > 0 || !t) return null
      delete t.n['bucket']
      const termino = Array.isArray(t.n['de']) ? t.n['de'][0] : undefined
      for (const { n } of nodosDe(f, (x) => idDe(x) === termino)) delete n['bucket']
      return `total_sin_bucket(${idDe(t.n)})`
    },
  },
]

export const MUTADORES_DE_GRUPOS: readonly Mutador[] = [...CAMBIO, ...GRUPOS]
