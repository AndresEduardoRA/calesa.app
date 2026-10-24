// Los mutadores del corpus de `validar_diseno()` que rompen la tarjeta, los atajos, la cobertura y los tonos, y los que no rompen
// nada: cambian algo que el diseño admite, para que los defectos mezclados convivan con un diseño distinto y no sólo con el de siempre.
import { elegir, esObjeto, type Json, type Objeto } from './mutadores-de-formula'
import {
  deTipo,
  esNodo,
  idsDe,
  itemsDe,
  quitar,
  raiz,
  secciones,
  tarjeta,
  texto,
  type MutadorDeDiseno,
} from './mutadores-de-diseno-base'

const sinRetirar = (niveles: string[], retirados: string[]) =>
  niveles.filter((n) => !retirados.includes(n))

export const MUTADORES_DE_TARJETA: readonly MutadorDeDiseno[] = [
  {
    nombre: 'tarjeta_sobre_un_input',
    aplicar: (e, azar) => {
      const t = tarjeta(e)
      const nodo = elegir(
        azar,
        idsDe(e, (n) => texto(n, 'salida') !== 'total'),
      )
      if (!t || nodo === undefined) return null
      t['nodo'] = nodo
      return `tarjeta_sobre_un_input(${nodo})`
    },
  },
  {
    nombre: 'tarjeta_sobre_un_nodo_que_no_existe',
    aplicar: (e) => {
      const t = tarjeta(e)
      if (!t) return null
      t['nodo'] = 'zzz'
      return 'tarjeta_sobre_un_nodo_que_no_existe'
    },
  },
  {
    nombre: 'tarjeta_con_un_secundario_que_no_es_aparte',
    aplicar: (e, azar) => {
      const t = tarjeta(e)
      const nodo = elegir(
        azar,
        idsDe(e, (n) => texto(n, 'salida') !== 'aparte'),
      )
      if (!t || nodo === undefined) return null
      t['secundarios'] = [nodo]
      return `tarjeta_con_un_secundario_que_no_es_aparte(${nodo})`
    },
  },
  {
    nombre: 'tarjeta_con_un_secundario_repetido',
    aplicar: (e) => {
      const sec = tarjeta(e)?.['secundarios']
      const primero = Array.isArray(sec) ? sec[0] : undefined
      if (!Array.isArray(sec) || primero === undefined) return null
      sec.push(primero)
      return 'tarjeta_con_un_secundario_repetido'
    },
  },
  {
    nombre: 'tarjeta_con_un_secundario_que_no_existe',
    aplicar: (e) => {
      const t = tarjeta(e)
      if (!t) return null
      t['secundarios'] = ['zzz']
      return 'tarjeta_con_un_secundario_que_no_existe'
    },
  },
  {
    nombre: 'tarjeta_con_los_aparte',
    aplicar: (e) => {
      const t = tarjeta(e)
      const aparte = idsDe(e, (n) => texto(n, 'salida') === 'aparte')
      if (!t || aparte.length === 0) return null
      t['secundarios'] = aparte
      return 'tarjeta_con_los_aparte'
    },
  },
]

// La celda de un nodo con atajos toma otro nivel que el de su sección (que lo heredan los atajos): sólo el de editar, o el de ver y el de editar a la vez
// (un nivel de ver sin el de editar es otra regla, `editar_sin_ver`).
const atajosConOtroNivel = (nombre: string, conVer: boolean): MutadorDeDiseno => ({
  nombre,
  aplicar: (e, azar) => {
    const atajos = elegir(azar, itemsDe(e, deTipo('atajos')))
    const nivel = elegir(azar, sinRetirar(e.contexto.niveles, e.contexto.retirados))
    const celda = atajos
      ? itemsDe(e, (it) => deTipo('celda')(it) && it['nodo'] === atajos.it['nodo'])[0]
      : undefined
    if (!celda || nivel === undefined) return null
    if (conVer) celda.it['nivel_ver'] = nivel
    celda.it['nivel_editar'] = nivel
    return `${nombre}(${nivel})`
  },
})

