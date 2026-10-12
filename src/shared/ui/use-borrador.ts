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

// Borrador de un formulario: guarda lo tipeado en cada cambio y lo repone al volver
// a abrirlo, avisando con «Descartar». `campos` son los nombres de los campos de texto (una
// constante de quien llama: si cambia de identidad, el borrador se vuelve a leer); lo que no es
// texto (un archivo, un interruptor) no entra.
export function useBorrador<Clave extends string>(
  clave: string,
  formulario: RefObject<HTMLFormElement | null>,
  campos: readonly Clave[],
) {
  useEffect(() => {
    const elemento = formulario.current
    if (!elemento) {
      return
    }
    const borrador = leerBorrador(window.sessionStorage, clave)
    const cambios = borrador ? cambiosDelBorrador(borrador, valoresDe(elemento, campos)) : {}
    if (Object.keys(cambios).length > 0) {
      escribir(elemento, cambios)
      avisar('Recuperamos lo que habías escrito y no guardaste.', {
        etiqueta: 'Descartar',
        alHacer: () => {
          borrarBorrador(window.sessionStorage, clave)
          elemento.reset()
        },
      })
    }
    const alTipear = () => {
      guardarBorrador(window.sessionStorage, clave, valoresDe(elemento, campos))
    }
    elemento.addEventListener('input', alTipear)
    elemento.addEventListener('change', alTipear)
    return () => {
      elemento.removeEventListener('input', alTipear)
      elemento.removeEventListener('change', alTipear)
    }
  }, [clave, formulario, campos])

  return {
    // Después de guardar: lo tipeado ya está en la base.
    limpiar: () => {
      borrarBorrador(window.sessionStorage, clave)
    },
  }
}
