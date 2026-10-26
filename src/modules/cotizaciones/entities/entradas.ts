import type { CeldaDeHoja, InterruptorDeHoja, SeccionDeHoja, VarianteDeHoja } from './hoja'

// Lo que la persona tipeó en la hoja y se manda a recalcular (`cotizacion_evaluar`, paso 4.13-2): sólo lo que cambió. Es inmutable: cada cambio devuelve otro
// objeto, y la hoja guarda el último en un ref para que una pausa de tecleo mande lo más nuevo. Lo que se busca por id es un `Map` o un `Set` (un id como
// «constructor» es legal).
export type Entradas = {
  inputs: ReadonlyMap<string, number>
  // Las banderas encendidas: lo que no está, apagado.
  banderas: ReadonlySet<string>
  overrides: ReadonlyMap<string, number>
  // La clave elegida; nula, la que traiga la fórmula por defecto.
  variante: string | null
  // El chip que se pulsó de unos atajos (nodo → posición): con años que repiten el valor, cuatro chips valen lo mismo y sólo uno quedó pulsado.
  atajos: ReadonlyMap<string, number>
}

export const ENTRADAS_VACIAS: Entradas = {
  inputs: new Map(),
  banderas: new Set(),
  overrides: new Map(),
  variante: null,
  atajos: new Map(),
}

// La forma que acepta `cotizacion_evaluar()`: sólo estas cuatro claves, y la variante sólo si se eligió una.
export type EntradasDelPedido = {
  inputs: Record<string, number>
  banderas: Record<string, boolean>
  overrides: Record<string, number>
  variante?: string
}

export function entradasDelPedido(e: Entradas): EntradasDelPedido {
  return {
    inputs: Object.fromEntries(e.inputs),
    banderas: Object.fromEntries([...e.banderas].map((nodo) => [nodo, true])),
    overrides: Object.fromEntries(e.overrides),
    ...(e.variante === null ? {} : { variante: e.variante }),
  }
}

// ---------------------------------------------------------------------------------------------------------------------------------
// El índice de la hoja: qué es cada id que llega de una celda
// ---------------------------------------------------------------------------------------------------------------------------------
export type LadoDeCelda = { celda: CeldaDeHoja; lado: 'principal' | 'secundario' }

export type IndiceDeHoja = {
  // Por el id del nodo que dibuja la celda (el principal).
  celdas: ReadonlyMap<string, CeldaDeHoja>
  // Por el id de cualquiera de los dos lados de una celda.
  lados: ReadonlyMap<string, LadoDeCelda>
  interruptores: ReadonlyMap<string, InterruptorDeHoja>
  // Los nodos que se dibujan como franja de subtotal.
  subtotales: ReadonlySet<string>
  variante: VarianteDeHoja | null
  // Clave de una opción de la variante → su etiqueta.
  opciones: ReadonlyMap<string, string>
}

// Se arma una vez por hoja: un nodo se dibuja a lo sumo una vez («aparecer una vez», `docs/COTIZADOR.md` › «El diseño de la hoja»).
export function indiceDeHoja(secciones: readonly SeccionDeHoja[]): IndiceDeHoja {
  const celdas = new Map<string, CeldaDeHoja>()
  const lados = new Map<string, LadoDeCelda>()
  const interruptores = new Map<string, InterruptorDeHoja>()
  const subtotales = new Set<string>()
  const opciones = new Map<string, string>()
  let variante: VarianteDeHoja | null = null
  for (const seccion of secciones) {
    for (const item of seccion.items) {
      if (item.tipo === 'celda') {
        celdas.set(item.nodo, item)
        lados.set(item.nodo, { celda: item, lado: 'principal' })
        if (item.secundario) {
          lados.set(item.secundario.nodo, { celda: item, lado: 'secundario' })
        }
      } else if (item.tipo === 'interruptor') {
        interruptores.set(item.nodo, item)
      } else if (item.tipo === 'subtotal') {
        subtotales.add(item.nodo)
      } else if (item.tipo === 'variante') {
        variante = item
        for (const opcion of item.opciones) {
          opciones.set(opcion.clave, opcion.etiqueta)
        }
      }
    }
  }
  return { celdas, lados, interruptores, subtotales, variante, opciones }
}

