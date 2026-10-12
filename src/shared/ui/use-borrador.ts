'use client'

import { useEffect, type RefObject } from 'react'
import {
  borrarBorrador,
  cambiosDelBorrador,
  guardarBorrador,
  leerBorrador,
  type Borrador,
} from '@/shared/lib/borrador'
import { valoresDe } from '@/shared/lib/formularios'
import { avisar } from './toasts'

// Escribe en el campo como si la persona lo hubiera tipeado: con el `value` del prototipo y un
// evento `input`, para que un campo controlado por React también se entere.
function escribir(formulario: HTMLFormElement, valores: Borrador): void {
  for (const [nombre, valor] of Object.entries(valores)) {
    const campo = formulario.elements.namedItem(nombre)
    if (
      campo instanceof HTMLInputElement ||
      campo instanceof HTMLSelectElement ||
      campo instanceof HTMLTextAreaElement
    ) {
      const prototipo: unknown = Object.getPrototypeOf(campo)
      const propiedad = Object.getOwnPropertyDescriptor(prototipo, 'value')
      if (propiedad?.set) {
        propiedad.set.call(campo, valor)
      } else {
        campo.value = valor
      }
      campo.dispatchEvent(new Event('input', { bubbles: true }))
    }
  }
}

// Borrador de un formulario: guarda lo que la persona cambió respecto de lo guardado y lo repone
// al volver a abrirlo, avisando con «Descartar». Sólo lo que cambió: si mientras tanto otra
// persona guardó otro campo, reponer el formulario entero pisaría su cambio sin que nadie lo vea.
// `campos` son los nombres de los campos de texto (una constante de quien llama); lo que no es
// texto (un archivo, un interruptor) no entra. Con `activo` en falso no guarda ni repone: quien no
// puede editar no tiene nada que recuperar.
export function useBorrador<Clave extends string>(
  clave: string,
  formulario: RefObject<HTMLFormElement | null>,
  campos: readonly Clave[],
  activo = true,
) {
  useEffect(() => {
    const elemento = formulario.current
    if (!elemento || !activo) {
      return
    }
    // Lo guardado, como llegó del servidor: contra esto se mide qué tipeó la persona.
    const guardado = valoresDe(elemento, campos)
    const borrador = leerBorrador(window.sessionStorage, clave)
    const pendientes = borrador ? cambiosDelBorrador(borrador, guardado) : {}
    if (Object.keys(pendientes).length > 0) {
      escribir(elemento, pendientes)
      avisar('Recuperamos lo que habías escrito y no guardaste.', {
        etiqueta: 'Descartar',
        alHacer: () => {
          borrarBorrador(window.sessionStorage, clave)
          elemento.reset()
        },
      })
    }
    const alTipear = () => {
      const tipeado = cambiosDelBorrador(valoresDe(elemento, campos), guardado)
      if (Object.keys(tipeado).length > 0) {
        guardarBorrador(window.sessionStorage, clave, tipeado)
      } else {
        borrarBorrador(window.sessionStorage, clave)
      }
    }
    elemento.addEventListener('input', alTipear)
    elemento.addEventListener('change', alTipear)
    return () => {
      elemento.removeEventListener('input', alTipear)
      elemento.removeEventListener('change', alTipear)
    }
  }, [clave, formulario, campos, activo])

  return {
    // Después de guardar: lo tipeado ya está en la base.
    limpiar: () => {
      borrarBorrador(window.sessionStorage, clave)
    },
  }
}
