// La variante elegida y el estado de cada nodo (docs/COTIZADOR.md › «La variante y el interruptor»). Se deciden en
// una pasada previa y lineal, antes de calcular nada: dependen sólo de la variante, del `solo_en` de cada nodo y de
// las banderas de la entrada. La misma pasada marca los grupos que se dibujan y el pct de cada par cuyo monto trae
// override. `evaluar_formula()` (4.06) la copia.
import { buscar, esta, recorrer, type Medidor } from './medidor'
import { sinValidar, type Estado, type Evaluacion } from './motor-contexto'
import { ErrorDelMotor } from './motor-errores'
import { condicionDe, soloEnDe, type Nodo, type NodoOpcion } from './nodos'

// La clave elegida: la de la entrada o, sin clave, la `por_defecto`. Elegir otra cosa es un error de llamada.
export function resolverVariante(
  opcion: NodoOpcion | undefined,
  pedida: string | undefined,
  m: Medidor,
): string | undefined {
  if (opcion === undefined) {
    if (pedida === undefined) return undefined
    throw invalida(`La entrada elige la variante «${pedida}», y la fórmula no tiene variante.`)
  }
  const clave = pedida ?? opcion.por_defecto
  if (clave === undefined) {
    throw invalida(
      `La variante «${opcion.id}» no tiene opción por defecto, y la entrada no elige una.`,
      opcion.id,
    )
  }
  for (const o of recorrer(opcion.opciones, m)) {
    if (o.clave === clave) return clave
  }
  throw invalida(`«${clave}» no es una opción de la variante «${opcion.id}».`, opcion.id)
}

// Una bandera fuera de su variante está apagada, aunque la entrada la traiga encendida.
export function decidirEstados(ev: Evaluacion): void {
  const encendidas = new Set<string>()
  for (const n of recorrer(ev.formula.definicion.nodos, ev.m)) {
    const estado = estadoDe(ev, n, encendidas)
    ev.estados.set(n.id, estado)
    if (
      n.tipo === 'bandera' &&
      estado === 'activo' &&
      buscar(ev.entrada.banderas, n.id, ev.m) === true
    ) {
      encendidas.add(n.id)
    }
    if (n.grupo !== undefined && estado !== 'fuera_de_variante') ev.dibujados.add(n.grupo)
    if (estado === 'activo') marcarPisado(ev, n)
  }
}

// El pct de un par activo cuyo monto trae override, si el pct también está activo, no se calcula: lo escribe el par
// con monto ÷ base (docs/COTIZADOR.md › «El par porcentaje-monto»). El pct va antes en la lista: su estado ya está.
function marcarPisado(ev: Evaluacion, n: Nodo): void {
  if (n.tipo !== 'calculo' || n.op !== 'porcentaje_de' || n.sobrescribible !== true) return
  if (buscar(ev.entrada.overrides, n.id, ev.m) === undefined) return
  if (buscar(ev.estados, n.pct, ev.m) === 'activo') ev.pisados.add(n.pct)
}

// Primero la variante, después la condición: un nodo fuera de su variante dice «Sólo en …».
function estadoDe(ev: Evaluacion, n: Nodo, encendidas: ReadonlySet<string>): Estado {
  const soloEn = soloEnDe(n)
  if (soloEn !== undefined && !estaEn(ev, soloEn, n.id)) return 'fuera_de_variante'
  const condicion = condicionDe(n)
  if (condicion !== undefined && !esta(encendidas, condicion, ev.m)) return 'condicion_apagada'
  return 'activo'
}

function estaEn(ev: Evaluacion, soloEn: readonly string[], quien: string): boolean {
  if (ev.variante === undefined)
    throw sinValidar('un nodo dice en qué variantes vale y no hay variante', quien)
  for (const clave of recorrer(soloEn, ev.m)) {
    if (clave === ev.variante) return true
  }
  return false
}

const invalida = (mensaje: string, donde?: string) =>
  new ErrorDelMotor('entrada_invalida', mensaje, donde)
