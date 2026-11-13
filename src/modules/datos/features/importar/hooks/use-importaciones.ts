'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { fallo, type ErrorApp, type Resultado } from '@/shared/lib/errores'
import { TOPE_DE_LO_CARGADO } from '@/shared/lib/paginacion'
import {
  leerImportaciones,
  NO_SE_LEYO_LA_LISTA,
  type PaginaDeImportaciones,
} from '../../../composicion.client'
import { fusionar, type ResumenDeImportacion } from '../../../entities/resumen-de-importacion'
import { useSondeoDeAvance } from './use-sondeo-de-avance'

// Sin cursor la página reemplaza lo leído; con cursor se suma sin repetir.
function juntar(
  previas: ResumenDeImportacion[] | null,
  nuevas: ResumenDeImportacion[],
  cursor: string | null,
): ResumenDeImportacion[] {
  if (cursor === null || previas === null) return nuevas
  const vistas = new Set(previas.map((r) => r.id))
  return [...previas, ...nuevas.filter((r) => !vistas.has(r.id))]
}

// La lista «Importaciones» de `/datos` (9.06-5, D55): se lee al abrir la sección (lista hija), de a 20 con «Ver más» hasta 500; las propias, o
// todas con `datos.importar.todo` (sólo elige el filtro: lo ajeno lo da o no la policy). Un pedido a la vez: la respuesta tarde se descarta.
// El avance de las que están en curso lo trae el sondeo y se funde en la lista sin moverla.
export function useImportaciones({ yo, todas }: { yo: string; todas: boolean }) {
  const [filas, setFilas] = useState<ResumenDeImportacion[] | null>(null)
  const [siguiente, setSiguiente] = useState<string | null>(null)
  const [error, setError] = useState<ErrorApp | null>(null)
  const [pidiendo, setPidiendo] = useState(false)
  // El reloj del navegador, fijado al llegar cada respuesta: lo que decide «En pausa» (D52).
  const [ahora, setAhora] = useState(0)
  const [recargas, setRecargas] = useState(0)
  const turno = useRef(0)

  // Lo que llega de un pedido; una respuesta de un pedido viejo se descarta.
  const aplicar = useCallback(
    (mio: number, leido: Resultado<PaginaDeImportaciones>, cursor: string | null) => {
      if (mio !== turno.current) return
      setPidiendo(false)
      setAhora(Date.now())
      if (!leido.ok) {
        setError(leido.error)
        return
      }
      setError(null)
      setSiguiente(leido.data.siguiente)
      setFilas((previas) => juntar(previas, leido.data.filas, cursor))
    },
    [],
  )

  function pedir(cursor: string | null) {
    turno.current += 1
    const mio = turno.current
    void leerImportaciones({ yo, todas, cursor })
      .catch(() => fallo('inesperado', NO_SE_LEYO_LA_LISTA))
      .then((leido) => {
        aplicar(mio, leido, cursor)
      })
  }

  // La primera página: al abrir la sección, con «Reintentar» y después de lanzar (`recargas`).
  useEffect(() => {
    turno.current += 1
    const mio = turno.current
    void leerImportaciones({ yo, todas, cursor: null })
      .catch(() => fallo('inesperado', NO_SE_LEYO_LA_LISTA))
      .then((leido) => {
        aplicar(mio, leido, null)
      })
    return () => {
      turno.current += 1
    }
  }, [yo, todas, recargas, aplicar])

  const recargar = () => {
    setRecargas((n) => n + 1)
  }

  const sondeo = useSondeoDeAvance(filas ?? [], (leidas) => {
    setAhora(Date.now())
    setFilas((previas) => (previas === null ? previas : fusionar(previas, leidas)))
  })

  const cargadas = filas?.length ?? 0
  return {
    estado: filas !== null ? 'lista' : error ? 'error' : 'cargando',
    filas: filas ?? [],
    // El error de «Ver más» con la lista ya dibujada.
    errorAlVerMas: filas !== null ? error : null,
    pidiendo,
    hayMas: siguiente !== null && cargadas < TOPE_DE_LO_CARGADO,
    enElTope: siguiente !== null && cargadas >= TOPE_DE_LO_CARGADO,
    ahora,
    avisoDelSondeo: sondeo.aviso,
    verMas: () => {
      if (pidiendo || siguiente === null || cargadas >= TOPE_DE_LO_CARGADO) return
      setPidiendo(true)
      pedir(siguiente)
    },
    recargar,
    // Después de lanzar: seguirla aunque la recarga falle, y traerla arriba.
    alLanzar: (id: string) => {
      sondeo.seguir(id)
      recargar()
    },
    resumenDe: (id: string) => filas?.find((r) => r.id === id) ?? sondeo.fueraDeLaLista(id),
  } as const
}

export type Importaciones = ReturnType<typeof useImportaciones>
