// §2 y §3 de `validarDiseno()`: las secciones, ítem por ítem, y la tarjeta del total. Un ítem se revisa entero, en el orden de la
// fila, antes del siguiente; lo que cruza ítems (dónde se dibuja cada nodo, los atajos) queda en el `Estado` para §4 y §5.
import { NIVEL_TODOS, type CeldaDeDiseno, type Diseno, type ItemDeDiseno } from './diseno'
import { buscar, esta, recorrer } from './medidor'
import { fallo, type FalloDeDiseno } from './motivos-de-diseno'
import type { Nodo } from './nodos'
import { revisarNivel, type Estado, type Indice } from './validar-diseno-contexto'

// Los niveles de una sección ya revisada: lo que un ítem hereda.
type Niveles = { ver: string; editar: string }

export function revisarSecciones(ix: Indice, d: Diseno, e: Estado): FalloDeDiseno | undefined {
  const vistas = new Set<string>()
  for (const s of recorrer(d.secciones, ix.m)) {
    if (esta(vistas, s.id, ix.m)) return fallo('seccion_duplicada', { donde: s.id })
    vistas.add(s.id)
    const r = revisarNivel(ix, s.nivel_ver, s.id) ?? revisarNivel(ix, s.nivel_editar, s.id)
    if (r !== undefined) return r
    const heredados = { ver: s.nivel_ver ?? NIVEL_TODOS, editar: s.nivel_editar ?? NIVEL_TODOS }
    for (const item of recorrer(s.items, ix.m)) {
      const rechazo = revisarItem(ix, e, item, heredados)
      if (rechazo !== undefined) return rechazo
    }
  }
  return undefined
}

function revisarItem(
  ix: Indice,
  e: Estado,
  item: ItemDeDiseno,
  sec: Niveles,
): FalloDeDiseno | undefined {
  const nodo = buscar(ix.nodos, item.nodo, ix.m)
  if (nodo === undefined) return fallo('nodo_inexistente', { donde: item.nodo })
  const propios =
    item.tipo === 'celda'
      ? { ver: item.nivel_ver ?? sec.ver, editar: item.nivel_editar ?? sec.editar }
      : sec
  const rechazo =
    revisarTipo(ix, item, nodo) ??
    (item.tipo === 'celda'
      ? (revisarNivel(ix, item.nivel_ver, nodo.id) ?? revisarNivel(ix, item.nivel_editar, nodo.id))
      : undefined) ??
    revisarNivelAbierto(item, nodo, propios.ver)
  return rechazo ?? registrar(ix, e, item, { nodo, propios, sec })
}

// Que el nodo sea de la clase que el ítem dibuja, en el orden de cada ítem.
function revisarTipo(ix: Indice, item: ItemDeDiseno, nodo: Nodo): FalloDeDiseno | undefined {
  const donde = nodo.id
  switch (item.tipo) {
    case 'celda':
      return revisarCelda(item, nodo)
    case 'atajos':
      if (nodo.tipo !== 'tabla') return fallo('atajos_no_es_tabla', { donde })
      return nodo.sobrescribible === true ? undefined : fallo('atajos_no_sobrescribible', { donde })
    case 'variante':
      return nodo.tipo === 'opcion' ? undefined : fallo('variante_no_es_opcion', { donde })
    case 'interruptor':
      if (nodo.tipo !== 'bandera') return fallo('interruptor_no_es_bandera', { donde })
      return interruptorHace(ix, item.efecto, nodo.id)
        ? undefined
        : fallo('interruptor_sin_efecto', { donde })
    case 'subtotal':
      return nodo.tipo === 'calculo' ? undefined : fallo('subtotal_no_es_calculo', { donde })
    default: {
      const _: never = item
      return _
    }
  }
}

