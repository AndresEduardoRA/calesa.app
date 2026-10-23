// El valor de cada tipo de nodo y su fuente (docs/COTIZADOR.md › «El motor»). El estado, decidido antes
// (`motor-estados.ts`), manda: un nodo fuera de su variante o con su condición apagada vale 0 sin leer sus referencias
// (ahí un null no se propaga) y descarta su override. Después, el override (`motor-sobrescribir.ts`). Un tipo nuevo =
// un caso en este `switch`.
import { buscar } from './medidor'
import { valorDeCalculo } from './motor-calculo'
import {
  anotar,
  asentar,
  leer,
  sinValidar,
  type Estado,
  type Evaluacion,
  type Valor,
} from './motor-contexto'
import { descartarSiHay, sobrescrito } from './motor-sobrescribir'
import { valorDeTabla, valorDeTramo } from './motor-tablas'
import { acumular } from './motor-totales'
import type { Nodo } from './nodos'

type NodoDeValor = Exclude<Nodo, { tipo: 'opcion' }>
type NodoInput = Extract<Nodo, { tipo: 'input' }>

// Evalúa un nodo, lo guarda y, si es miembro de un grupo, lo suma a su grupo.
export function evaluarNodo(ev: Evaluacion, n: Nodo): void {
  if (n.tipo === 'opcion') {
    descartarSiHay(ev, n.id, 'no_sobrescribible')
    ev.valores.set(n.id, varianteDe(ev, n.id))
    return
  }
  const estado = estadoDe(ev, n.id)
  const v = asentar(ev, estado === 'activo' ? valorActivo(ev, n) : 0, n.id)
  if (estado !== 'activo') descartarSiHay(ev, n.id, estado)
  ev.valores.set(n.id, v)
  if (n.grupo !== undefined) acumular(ev, n.grupo, v)
}

function estadoDe(ev: Evaluacion, id: string): Estado {
  const estado = buscar(ev.estados, id, ev.m)
  if (estado === undefined) throw sinValidar('un nodo no tiene estado', id)
  return estado
}

// Un override aplicado manda; si no, se calcula (el sugerido, el default o lo tipeado).
function valorActivo(ev: Evaluacion, n: NodoDeValor): Valor {
  const v = sobrescrito(ev, n)
  return v === undefined ? valorCalculado(ev, n) : v
}

function valorCalculado(ev: Evaluacion, n: NodoDeValor): Valor {
  switch (n.tipo) {
    case 'input':
      return valorDeInput(ev, n)
    case 'constante':
      return valorDeConstante(ev, n.id)
    case 'tipo_cambio':
      return valorDeTipoDeCambio(ev, n.id, n.clave)
    case 'campo_vehiculo':
      return valorDeCampo(ev, n.id, n.campo)
    case 'bandera':
      return valorDeBandera(ev, n.id)
    case 'tabla':
      return valorDeTabla(ev, n)
    case 'tramo':
      return valorDeTramo(ev, n, leer(ev, n.sobre, n.id))
    case 'calculo':
      return valorDeCalculo(ev, n)
    default: {
      const _: never = n
      return _
    }
  }
}

// La variante vale su clave, que `resolverVariante` ya eligió.
function varianteDe(ev: Evaluacion, id: string): string {
  if (ev.variante === undefined) throw sinValidar('la variante no tiene una clave elegida', id)
  return ev.variante
}

// Tipeado (la clave está, aunque valga 0) vale lo tipeado: `override` si había un sugerido, `input` si no. Sin
// tipear y con su `requerido_si` encendida no hay valor: «requerido» es que la persona lo escriba, y un sugerido no lo
// cumple. Si no, el sugerido (`sugerido_de`) o 0, como la celda vacía del Excel.
function valorDeInput(ev: Evaluacion, n: NodoInput): Valor {
  const tipeado = buscar(ev.entrada.inputs, n.id, ev.m)
  const sugerido = n.sugerido_de
  if (tipeado !== undefined) {
    ev.fuentes.set(n.id, sugerido === undefined ? 'input' : 'override')
    return tipeado
  }
  const bandera = n.requerido_si
  const requerido = bandera !== undefined && leer(ev, bandera, n.id) === 1
  ev.fuentes.set(n.id, sugerido === undefined || requerido ? 'input' : 'sugerido')
  if (requerido) return anotar(ev, 'requerido_sin_valor', n.id, bandera)
  return sugerido === undefined ? 0 : leer(ev, sugerido, n.id)
}

// Encendida vale 1; apagada o sin valor, 0. Fuera de su variante ni se mira (vale 0 por su estado).
const valorDeBandera = (ev: Evaluacion, id: string): Valor =>
  buscar(ev.entrada.banderas, id, ev.m) === true ? 1 : 0

function valorDeConstante(ev: Evaluacion, id: string): Valor {
  const v = buscar(ev.constantes, id, ev.m)
  if (v === undefined) throw sinValidar(`la constante «${id}» no tiene valor en params`, id)
  return v
}

// Un tipo de cambio que no llega, o que no es mayor que 0, no tiene valor.
function valorDeTipoDeCambio(ev: Evaluacion, id: string, clave: string): Valor {
  const v = buscar(ev.entrada.tipos_cambio, clave, ev.m)
  return v !== undefined && v > 0 ? v : anotar(ev, 'tipo_de_cambio_sin_valor', id, clave)
}

// Un campo del vehículo que no está, es null o no es un número.
function valorDeCampo(ev: Evaluacion, id: string, campo: string): Valor {
  const v = buscar(ev.entrada.vehiculo, campo, ev.m)
  return typeof v === 'number' ? v : anotar(ev, 'campo_sin_valor', id, campo)
}
