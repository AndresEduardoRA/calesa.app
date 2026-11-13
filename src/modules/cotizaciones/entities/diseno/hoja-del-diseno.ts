// La hoja de la vista previa del diseño (4.22-5): lo que la hoja de cotizar dibujaría con el diseño que se está editando, armado en el navegador. Espeja `_cotizacion_hoja()`
// sin la parte de niveles, de `dato_del_vehiculo` ni de chips: la vista previa es la de quien lo ve todo (P4 a) y no lee tablas (P3 a). Puro y sin I/O; la hoja de verdad
// la arma la base y nada de aquí la reemplaza. Un ítem que apunta a un nodo que ya no existe se omite (`validarDiseno()` ya lo avisa en el editor).
import type { Tono } from '@/shared/ui/xcell'
import type { Diseno, ItemDeDiseno } from '../diseno'
import type { Definicion } from '../formula'
import type { DisenoDeHoja, ItemDeHoja, NodoDeTarjeta, SeccionDeHoja } from '../hoja'
import { condicionDe, soloEnDe, type Nodo } from '../nodos'

// Un nodo sin formato propio se dibuja en dólares, como `coalesce(formato, 'usd')` de la base.
const formatoDe = (n: Nodo) => n.formato ?? 'usd'

// Sólo un nodo de valor tiene los dos: los demás tipos no condicionan ni piden nada.
const requeridoSiDe = (n: Nodo): string | null =>
  n.tipo === 'input' ? (n.requerido_si ?? null) : null

const FICHA_VACIA = { editable: true, motivo: null } as const

function tonoDe(n: Nodo, tonosDeGrupo: ReadonlyMap<string, string>): string | null {
  return n.grupo === undefined ? null : (tonosDeGrupo.get(n.grupo) ?? null)
}

function celdaDe(
  item: Extract<ItemDeDiseno, { tipo: 'celda' }>,
  n: Nodo,
  nodos: ReadonlyMap<string, Nodo>,
  tonosDeGrupo: ReadonlyMap<string, string>,
): ItemDeHoja {
  const pct =
    item.secundario !== undefined && n.tipo === 'calculo' && n.op === 'porcentaje_de'
      ? nodos.get(n.pct)
      : undefined
  return {
    ...FICHA_VACIA,
    tipo: 'celda',
    nodo: n.id,
    etiqueta: n.etiqueta,
    tipoDeNodo: n.tipo,
    formato: formatoDe(n),
    ancho: item.ancho,
    tono: tonoDe(n, tonosDeGrupo),
    ajustes: false,
    ayuda: item.ayuda ?? null,
    datoDelVehiculo: null,
    soloEn: soloEnDe(n)?.slice() ?? null,
    condicion: condicionDe(n) ?? null,
    requeridoSi: requeridoSiDe(n),
    secundario:
      item.secundario !== undefined && pct !== undefined
        ? {
            ...FICHA_VACIA,
            nodo: pct.id,
            tipoDeNodo: pct.tipo,
            como: item.secundario,
            formato: formatoDe(pct),
            ajustes: false,
          }
        : null,
  }
}

function itemDe(
  item: ItemDeDiseno,
  nodos: ReadonlyMap<string, Nodo>,
  tonosDeGrupo: ReadonlyMap<string, string>,
): ItemDeHoja | null {
  const n = nodos.get(item.nodo)
  if (n === undefined) {
    return null
  }
  switch (item.tipo) {
    case 'celda':
      return celdaDe(item, n, nodos, tonosDeGrupo)
    case 'atajos':
      // Sin tablas no hay chips: la hoja no dibuja unos atajos vacíos.
      return { tipo: 'atajos', nodo: n.id, chips: [] }
    case 'variante':
      return n.tipo === 'opcion'
        ? {
            ...FICHA_VACIA,
            tipo: 'variante',
            nodo: n.id,
            etiqueta: n.etiqueta,
            opciones: n.opciones.map((o) => ({
              clave: o.clave,
              etiqueta: o.etiqueta,
              titulo: o.titulo,
            })),
            porDefecto: n.por_defecto ?? null,
          }
        : null
    case 'interruptor':
      return {
        ...FICHA_VACIA,
        tipo: 'interruptor',
        nodo: n.id,
        etiqueta: n.etiqueta,
        efecto: item.efecto,
        soloEn: soloEnDe(n)?.slice() ?? null,
      }
    case 'subtotal':
      return {
        tipo: 'subtotal',
        nodo: n.id,
        etiqueta: n.etiqueta,
        formato: formatoDe(n),
        tono: tonoDe(n, tonosDeGrupo),
      }
    default: {
      const _: never = item
      return _
    }
  }
}

const nodoDeTarjeta = (id: string, nodos: ReadonlyMap<string, Nodo>): NodoDeTarjeta | null => {
  const n = nodos.get(id)
  return n === undefined ? null : { nodo: n.id, etiqueta: n.etiqueta, formato: formatoDe(n) }
}

export type HojaDeLaVistaPrevia = DisenoDeHoja & { estado: 'lista' }

// `tonos` es el catálogo de la empresa: la hoja de verdad manda sólo los que sus celdas usan, y una clave que el catálogo no tenga se descarta (la celda cae al neutro).
export function hojaDeLaVistaPrevia(
  origen: { id: string; nombre: string },
  diseno: Diseno,
  definicion: Definicion,
  tonos: readonly Tono[],
): HojaDeLaVistaPrevia {
  const nodos = new Map(definicion.nodos.map((n) => [n.id, n]))
  const tonosDeGrupo = new Map((definicion.grupos ?? []).map((g) => [g.id, g.tono]))
  const secciones: SeccionDeHoja[] = diseno.secciones.flatMap((s) => {
    const items = s.items.flatMap((i) => itemDe(i, nodos, tonosDeGrupo) ?? [])
    return items.length === 0
      ? []
      : [{ id: s.id, titulo: s.titulo ?? null, presentacion: s.presentacion, items }]
  })
  const usados = new Set(
    secciones.flatMap((s) =>
      s.items.flatMap((i) =>
        (i.tipo === 'celda' || i.tipo === 'subtotal') && i.tono !== null ? [i.tono] : [],
      ),
    ),
  )
  const total = nodoDeTarjeta(diseno.tarjeta_total.nodo, nodos)
  return {
    estado: 'lista',
    origen,
    formula: { id: '', version: 0 },
    cabecera: {
      modos: diseno.cabecera.modos.map((m) => ({ clave: m.clave, nombre: m.nombre })),
      verTotalBs: diseno.cabecera.ver_total_bs,
      monedaBs: null,
    },
    secciones,
    tarjetaTotal: {
      nodo: total?.nodo ?? diseno.tarjeta_total.nodo,
      etiqueta: total?.etiqueta ?? '',
      formato: total?.formato ?? 'usd',
      secundarios: diseno.tarjeta_total.secundarios.flatMap((id) => nodoDeTarjeta(id, nodos) ?? []),
    },
    tonos: tonos.filter((t) => usados.has(t.clave)),
  }
}
