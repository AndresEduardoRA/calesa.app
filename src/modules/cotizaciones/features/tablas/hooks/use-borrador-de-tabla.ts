'use client'

import { useEffect, useRef, useState } from 'react'
import { borrarBorrador, guardarBorrador, leerBorrador } from '@/shared/lib/borrador'
import {
  borradorParaGuardar,
  claveDelBorradorDeTabla,
  recuperarBorrador,
  type BorradorRecuperado,
} from '../../../entities/tablas/borrador-de-tabla'
import type { EstadoDelEditor } from '../../../entities/tablas/vista-del-editor'

const ESPERA_MS = 300

// El borrador de esta tabla al abrirla (4.23-3, C8): el de la misma versión se repone; el de otra, `vieja`. El editor se dibuja sólo en el navegador (`diferido()`): leer
// `sessionStorage` al montarse no difiere del servidor.
export function useBorradorAlAbrir(tablaId: string, version: number): BorradorRecuperado {
  const [recuperado] = useState(() => {
    try {
      return recuperarBorrador(
        leerBorrador(sessionStorage, claveDelBorradorDeTabla(tablaId)),
        version,
      )
    } catch {
      return null
    }
  })
  return recuperado
}

type Args = { tablaId: string; version: number; estado: EstadoDelEditor; cambios: boolean }

const guardarYa = (clave: string, version: number, estado: EstadoDelEditor, cambios: boolean) => {
  if (cambios) {
    guardarBorrador(sessionStorage, clave, borradorParaGuardar({ version, ...estado }))
  } else {
    borrarBorrador(sessionStorage, clave)
  }
}

// Guarda lo editado 300 ms después del último cambio y, sin cambios, no deja borrador. Mientras se publica no guarda y no queda borrador (`pausar()`): si entra, el editor
// se vuelve a montar con la versión nueva y no tiene que encontrar uno viejo; si no entra, `reanudar()` lo vuelve a guardar.
export function useBorradorDeTabla({ tablaId, version, estado, cambios }: Args) {
  const clave = claveDelBorradorDeTabla(tablaId)
  const pausado = useRef(false)
  useEffect(() => {
    if (pausado.current) return
    const espera = setTimeout(() => {
      if (!pausado.current) guardarYa(clave, version, estado, cambios)
    }, ESPERA_MS)
    return () => {
      clearTimeout(espera)
    }
  }, [clave, version, estado, cambios])
  return {
    borrar: () => {
      borrarBorrador(sessionStorage, clave)
    },
    pausar: () => {
      pausado.current = true
      borrarBorrador(sessionStorage, clave)
    },
    reanudar: () => {
      pausado.current = false
      guardarYa(clave, version, estado, cambios)
    },
  }
}

export type BorradorDeTablaEnUso = ReturnType<typeof useBorradorDeTabla>
