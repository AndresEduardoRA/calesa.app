// El valor de cada tipo de nodo (docs/COTIZADOR.md › «El motor»). Un nodo con su `condicion` apagada vale 0 sin
// leer sus referencias: ahí un null no se propaga. Un tipo nuevo = un caso en este `switch`.
import { buscar } from './medidor'
import { valorDeCalculo } from './motor-calculo'
import { anotar, leer, sinValidar, type Evaluacion, type Valor } from './motor-contexto'
import { ErrorDelMotor } from './motor-errores'
import { valorDeTabla, valorDeTramo } from './motor-tablas'
import { condicionDe, type Nodo } from './nodos'

export function valorDeNodo(ev: Evaluacion, n: Nodo): Valor {
  return apagado(ev, n) ? 0 : valorEncendido(ev, n)
}

function valorEncendido(ev: Evaluacion, n: Nodo): Valor {
  switch (n.tipo) {
    case 'input':
      return valorDeInput(ev, n.id)
    case 'constante':
      return valorDeConstante(ev, n.id)
    case 'tipo_cambio':
      return valorDeTipoDeCambio(ev, n.id, n.clave)
    case 'campo_vehiculo':
      return valorDeCampo(ev, n.id, n.campo)
    case 'bandera':
      return valorDeBandera(ev, n.id)
    case 'opcion':
      // `revisarRasgos` ya lanzó; esto queda por si se llama de otro modo.
      throw new ErrorDelMotor(
        'rasgo_pendiente',
        `El motor todavía no evalúa «opcion» (nodo «${n.id}»).`,
        n.id,
      )
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

// La condición del nodo (una bandera anterior) está apagada.
function apagado(ev: Evaluacion, n: Nodo): boolean {
  const condicion = condicionDe(n)
  return condicion !== undefined && leer(ev, condicion, n.id) !== 1
}

// Lo que no se tipeó vale 0, como la celda vacía del Excel.
const valorDeInput = (ev: Evaluacion, id: string): Valor => buscar(ev.entrada.inputs, id, ev.m) ?? 0

// Encendida vale 1; apagada o sin valor, 0.
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
