'use client'

import { useCallback, useState } from 'react'
import { useReintentoAlVolver } from '../use-reintento-al-volver'
import { usePorPagina } from '../por-pagina'

export type PorPaginaDelListado = {
  // Lo que muestra el selector: lo que se eligió sin red, si hay algo esperando; si no, lo que dibuja la página.
  visto: number
  // Hay una elección esperando la conexión: se muestra, no se pierde, y sale sola al volver.
  esperandoRed: boolean
  // El tamaño se aplicó (la URL ya lo dice) pero no quedó guardado en la cuenta.
  sinGuardar: boolean
  elegir: (tamano: number) => void
  reintentarGuardado: () => void
}

// Cambiar «ítems por página» desde un listado: lo guarda en la cuenta y, **cuando terminó**, pone `?por=` en la URL (con
// `aplicar`, que vuelve a la primera página y conserva filtros y búsqueda). En ese orden y no a la vez: la respuesta de la
// acción que guarda trae la página de la URL de antes y, si llega después de la navegación, la pisa (la URL queda con el
// tamaño nuevo y la lista con el viejo; es la carrera que cuenta la ficha de `shared`). Mientras tanto el selector muestra
// lo elegido. Sin red no hace nada: lo elegido queda a la vista y sale solo al volver la conexión, una vez
// (`useReintentoAlVolver`), como paginar. Si el guardado falla con la red presente, la página igual cambia y se ofrece
// reintentar.
export function usePorPaginaDelListado(
  valor: number,
  aplicar: (tamano: number) => void,
): PorPaginaDelListado {
  const { elegir: guardar } = usePorPagina()
  const [esperando, setEsperando] = useState<number | null>(null)
  const [sinGuardar, setSinGuardar] = useState<number | null>(null)
  // Elegido y ya guardándose o navegando: se ve hasta que la página llega con ese tamaño.
  const [aplicando, setAplicando] = useState<number | null>(null)
  // Cuando la página llega con otro tamaño, lo elegido ya se cumplió (o la URL cambió por otro lado): se suelta.
  const [valorVisto, setValorVisto] = useState(valor)
  if (valorVisto !== valor) {
    setValorVisto(valor)
    setAplicando(null)
  }

  const guardarEnLaCuenta = useCallback(
    async (tamano: number): Promise<boolean> => {
      // El selector sólo ofrece tamaños de la lista: `guardar` los acepta como tales.
      const resultado = await guardar(tamano as Parameters<typeof guardar>[0])
      setSinGuardar(resultado.ok ? null : tamano)
      return resultado.ok
    },
    [guardar],
  )

  const confirmar = useCallback(
    async (tamano: number): Promise<boolean> => {
      if (tamano === valor) {
        setEsperando(null)
        return true
      }
      if (!navigator.onLine) {
        setEsperando(tamano)
        return false
      }
      setEsperando(null)
      setAplicando(tamano)
      const guardado = await guardarEnLaCuenta(tamano)
      aplicar(tamano)
      return guardado
    },
    [valor, aplicar, guardarEnLaCuenta],
  )

  useReintentoAlVolver(esperando, confirmar)

  return {
    visto: esperando ?? aplicando ?? valor,
    esperandoRed: esperando !== null,
    sinGuardar: sinGuardar !== null,
    elegir: (tamano) => {
      void confirmar(tamano)
    },
    reintentarGuardado: () => {
      if (sinGuardar !== null) {
        void guardarEnLaCuenta(sinGuardar)
      }
    },
  }
}
