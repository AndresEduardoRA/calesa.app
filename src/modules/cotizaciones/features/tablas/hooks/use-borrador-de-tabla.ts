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

// Guarda lo editado 300 ms después del último cambio y, sin cambios, no deja borrador. `apagar()` (tras publicar) lo borra y deja de guardar: lo que quede en memoria es
// de la versión vieja hasta que el editor se vuelva a montar con la nueva.
export function useBorradorDeTabla({ tablaId, version, estado, cambios }: Args) {
  const clave = claveDelBorradorDeTabla(tablaId)
  const apagado = useRef(false)
  useEffect(() => {
    if (apagado.current) return
    const espera = setTimeout(() => {
      if (apagado.current) return
      if (cambios) {
        guardarBorrador(sessionStorage, clave, borradorParaGuardar({ version, ...estado }))
      } else {
        borrarBorrador(sessionStorage, clave)
      }
    }, ESPERA_MS)
    return () => {
      clearTimeout(espera)
    }
  }, [clave, version, estado, cambios])
  return {
    borrar: () => {
      borrarBorrador(sessionStorage, clave)
    },
    apagar: () => {
      apagado.current = true
      borrarBorrador(sessionStorage, clave)
    },
  }
}
