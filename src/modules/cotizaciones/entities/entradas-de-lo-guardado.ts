import { ENTRADAS_VACIAS, type Entradas, type IndiceDeHoja } from './entradas'
import type { TipoDeNodoDeHoja } from './hoja'
import type { LoGuardado } from './hoja-de-una-guardada'

// Lo que se sobrescribe con un override (`_cotizacion_entradas_de`, `base.sql:1450-1476`): lo demás es un input, una bandera, la variante o un dato del vehículo.
const SE_SOBRESCRIBEN: ReadonlySet<TipoDeNodoDeHoja> = new Set([
  'constante',
  'tipo_cambio',
  'tabla',
  'tramo',
  'calculo',
])

const numeroDe = (valor: number | string | null | undefined): number | null =>
  typeof valor === 'number' && Number.isFinite(valor) ? valor : null

// Qué se manda de un nodo guardado: un input tipeado (o sobrescrito) a `inputs`, un nodo que se sobrescribe a `overrides` y nada de lo demás.
function destinoDeUnNodo(
  tipo: TipoDeNodoDeHoja,
  fuente: string | undefined,
  valor: number | null,
): { en: 'inputs' | 'overrides'; valor: number } | null {
  if (tipo === 'input') {
    const tipeado = fuente === 'input' || fuente === 'override'
    return tipeado && valor !== null ? { en: 'inputs', valor } : null
  }
  if (!SE_SOBRESCRIBEN.has(tipo) || fuente !== 'override') {
    return null
  }
  // Un tipo de cambio sobrescrito entra aunque su valor no sea un número, con 0 (la base lo hace así).
  if (valor !== null) {
    return { en: 'overrides', valor }
  }
  return tipo === 'tipo_cambio' ? { en: 'overrides', valor: 0 } : null
}

// Lo tipeado y lo sobrescrito de lo guardado, lado por lado de las celdas (cada celda tiene su principal y, si es un par, su porcentaje).
function tipeadoYSobrescrito(indice: IndiceDeHoja, guardado: LoGuardado) {
  const inputs = new Map<string, number>()
  const overrides = new Map<string, number>()
  for (const [id, { celda, lado }] of indice.lados) {
    const tipo = lado === 'principal' ? celda.tipoDeNodo : celda.secundario?.tipoDeNodo
    // El porcentaje de un par cuyo monto está sobrescrito («pisado») no entra: el monto manda.
    const pisado = lado === 'secundario' && guardado.fuentes.get(celda.nodo) === 'override'
    if (tipo === undefined || pisado) {
      continue
    }
    const destino = destinoDeUnNodo(
      tipo,
      guardado.fuentes.get(id),
      numeroDe(guardado.valores.get(id)),
    )
    if (destino) {
      ;(destino.en === 'inputs' ? inputs : overrides).set(id, destino.valor)
    }
  }
  return { inputs, overrides }
}

// Las entradas con que abre la hoja de una guardada y con que se recalcula: **lo guardado**, el espejo de `_cotizacion_entradas_de` sobre lo que la hoja dibuja. Abrirla y guardarla sin
// tocar nada no cambia nada: un nodo editable que la hoja no manda queda «sin tipear» (`_cotizacion_conservar`, `base.sql:1371`), así que mandar menos borraría lo tipeado.
// Lo que la hoja no dibuja (lo oculto) no entra: la base lo conserva.
export function entradasDeLoGuardado(
  indice: IndiceDeHoja,
  guardado: LoGuardado,
  cotizacion: { modoTc: string | null },
): Entradas {
  const banderas = new Set<string>()
  for (const nodo of indice.interruptores.keys()) {
    if (guardado.valores.get(nodo) === 1) {
      banderas.add(nodo)
    }
  }
  const guardada = indice.variante ? guardado.valores.get(indice.variante.nodo) : undefined
  return {
    ...ENTRADAS_VACIAS,
    ...tipeadoYSobrescrito(indice, guardado),
    banderas,
    variante: typeof guardada === 'string' && indice.opciones.has(guardada) ? guardada : null,
    modoTc: cotizacion.modoTc,
  }
}