// ---------------------------------------------------------------------------------------------------------------------------------
// Los cambios (cada uno devuelve otras entradas)
// ---------------------------------------------------------------------------------------------------------------------------------
function conValor(mapa: ReadonlyMap<string, number>, id: string, valor: number | null) {
  const nuevo = new Map(mapa)
  if (valor === null) {
    nuevo.delete(id)
  } else {
    nuevo.set(id, valor)
  }
  return nuevo
}

function sinClave(mapa: ReadonlyMap<string, number>, ...ids: string[]) {
  const nuevo = new Map(mapa)
  for (const id of ids) {
    nuevo.delete(id)
  }
  return nuevo
}

// Lo que la hoja sabe de cada nodo para decidir adónde va lo tipeado: el índice de la hoja. El porcentaje de un par casi siempre es una constante (va a `overrides`), pero también
// puede ser un input (va a `inputs`: un override sobre un input se descarta), y la lectura dice cuál es (`secundario.tipoDeNodo`, 4-31): no se adivina por una respuesta.
export type ContextoDeCambio = {
  indice: IndiceDeHoja
}

// Una celda confirmó un número (o vació el campo: null). Un input va a `inputs`; una constante, un tipo de cambio o un sobrescribible, a `overrides`.
// **El porcentaje de un par quita el override del monto:** si no, el monto manda y lo tipeado no se vería (`docs/COTIZADOR.md` › «El par porcentaje-monto»).
export function confirmar(
  e: Entradas,
  contexto: ContextoDeCambio,
  id: string,
  valor: number | null,
): Entradas {
  const dueno = contexto.indice.lados.get(id)
  if (!dueno) {
    return e
  }
  if (dueno.lado === 'secundario') {
    const comoInput = dueno.celda.secundario?.tipoDeNodo === 'input'
    return {
      ...e,
      inputs: comoInput ? conValor(e.inputs, id, valor) : e.inputs,
      overrides: sinClave(
        comoInput ? e.overrides : conValor(e.overrides, id, valor),
        dueno.celda.nodo,
      ),
    }
  }
  if (dueno.celda.tipoDeNodo === 'input') {
    return { ...e, inputs: conValor(e.inputs, id, valor) }
  }
  return { ...e, overrides: conValor(e.overrides, id, valor) }
}

// ↺: vuelve al default o al sugerido; en un par, los dos lados.
export function restablecer(e: Entradas, indice: IndiceDeHoja, id: string): Entradas {
  const celda = indice.celdas.get(id)
  if (!celda) {
    return e
  }
  return {
    ...e,
    overrides: sinClave(
      e.overrides,
      celda.nodo,
      ...(celda.secundario ? [celda.secundario.nodo] : []),
    ),
  }
}

export function alternarBandera(e: Entradas, nodo: string, encendida: boolean): Entradas {
  const banderas = new Set(e.banderas)
  if (encendida) {
    banderas.add(nodo)
  } else {
    banderas.delete(nodo)
  }
  return { ...e, banderas }
}

export function elegirVariante(e: Entradas, clave: string): Entradas {
  return { ...e, variante: clave }
}

// Un chip de unos atajos: su valor pasa a ser el override del nodo (o del porcentaje que la celda muestra), y se recuerda cuál fue.
export function elegirAtajo(
  e: Entradas,
  contexto: ContextoDeCambio,
  nodo: string,
  chip: { posicion: number; valor: number },
): Entradas {
  const confirmada = confirmar(e, contexto, nodo, chip.valor)
  const atajos = new Map(confirmada.atajos)
  atajos.set(nodo, chip.posicion)
  return { ...confirmada, atajos }
}
