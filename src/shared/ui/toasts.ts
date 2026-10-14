'use client'

// Avisos efímeros. Todo toast de la app sale de acá para que el mismo resultado se diga siempre
// igual: el conflicto ofrece «Recargar», la sesión vencida no hace perder el formulario, y lo
// reversible ofrece «Deshacer» durante 10 s (docs/UX.md › Reglas transversales).
import { toast } from 'sonner'
import type { ErrorApp } from '@/shared/lib/errores'
import { RUTAS } from '@/shared/lib/rutas'

const DESHACER_MS = 10_000

type Accion = { etiqueta: string; alHacer: () => void }

export function avisarExito(mensaje: string, accion?: Accion): void {
  toast.success(
    mensaje,
    accion ? { action: { label: accion.etiqueta, onClick: accion.alHacer } } : undefined,
  )
}

// Algo que la persona tiene que saber y no es ni un éxito ni un error.
export function avisar(mensaje: string, accion?: Accion): void {
  toast(
    mensaje,
    accion ? { action: { label: accion.etiqueta, onClick: accion.alHacer } } : undefined,
  )
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
          window.location.reload()
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
