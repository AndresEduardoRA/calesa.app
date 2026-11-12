'use client'

import { useEffect, useRef, useSyncExternalStore } from 'react'

// Lo que pasa dentro del panel de una unidad se avisa por el navegador, no por la URL: un hueco guarda algo y otro, de la misma unidad, vuelve a leer (6.04; mismo patrón que
// `eventos-de-dinero.ts`). Dos avisos: «cambió algo de la unidad» (el hueco «Qué falta» se relee) y «abre ese hueco» (el atajo de una falta).
const EVENTO_DE_CAMBIO = 'logistica:unidad-cambio'
const EVENTO_DE_ABRIR = 'logistica:abrir-hueco'

/** Cada hueco dibuja su bloque con este atributo: el atajo lo busca para saber si existe y a dónde ir. */
export const ATRIBUTO_DEL_BLOQUE = 'data-bloque-del-hueco'

export function avisarCambioDeLaUnidad(unidadId: string): void {
  window.dispatchEvent(new CustomEvent<string>(EVENTO_DE_CAMBIO, { detail: unidadId }))
}

// Llama `alCambiar` cada vez que otro hueco avisa que cambió algo de esa unidad.
export function useAlCambiarLaUnidad(unidadId: string, alCambiar: () => void): void {
  const ultima = useRef(alCambiar)
  useEffect(() => {
    ultima.current = alCambiar
  })
  useEffect(() => {
    const oyente = (evento: Event) => {
      if (evento instanceof CustomEvent && evento.detail === unidadId) {
        ultima.current()
      }
    }
    window.addEventListener(EVENTO_DE_CAMBIO, oyente)
    return () => {
      window.removeEventListener(EVENTO_DE_CAMBIO, oyente)
    }
  }, [unidadId])
}

function bloqueDe(clave: string): HTMLElement | null {
  return document.querySelector<HTMLElement>(`[${ATRIBUTO_DEL_BLOQUE}="${CSS.escape(clave)}"]`)
}

/** Abre el bloque de ese hueco (si estaba cerrado), lo trae a la vista y le lleva el foco. Devuelve `false` si el panel no lo tiene. */
export function abrirHueco(clave: string): boolean {
  if (bloqueDe(clave) === null) return false
  window.dispatchEvent(new CustomEvent<string>(EVENTO_DE_ABRIR, { detail: clave }))
  return true
}

// Abre el bloque cuando alguien pide su hueco por el aviso: lo usa `BloqueDelHueco`.
export function useAlPedirAbrirElHueco(clave: string, alAbrir: () => void): void {
  const ultima = useRef(alAbrir)
  useEffect(() => {
    ultima.current = alAbrir
  })
  useEffect(() => {
    const oyente = (evento: Event) => {
      if (evento instanceof CustomEvent && evento.detail === clave) {
        ultima.current()
      }
    }
    window.addEventListener(EVENTO_DE_ABRIR, oyente)
    return () => {
      window.removeEventListener(EVENTO_DE_ABRIR, oyente)
    }
  }, [clave])
}

const sinSuscripcion = () => () => undefined

/** ¿El panel tiene ese hueco? Falso en el servidor y mientras no se sabe; un atajo sólo se dibuja si el hueco existe. */
export function useHayHueco(clave: string): boolean {
  return useSyncExternalStore(
    sinSuscripcion,
    () => bloqueDe(clave) !== null,
    () => false,
  )
}

/** Lleva el foco al título del panel de la unidad (p. ej. tras mover, cuando lo que se tocaba cambió de lugar). */
export function enfocarElTituloDeLaUnidad(): void {
  document.querySelector<HTMLElement>('[data-slot="panel-de-la-unidad"] h2')?.focus()
}