function revisarCelda(item: CeldaDeDiseno, nodo: Nodo): FalloDeDiseno | undefined {
  const donde = nodo.id
  if (nodo.tipo === 'opcion' || nodo.tipo === 'bandera')
    return fallo('celda_no_es_valor', { donde })
  const esPorcentaje = nodo.tipo === 'calculo' && nodo.op === 'porcentaje_de'
  if (item.secundario !== undefined && !esPorcentaje) {
    return fallo('secundario_sin_porcentaje', { donde })
  }
  if (esPorcentaje && nodo.sobrescribible === true && item.secundario === undefined) {
    return fallo('par_sin_secundario', { donde })
  }
  return undefined
}

// «Habilita» apaga (deshabilita) lo que la bandera condiciona o pide; «muestra» sólo lo que condiciona.
function interruptorHace(ix: Indice, efecto: 'habilita' | 'muestra', bandera: string): boolean {
  if (esta(ix.condicionadas, bandera, ix.m)) return true
  return efecto === 'habilita' && esta(ix.requeridas, bandera, ix.m)
}

// El total, lo que va aparte y la variante los recibe todo el mundo: la base siempre manda el total y las salidas aparte (D7), y la
// variante titula el PDF, que sólo lleva lo del nivel «todos».
function revisarNivelAbierto(
  item: ItemDeDiseno,
  nodo: Nodo,
  ver: string,
): FalloDeDiseno | undefined {
  const cerrado =
    item.tipo === 'variante' ||
    ((item.tipo === 'celda' || item.tipo === 'subtotal') &&
      (nodo.salida === 'total' || nodo.salida === 'aparte'))
  return cerrado && ver !== NIVEL_TODOS ? fallo('nivel_no_admitido', { donde: nodo.id }) : undefined
}

// Anota dónde se dibuja el valor del nodo (y el del porcentaje de un par); un segundo dibujo es `nodo_repetido`.
type Dibujo = { nodo: Nodo; propios: Niveles; sec: Niveles }

function registrar(
  ix: Indice,
  e: Estado,
  item: ItemDeDiseno,
  dibujo: Dibujo,
): FalloDeDiseno | undefined {
  const { nodo, propios, sec } = dibujo
  if (item.tipo === 'atajos') {
    if (esta(e.atajosVistos, nodo.id, ix.m)) return fallo('nodo_repetido', { donde: nodo.id })
    e.atajosVistos.add(nodo.id)
    e.atajos.push({ nodo: nodo.id, ver: sec.ver, editar: sec.editar })
    return undefined
  }
  if (buscar(e.apariciones, nodo.id, ix.m) !== undefined) {
    return fallo('nodo_repetido', { donde: nodo.id })
  }
  e.apariciones.set(nodo.id, { ...propios })
  if (item.tipo === 'celda' && item.secundario !== undefined && nodo.tipo === 'calculo') {
    if (nodo.op !== 'porcentaje_de') return undefined
    if (buscar(e.apariciones, nodo.pct, ix.m) !== undefined) {
      return fallo('nodo_repetido', { donde: nodo.pct })
    }
    e.apariciones.set(nodo.pct, { ...propios })
  }
  return undefined
}

// §3 la tarjeta: el total y sus secundarios (la garantía), que repiten lo que la hoja ya dibuja.
export function revisarTarjeta(ix: Indice, d: Diseno): FalloDeDiseno | undefined {
  const total = buscar(ix.nodos, d.tarjeta_total.nodo, ix.m)
  if (total === undefined) return fallo('nodo_inexistente', { donde: d.tarjeta_total.nodo })
  if (total.salida !== 'total') return fallo('tarjeta_no_es_el_total', { donde: total.id })
  const vistos = new Set<string>()
  for (const id of recorrer(d.tarjeta_total.secundarios, ix.m)) {
    const nodo = buscar(ix.nodos, id, ix.m)
    if (nodo === undefined) return fallo('nodo_inexistente', { donde: id })
    if (nodo.salida !== 'aparte') return fallo('tarjeta_secundario_no_es_aparte', { donde: id })
    if (esta(vistos, id, ix.m)) return fallo('nodo_repetido', { donde: id })
    vistos.add(id)
  }
  return undefined
}
