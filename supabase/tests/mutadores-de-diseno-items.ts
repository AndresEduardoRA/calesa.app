// Los mutadores del corpus diferencial de `validar_diseno()` que rompen una regla de los ítems: lo que cada uno dibuja, su nivel y que
// un nodo no se dibuje dos veces. Cada uno cambia la entrada en su lugar y devuelve qué hizo, o null si no se aplica a ese diseño.
import { elegir } from './mutadores-de-formula'
import {
  celdaDe,
  clonar,
  deTipo,
  esNodo,
  idsDe,
  itemsDe,
  nodosDeFormula,
  otraSeccion,
  poner,
  porcentajeDe,
  raiz,
  secciones,
  texto,
  type Entrada,
  type MutadorDeDiseno,
} from './mutadores-de-diseno-base'

// --- ítems ------------------------------------------------------------------------------------------------------------------------
const cambiarNodo = (
  nombre: string,
  tipo: string,
  ids: (e: Entrada) => string[],
): MutadorDeDiseno => ({
  nombre,
  aplicar: (e, azar) => {
    const yo = elegir(azar, itemsDe(e, deTipo(tipo)))
    const nodo = elegir(azar, ids(e))
    if (!yo || nodo === undefined) return null
    yo.it['nodo'] = nodo
    return `${nombre}(${nodo})`
  },
})
const entradas = (e: Entrada) => idsDe(e, esNodo('input', 'constante'))

