'use client'

import { useCallback, useState, useSyncExternalStore } from 'react'

// Desde qué tamaño de la fuente raíz el resumen al pie nace plegado: 24 px es el 150 % de los 16 de siempre. Con el texto al 200 % el resumen abierto se
// comía el 40 % del alto y tapaba las celdas (4-50); se decide por la fuente y no por el ancho: a 100 % en un celular angosto ya cabe.
const FUENTE_GRANDE_PX = 24

const sinSuscripcion = () => () => {}
const fuenteGrande = () => {
  const px = Number.parseFloat(getComputedStyle(document.documentElement).fontSize)
  return Number.isFinite(px) && px >= FUENTE_GRANDE_PX
}
// En el servidor no hay fuente que medir: abierto, y al hidratar se lee la de verdad.
const enElServidor = () => false

// ¿El detalle del resumen al pie (los secundarios, el total en moneda local, el modo) está plegado? Nace plegado con el texto grande y después manda quien lo
// pliega o lo abre. Es estado de presentación: no va a la URL y se conserva al recalcular. Al costado (`@4xl/hoja`) el CSS lo muestra todo igual.
export function useResumenPlegado(): { plegado: boolean; alternar: () => void } {
  const grande = useSyncExternalStore(sinSuscripcion, fuenteGrande, enElServidor)
  const [eleccion, setEleccion] = useState<boolean | null>(null)
  const plegado = eleccion ?? grande
  const alternar = useCallback(() => {
    setEleccion(!plegado)
  }, [plegado])
  return { plegado, alternar }
}
