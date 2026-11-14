'use client'

// Avisos efímeros. Todo toast de la app sale de acá para que el mismo resultado se diga siempre
// igual: el conflicto ofrece «Recargar», la sesión vencida no hace perder el formulario, y lo
// reversible ofrece «Deshacer» durante 10 s (docs/UX.md › Reglas transversales).
import { createElement } from 'react'
import { toast } from 'sonner'
import {
  hayAcciones,
  MAXIMO_DE_ACCIONES,
  SIN_ACCIONES,
  type AccionDelAviso,
  type AccionesDeUnAviso,
} from '@/shared/lib/acciones-del-aviso'
import type { ErrorApp } from '@/shared/lib/errores'
import { RUTAS } from '@/shared/lib/rutas'
import { AccionesDelAviso } from './acciones-del-aviso'
import { salirSinPerder } from './salida-con-cambios'

const DESHACER_MS = 10_000

// `sale`: la acción deja la pantalla («Abrir ficha», ir a otra página). Con un formulario abierto y
// algo escrito, antes pregunta en su pie si descartarlo (`salirSinPerder()`): el aviso está encima de
// todo y su botón recibe el clic aunque haya un modal abierto.
// `duracion`: cuánto queda a la vista (ms); por defecto, lo de sonner.
type Accion = { etiqueta: string; alHacer: () => void; sale?: boolean; duracion?: number }

function opcionesDe(accion: Accion | undefined) {
  if (!accion) {
    return undefined
  }
  const { etiqueta, alHacer, sale, duracion } = accion
  return {
    ...(duracion === undefined ? {} : { duration: duracion }),
    action: {
      label: etiqueta,
      onClick: sale
        ? () => {
            salirSinPerder(alHacer)
          }
        : alHacer,
    },
  }
}

export function avisarExito(mensaje: string, accion?: Accion): void {
  toast.success(mensaje, opcionesDe(accion))
}

// Algo que la persona tiene que saber y no es ni un éxito ni un error.
export function avisar(mensaje: string, accion?: Accion): void {
  toast(mensaje, opcionesDe(accion))
}

export function avisarConDeshacer(mensaje: string, alDeshacer: () => void): void {
  toast(mensaje, {
    duration: DESHACER_MS,
    action: { label: 'Deshacer', onClick: alDeshacer },
  })
}

function avisarSesionVencida(mensaje: string): void {
  // No se redirige: la persona tiene un formulario abierto. Ingresa en otra pestaña (la sesión
  // es de todo el navegador) y vuelve a guardar acá.
  toast.error(mensaje, {
    id: 'sesion-vencida',
    duration: Infinity,
    description: 'Lo que escribiste sigue acá. Ingresa en otra pestaña y vuelve a guardar.',
    action: {
      label: 'Ingresar',
      onClick: () => {
        window.open(RUTAS.ingreso, '_blank', 'noopener')
      },
    },
  })
}

// Lo que `avisarError()` ofrece además del mensaje. `acciones` las declara el módulo (`entities/`) a partir de `error.causa`; `alReintentar`
// suma «Reintentar» al frente, y `alDeshacer` es lo que hace una acción `deshacer` declarada.
export type OpcionesDeError = {
  acciones?: AccionesDeUnAviso
  alReintentar?: () => void
  alDeshacer?: () => void
}

const RECARGAR: AccionDelAviso = { tipo: 'recargar', etiqueta: 'Recargar' }
const REINTENTAR: AccionDelAviso = { tipo: 'reintentar', etiqueta: 'Reintentar' }

let siguiente = 0

// Un error con acciones o un pedido queda a la vista hasta cerrarlo y lleva el foco a la acción principal: bloquea lo que la persona
// quería hacer y lo que sigue es elegir. El conflicto siempre ofrece «Recargar», primero.
function avisarErrorConAcciones(
  error: ErrorApp,
  resueltas: AccionesDeUnAviso,
  opciones: OpcionesDeError,
): void {
  const id = `error-con-acciones-${String(siguiente++)}`
  toast.error(error.mensaje, {
    id,
    duration: Infinity,
    description: createElement(AccionesDelAviso, {
      resueltas,
      alReintentar: opciones.alReintentar,
      alDeshacer: opciones.alDeshacer,
      alElegir: () => toast.dismiss(id),
      enfocar: true,
    }),
  })
}

export function avisarError(error: ErrorApp, opciones: OpcionesDeError = {}): void {
  if (error.codigo === 'no_autenticado') {
    avisarSesionVencida(error.mensaje)
    return
  }
  const propias = opciones.acciones ?? SIN_ACCIONES
  const delPrincipio = [
    ...(error.codigo === 'conflicto' ? [RECARGAR] : []),
    ...(opciones.alReintentar ? [REINTENTAR] : []),
  ]
  const resueltas: AccionesDeUnAviso = {
    acciones: [...delPrincipio, ...propias.acciones].slice(0, MAXIMO_DE_ACCIONES),
    pedido: propias.pedido,
  }
  if (hayAcciones(resueltas)) {
    avisarErrorConAcciones(error, resueltas, opciones)
    return
  }
  toast.error(error.mensaje)
}

// Un trabajo largo que sigue después de cerrar el panel (traer las fotos de una subasta): un aviso
// que se actualiza con el mismo `id` hasta que termina y se reemplaza por su resultado.
export function avisarProgreso(id: string, mensaje: string): void {
  toast.loading(mensaje, { id })
}

export function terminarProgreso(id: string): void {
  toast.dismiss(id)
}