export const MUTADORES_DE_COBERTURA: readonly MutadorDeDiseno[] = [
  {
    nombre: 'atajos_sin_celda',
    aplicar: (e, azar) => {
      const atajos = elegir(azar, itemsDe(e, deTipo('atajos')))
      const celda = atajos
        ? itemsDe(e, (it) => deTipo('celda')(it) && it['nodo'] === atajos.it['nodo'])[0]
        : undefined
      if (!celda) return null
      quitar(celda)
      return `atajos_sin_celda(${texto(celda.it, 'nodo') ?? '?'})`
    },
  },
  atajosConOtroNivel('atajos_con_otro_nivel_de_editar', false),
  atajosConOtroNivel('atajos_con_otro_nivel_de_ver_y_editar', true),
  {
    nombre: 'input_o_constante_sin_celda',
    aplicar: (e, azar) => {
      const entradas = new Set(idsDe(e, esNodo('input', 'constante')))
      const yo = elegir(
        azar,
        itemsDe(e, (it) => deTipo('celda')(it) && entradas.has(texto(it, 'nodo') ?? '')),
      )
      if (!yo) return null
      quitar(yo)
      return `input_o_constante_sin_celda(${texto(yo.it, 'nodo') ?? '?'})`
    },
  },
  {
    nombre: 'variante_sin_chips',
    aplicar: (e, azar) => {
      const yo = elegir(azar, itemsDe(e, deTipo('variante')))
      if (!yo) return null
      quitar(yo)
      return 'variante_sin_chips'
    },
  },
  {
    nombre: 'bandera_sin_interruptor',
    aplicar: (e, azar) => {
      const yo = elegir(azar, itemsDe(e, deTipo('interruptor')))
      if (!yo) return null
      quitar(yo)
      return `bandera_sin_interruptor(${texto(yo.it, 'nodo') ?? '?'})`
    },
  },
  {
    nombre: 'tono_quitado_del_contexto',
    aplicar: (e, azar) => {
      const usados = new Set(grupos(e).map((g) => texto(g, 'tono') ?? ''))
      const tono = elegir(
        azar,
        e.contexto.tonos.filter((t) => usados.has(t)),
      )
      if (tono === undefined) return null
      e.contexto.tonos = e.contexto.tonos.filter((t) => t !== tono)
      return `tono_quitado_del_contexto(${tono})`
    },
  },
]

function grupos(e: { definicion: Objeto }): Objeto[] {
  const g = e.definicion['grupos']
  return Array.isArray(g) ? g.filter(esObjeto) : []
}

// Los que no rompen nada.
export const MUTADORES_VALIDOS: readonly MutadorDeDiseno[] = [
  {
    nombre: 'ancho_distinto',
    aplicar: (e, azar) => {
      const yo = elegir(azar, itemsDe(e, deTipo('celda')))
      if (!yo) return null
      yo.it['ancho'] = elegir(azar, ['completo', 'mitad', 'tercio']) ?? 'mitad'
      return 'ancho_distinto'
    },
  },
  {
    nombre: 'presentacion_distinta',
    aplicar: (e, azar) => {
      const s = elegir(azar, secciones(e))
      if (!s) return null
      s['presentacion'] = s['presentacion'] === 'avanzado' ? 'principal' : 'avanzado'
      return 'presentacion_distinta'
    },
  },
  {
    nombre: 'titulo_valido',
    aplicar: (e, azar) => {
      const s = elegir(azar, secciones(e))
      if (!s) return null
      s['titulo'] = '😀'.repeat(1 + azar.entero(80))
      return 'titulo_valido'
    },
  },
  {
    nombre: 'ayuda_de_texto',
    aplicar: (e, azar) => {
      const yo = elegir(azar, itemsDe(e, deTipo('celda')))
      if (!yo) return null
      yo.it['ayuda'] = azar.entero(2) === 0 ? { texto: 'Mira la tabla' } : { tabla: 'una_tabla' }
      return 'ayuda_de_texto'
    },
  },
  {
    nombre: 'secundario_en_monto',
    aplicar: (e, azar) => {
      const yo = elegir(
        azar,
        itemsDe(e, (it) => deTipo('celda')(it) && it['secundario'] !== undefined),
      )
      if (!yo) return null
      yo.it['secundario'] = 'monto'
      return 'secundario_en_monto'
    },
  },
  {
    nombre: 'filas_de_atajos',
    aplicar: (e, azar) => {
      const yo = elegir(azar, itemsDe(e, deTipo('atajos')))
      if (!yo) return null
      yo.it['filas'] = 1 + azar.entero(12)
      return 'filas_de_atajos'
    },
  },
  {
    nombre: 'secciones_intercambiadas',
    aplicar: (e, azar) => {
      const lista = raiz(e)?.['secciones']
      if (!Array.isArray(lista) || lista.length < 2) return null
      const i = azar.entero(lista.length)
      const j = (i + 1 + azar.entero(lista.length - 1)) % lista.length
      const [a, b] = [lista[i], lista[j]] as [Json, Json]
      lista[i] = b
      lista[j] = a
      return `secciones_intercambiadas(${i},${j})`
    },
  },
  {
    nombre: 'ver_total_bs',
    aplicar: (e) => {
      const cab = raiz(e)?.['cabecera']
      if (!esObjeto(cab)) return null
      cab['ver_total_bs'] = cab['ver_total_bs'] !== true
      return 'ver_total_bs'
    },
  },
  {
    nombre: 'contexto_con_otro_nivel',
    aplicar: (e) => {
      e.contexto.niveles.push(`extra${String(e.contexto.niveles.length)}`)
      return 'contexto_con_otro_nivel'
    },
  },
]
