'use client'

// Avisos efímeros. Todo toast de la app sale de acá para que el mismo resultado se diga siempre
// igual: el conflicto ofrece «Recargar», la sesión vencida no hace perder el formulario, y lo
// reversible ofrece «Deshacer» durante 10 s (docs/UX.md › Reglas transversales).
import { toast } from 'sonner'
import type { ErrorApp } from '@/shared/lib/errores'
import { RUTAS } from '@/shared/lib/rutas'
import { salirSinPerder } from './salida-con-cambios'

const DESHACER_MS = 10_000

// `sale`: la acción deja la pantalla («Abrir ficha», ir a otra página). Con un formulario abierto y
// algo escrito, antes pregunta en su pie si descartarlo (`salirSinPerder()`): el aviso está encima de
// todo y su botón recibe el clic aunque haya un modal abierto.
type Accion = { etiqueta: string; alHacer: () => void; sale?: boolean }

function opcionesDe(accion: Accion | undefined) {
  if (!accion) {
    return undefined
  }
  const { etiqueta, alHacer, sale } = accion
  return {
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

export function avisarError(error: ErrorApp): void {
  if (error.codigo === 'no_autenticado') {
    avisarSesionVencida(error.mensaje)
    return
  }
  if (error.codigo === 'conflicto') {
    toast.error(error.mensaje, {
      duration: Infinity,
      action: {
        label: 'Recargar',
        onClick: () => {
          salirSinPerder(() => {
            window.location.reload()
          })
        },
      },
    })
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
