// Las líneas que la persona pegó para dar de alta desde apibara y en qué está cada una. Puro: el
// hook las mueve con un reductor y la lista las dibuja.
import {
  MAXIMO_DE_LINEAS,
  interpretarLinea,
  lineasDe,
  mensajeDeApibara,
  sePuedeReintentar,
  type CodigoDeApibara,
  type EntradaDeApibara,
  type FichaDeApibara,
} from '../../entities/apibara'
import type { DatosDeSubasta } from '../../entities/subasta'

export type EstadoDeLinea =
  // Interpretada y en la cola de consultas.
  | { tipo: 'esperando' }
  | { tipo: 'consultando' }
  // apibara la trajo y no está en el inventario: se puede revisar y guardar.
  | { tipo: 'lista'; ficha: FichaDeApibara; datos: DatosDeSubasta }
  // Ya hay un vehículo así. `vehiculoId` null = existe, pero quien pegó no lo ve.
  | { tipo: 'repetida'; ficha: FichaDeApibara; vehiculoId: string | null }
  // No se pudo traer. `codigo` null = ni siquiera se consultó (no se entiende lo que se pegó).
  | { tipo: 'fallida'; codigo: CodigoDeApibara | null; mensaje: string }
  // Se intentó guardar y no pasó (falta un dato obligatorio, o la base lo rechazó): se puede
  // revisar en el formulario con todo lo traído.
  | { tipo: 'sin_guardar'; ficha: FichaDeApibara; datos: DatosDeSubasta; motivo: string }
  // Ya se dio de alta desde esta lista.
  | { tipo: 'guardada'; vehiculoId: string; numero: number | null }

export type Linea = {
  clave: string
  texto: string
  // null = no se entiende (no hay a quién consultar).
  entrada: EntradaDeApibara | null
  estado: EstadoDeLinea
}

export type Pegado = { lineas: Linea[]; recortadas: number }

// Lo pegado como líneas: las que no se entienden quedan fallidas, con su motivo, y no consultan.
// Más de `MAXIMO_DE_LINEAS` se recortan y se dice cuántas.
export function lineasDePegado(texto: string): Pegado {
  const todas = lineasDe(texto)
  const lineas = todas.slice(0, MAXIMO_DE_LINEAS).map((linea, indice): Linea => {
    const leida = interpretarLinea(linea)
    return leida.ok
      ? {
          clave: String(indice),
          texto: linea,
          entrada: leida.entrada,
          estado: { tipo: 'esperando' },
        }
      : {
          clave: String(indice),
          texto: linea,
          entrada: null,
          estado: { tipo: 'fallida', codigo: null, mensaje: leida.motivo },
        }
  })
  return { lineas, recortadas: Math.max(0, todas.length - MAXIMO_DE_LINEAS) }
}

export type AccionDeLineas =
  | { tipo: 'cargar'; lineas: Linea[] }
  | { tipo: 'estado'; clave: string; estado: EstadoDeLinea }
  | { tipo: 'repetidas'; repetidas: { clave: string; vehiculoId: string | null }[] }
  | { tipo: 'vaciar' }

export function reducirLineas(lineas: readonly Linea[], accion: AccionDeLineas): Linea[] {
  switch (accion.tipo) {
    case 'cargar':
      return accion.lineas
    case 'vaciar':
      return []
    case 'estado':
      return lineas.map((linea) =>
        linea.clave === accion.clave ? { ...linea, estado: accion.estado } : linea,
      )
    case 'repetidas':
      return lineas.map((linea) => {
        const repetida = accion.repetidas.find((una) => una.clave === linea.clave)
        return repetida && linea.estado.tipo === 'lista'
          ? {
              ...linea,
              estado: {
                tipo: 'repetida',
                ficha: linea.estado.ficha,
                vehiculoId: repetida.vehiculoId,
              },
            }
          : linea
      })
  }
}

// Una línea fallida por un código: dice el mensaje del código.
export function falloDeLinea(codigo: CodigoDeApibara): EstadoDeLinea {
  return { tipo: 'fallida', codigo, mensaje: mensajeDeApibara(codigo) }
}

// Un código que vale para todo lo que sigue: con la cuota agotada o la clave rechazada, consultar
// la línea siguiente sólo repetiría el mismo error (y gastaría cuota).
export function cortaLaCola(codigo: CodigoDeApibara): boolean {
  return (
    codigo === 'cuota' ||
    codigo === 'clave_invalida' ||
    codigo === 'apagada' ||
    codigo === 'sin_permiso'
  )
}

export type Resumen = {
  total: number
  listas: number
  sinGuardar: number
  repetidas: number
  fallidas: number
  guardadas: number
  enCurso: number
}

export function resumirLineas(lineas: readonly Linea[]): Resumen {
  const cuenta = (tipo: EstadoDeLinea['tipo']) =>
    lineas.filter((linea) => linea.estado.tipo === tipo).length
  return {
    total: lineas.length,
    listas: cuenta('lista'),
    sinGuardar: cuenta('sin_guardar'),
    repetidas: cuenta('repetida'),
    fallidas: cuenta('fallida'),
    guardadas: cuenta('guardada'),
    enCurso: cuenta('esperando') + cuenta('consultando'),
  }
}

// Qué ofrece una línea fallida: reintentarla sólo sirve si el fallo fue del momento.
export function sePuedeReintentarLinea(linea: Linea): boolean {
  return (
    linea.entrada !== null &&
    linea.estado.tipo === 'fallida' &&
    linea.estado.codigo !== null &&
    sePuedeReintentar(linea.estado.codigo)
  )
}
