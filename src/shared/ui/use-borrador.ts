'use client'

import { useEffect, type RefObject } from 'react'
import {
  borrarBorrador,
  cambiosDelBorrador,
  guardarBorrador,
  leerBorrador,
  type Borrador,
} from '@/shared/lib/borrador'
import { valoresDe, valoresGuardadosDe } from '@/shared/lib/formularios'
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
// Lo guardado es lo que mandó el servidor (el `defaultValue` de cada campo), no lo que hay en
// pantalla al enganchar: así lo que se escribió antes de que el efecto corriera también cuenta.
// Un formulario que React controla (`value` y `onChange`) no tiene `defaultValue` que leer: React
// no marca la opción de un `<select>` controlado. Ahí va `controlado`, y lo guardado es lo que se ve
// al enganchar, que es el estado inicial (esos formularios se dibujan ya con él, sin hidratar).
// `campos` son los nombres de los campos de texto (una constante de quien llama); lo que no es
// texto (un archivo, un interruptor) no entra. Con `activo` en falso no guarda ni repone: quien no
// puede editar no tiene nada que recuperar.
export function useBorrador<Clave extends string>(
  clave: string,
  formulario: RefObject<HTMLFormElement | null>,
  campos: readonly Clave[],
  { activo = true, controlado = false }: { activo?: boolean; controlado?: boolean } = {},
) {
  // Cuenta el contenido de la lista, no su identidad: un formulario que la arma en cada render no
  // reengancha el efecto (y no vuelve a leer lo tipeado como si ya estuviera guardado).
  const lista = campos.join('|')
  useEffect(() => {
    const elemento = formulario.current
    if (!elemento || !activo) {
      return
    }
    const nombres = (lista === '' ? [] : lista.split('|')) as Clave[]
    const guardado = controlado
      ? valoresDe(elemento, nombres)
      : valoresGuardadosDe(elemento, nombres)
    // Lo que ya se escribió: el borrador viejo no lo pisa.
    const escrito = cambiosDelBorrador(valoresDe(elemento, nombres), guardado)
    const borrador = leerBorrador(window.sessionStorage, clave)
    const pendientes = Object.fromEntries(
      Object.entries(borrador ? cambiosDelBorrador(borrador, guardado) : {}).filter(
        ([campo]) => !(campo in escrito),
      ),
    )
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
      const tipeado = cambiosDelBorrador(valoresDe(elemento, nombres), guardado)
      if (Object.keys(tipeado).length > 0) {
        guardarBorrador(window.sessionStorage, clave, tipeado)
      } else {
        borrarBorrador(window.sessionStorage, clave)
      }
    }
    // Lo escrito antes de enganchar y lo repuesto quedan a salvo ya, sin esperar otra tecla.
    alTipear()
    elemento.addEventListener('input', alTipear)
    elemento.addEventListener('change', alTipear)
    return () => {
      elemento.removeEventListener('input', alTipear)
      elemento.removeEventListener('change', alTipear)
    }
  }, [clave, formulario, lista, activo, controlado])

  return {
    // Después de guardar: lo tipeado ya está en la base.
    limpiar: () => {
      borrarBorrador(window.sessionStorage, clave)
    },
  }
}