export const MUTADORES_DE_ITEMS: readonly MutadorDeDiseno[] = [
  {
    nombre: 'item_nodo_inexistente',
    aplicar: (e, azar) => {
      const yo = elegir(azar, itemsDe(e))
      if (!yo) return null
      yo.it['nodo'] = 'zzz'
      return 'item_nodo_inexistente'
    },
  },
  {
    nombre: 'celda_de_la_variante_o_una_bandera',
    aplicar: (e, azar) => {
      const nodo = elegir(azar, idsDe(e, esNodo('opcion', 'bandera')))
      const s = elegir(azar, secciones(e))
      if (nodo === undefined || !s) return null
      poner(s, celdaDe(nodo))
      return `celda_de_la_variante_o_una_bandera(${nodo})`
    },
  },
  {
    nombre: 'secundario_sin_porcentaje',
    aplicar: (e, azar) => {
      const ids = new Set(idsDe(e, (n) => !porcentajeDe(n)))
      const yo = elegir(
        azar,
        itemsDe(e, (it) => deTipo('celda')(it) && ids.has(texto(it, 'nodo') ?? '')),
      )
      if (!yo) return null
      yo.it['secundario'] = azar.entero(2) === 0 ? 'porcentaje' : 'monto'
      return 'secundario_sin_porcentaje'
    },
  },
  {
    nombre: 'par_sin_secundario',
    aplicar: (e, azar) => {
      const pares = new Set(idsDe(e, (n) => porcentajeDe(n) && n['sobrescribible'] === true))
      const yo = elegir(
        azar,
        itemsDe(e, (it) => deTipo('celda')(it) && pares.has(texto(it, 'nodo') ?? '')),
      )
      if (!yo) return null
      delete yo.it['secundario']
      return 'par_sin_secundario'
    },
  },
  cambiarNodo('atajos_sobre_un_nodo_que_no_es_tabla', 'atajos', (e) =>
    idsDe(e, (n) => !esNodo('tabla')(n)),
  ),
  {
    nombre: 'atajos_sobre_una_tabla_fija',
    aplicar: (e, azar) => {
      const nodo = elegir(
        azar,
        idsDe(e, (n) => esNodo('tabla')(n) && n['sobrescribible'] !== true),
      )
      const s = elegir(azar, secciones(e))
      if (nodo === undefined || !s) return null
      poner(s, { tipo: 'atajos', nodo, columna: 'anio', filas: 5 })
      return `atajos_sobre_una_tabla_fija(${nodo})`
    },
  },
  cambiarNodo('variante_sobre_un_input', 'variante', entradas),
  cambiarNodo('interruptor_sobre_un_input', 'interruptor', entradas),
  cambiarNodo('subtotal_sobre_un_input', 'subtotal', entradas),
  {
    nombre: 'interruptor_de_una_bandera_sin_lectores',
    aplicar: (e, azar) => {
      const leidas = new Set<string>()
      for (const n of nodosDeFormula(e)) {
        for (const c of ['condicion', 'requerido_si']) leidas.add(texto(n, c) ?? '')
      }
      const nodo = elegir(
        azar,
        idsDe(e, (n) => esNodo('bandera')(n) && !leidas.has(texto(n, 'id') ?? '')),
      )
      const s = elegir(azar, secciones(e))
      if (nodo === undefined || !s) return null
      poner(s, { tipo: 'interruptor', nodo, efecto: 'habilita' })
      return `interruptor_de_una_bandera_sin_lectores(${nodo})`
    },
  },
  {
    nombre: 'efecto_muestra_sobre_una_bandera_que_solo_pide',
    aplicar: (e, azar) => {
      const piden = new Set<string>()
      const condicionan = new Set<string>()
      for (const n of nodosDeFormula(e)) {
        if (texto(n, 'requerido_si') !== undefined) piden.add(texto(n, 'requerido_si') ?? '')
        if (texto(n, 'condicion') !== undefined) condicionan.add(texto(n, 'condicion') ?? '')
      }
      const yo = elegir(
        azar,
        itemsDe(e, (it) => {
          const nodo = texto(it, 'nodo') ?? ''
          return deTipo('interruptor')(it) && piden.has(nodo) && !condicionan.has(nodo)
        }),
      )
      if (!yo) return null
      yo.it['efecto'] = 'muestra'
      return 'efecto_muestra_sobre_una_bandera_que_solo_pide'
    },
  },
  {
    nombre: 'nivel_a_la_variante',
    aplicar: (e, azar) => {
      const yo = elegir(azar, itemsDe(e, deTipo('variante')))
      const nivel = elegir(
        azar,
        e.contexto.niveles.filter((n) => !e.contexto.retirados.includes(n)),
      )
      if (!yo || nivel === undefined) return null
      yo.s['nivel_ver'] = nivel
      return `nivel_a_la_variante(${nivel})`
    },
  },
  {
    nombre: 'celda_del_total_con_nivel',
    aplicar: (e, azar) => {
      const total = elegir(
        azar,
        idsDe(e, (n) => texto(n, 'salida') === 'total'),
      )
      const nivel = elegir(
        azar,
        e.contexto.niveles.filter((n) => !e.contexto.retirados.includes(n)),
      )
      const s = raiz(e)?.['secciones']
      if (total === undefined || nivel === undefined || !Array.isArray(s)) return null
      s.push({
        id: 'resumen',
        presentacion: 'principal',
        nivel_ver: nivel,
        items: [celdaDe(total)],
      })
      return `celda_del_total_con_nivel(${nivel})`
    },
  },
  {
    nombre: 'celda_de_lo_aparte_con_nivel',
    aplicar: (e, azar) => {
      const aparte = new Set(idsDe(e, (n) => texto(n, 'salida') === 'aparte'))
      const yo = elegir(
        azar,
        itemsDe(e, (it) => deTipo('celda')(it) && aparte.has(texto(it, 'nodo') ?? '')),
      )
      const nivel = elegir(
        azar,
        e.contexto.niveles.filter((n) => !e.contexto.retirados.includes(n)),
      )
      if (!yo || nivel === undefined) return null
      yo.it['nivel_ver'] = nivel
      return `celda_de_lo_aparte_con_nivel(${nivel})`
    },
  },
  {
    nombre: 'nodo_dibujado_dos_veces',
    aplicar: (e, azar) => {
      const yo = elegir(azar, itemsDe(e, deTipo('celda', 'subtotal', 'variante', 'interruptor')))
      const s = yo ? otraSeccion(e, azar) : undefined
      if (!yo || !s) return null
      poner(s, clonar(yo.it))
      return `nodo_dibujado_dos_veces(${texto(yo.it, 'nodo') ?? '?'})`
    },
  },
  {
    nombre: 'atajos_dos_veces',
    aplicar: (e, azar) => {
      const yo = elegir(azar, itemsDe(e, deTipo('atajos')))
      const s = yo ? otraSeccion(e, azar) : undefined
      if (!yo || !s) return null
      poner(s, clonar(yo.it))
      return `atajos_dos_veces(${texto(yo.it, 'nodo') ?? '?'})`
    },
  },
  {
    nombre: 'porcentaje_dos_veces',
    aplicar: (e, azar) => {
      const pcts = new Map<string, string>()
      for (const n of nodosDeFormula(e, porcentajeDe)) {
        pcts.set(texto(n, 'id') ?? '', texto(n, 'pct') ?? '')
      }
      const yo = elegir(
        azar,
        itemsDe(e, (it) => deTipo('celda')(it) && it['secundario'] !== undefined),
      )
      const pct = yo ? pcts.get(texto(yo.it, 'nodo') ?? '') : undefined
      const s = elegir(azar, secciones(e))
      if (!yo || pct === undefined || !s) return null
      poner(s, celdaDe(pct))
      return `porcentaje_dos_veces(${pct})`
    },
  },
]
