'use client'

import { useEffect, useState } from 'react'
import { leerEtiquetasConUso } from '../../../composicion.client'
import type { EtiquetaConUso } from '../../../entities/etiqueta'

type Lectura = { intento: number } & (
  { tipo: 'error' } | { tipo: 'listo'; lista: EtiquetaConUso[] }
)

export type EstadoDeEtiquetas =
  { tipo: 'cargando' } | { tipo: 'error' } | { tipo: 'listo'; lista: EtiquetaConUso[] }

// Las etiquetas de quien mira con a cuántos leads toca cada una, leídas desde el navegador al
// montarse (el diálogo de «Gestionar» se monta al abrirse) y de nuevo con `leer()`.
export function useEtiquetasConUso() {
  const [intento, setIntento] = useState(0)
  const [lectura, setLectura] = useState<Lectura | null>(null)

  useEffect(() => {
    let vigente = true
    const cargar = async () => {
      let nueva: Lectura
      try {
        const leida = await leerEtiquetasConUso()
        nueva = leida.ok
          ? { intento, tipo: 'listo', lista: leida.data }
          : { intento, tipo: 'error' }
      } catch {
        nueva = { intento, tipo: 'error' }
      }
      if (vigente) {
        setLectura(nueva)
      }
    }
    void cargar()
    return () => {
      vigente = false
    }
  }, [intento])

  // Una lectura de un intento anterior no vale: se espera la nueva.
  const estado: EstadoDeEtiquetas =
    lectura === null || lectura.intento !== intento
      ? { tipo: 'cargando' }
      : lectura.tipo === 'listo'
        ? { tipo: 'listo', lista: lectura.lista }
        : { tipo: 'error' }

  return {
    estado,
    leer: () => {
      setIntento((n) => n + 1)
    },
    // Lo que cambió (renombrada, eliminada, nueva), sin volver a leer.
    cambiar: (cambio: (lista: EtiquetaConUso[]) => EtiquetaConUso[]) => {
      setLectura((antes) =>
        antes?.tipo === 'listo' ? { ...antes, lista: cambio(antes.lista) } : antes,
      )
    },
  }
}
