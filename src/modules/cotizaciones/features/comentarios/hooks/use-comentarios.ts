'use client'

import { useCallback, useEffect, useState } from 'react'
import { leerComentarios, leerRespuestas } from '../../../areas/comentarios/composicion.client'
import {
  cursorDeUnDia,
  enElTopeDeComentarios,
  type ListaDeComentarios,
} from '../../../entities/comentarios/lista'
import {
  caido,
  conMas,
  conPrimera,
  ESTADO_INICIAL,
  leerDesde,
  RAICES,
  type EstadoDeComentarios,
} from './estado-de-comentarios'

// Lee la primera página cuando hace falta (al montarse, al recargar, al ir a una fecha), sin pisar una lectura más nueva.
function useLecturaDeLaPrimera(
  estado: EstadoDeComentarios,
  aplicar: (cambio: (antes: EstadoDeComentarios) => EstadoDeComentarios) => void,
  cotizacionId: string,
  zona: string,
) {
  const { pedido, desde, leida, error } = estado.primera
  const porLeer = !leida && error === null
  useEffect(() => {
    if (!porLeer) {
      return
    }
    let vigente = true
    leerComentarios({ cotizacionId, cursor: desde === null ? null : cursorDeUnDia(desde, zona) })
      .catch(caido)
      .then((resultado) => {
        if (vigente) {
          aplicar((antes) => conPrimera(antes, pedido, resultado))
        }
      })
      .catch(() => undefined)
    return () => {
      vigente = false
    }
  }, [porLeer, pedido, desde, cotizacionId, zona, aplicar])
  return porLeer
}

// Los comentarios de una cotización, leídos desde el navegador al montarse la sección (4.27-2): de a `TAMANO_DE_VER_MAS` raíces por cursor hasta
// `TOPE_DE_LO_CARGADO` entre raíces y respuestas. «Ir a una fecha» reemplaza lo leído por ese día y lo anterior; «Volver a los más recientes» y «Recargar»
// vuelven a leer la primera página. Un «Ver más» a la vez.
export function useComentarios(cotizacionId: string, zona: string) {
  const [estado, setEstado] = useState<EstadoDeComentarios>(ESTADO_INICIAL)
  const cambiarEstado = useCallback(
    (cambio: (antes: EstadoDeComentarios) => EstadoDeComentarios) => {
      setEstado(cambio)
    },
    [],
  )
  const leyendo = useLecturaDeLaPrimera(estado, cambiarEstado, cotizacionId, zona)
  const { lista, pidiendo, fallo, primera } = estado

  async function pedirMas(donde: string): Promise<void> {
    if (pidiendo !== null || leyendo) {
      return
    }
    const deLaLectura = primera.pedido
    setEstado((antes) => ({ ...antes, pidiendo: donde, fallo: null }))
    const raiz = lista.raices.find((r) => r.id === donde)
    const resultado = await (
      donde === RAICES
        ? leerComentarios({ cotizacionId, cursor: lista.cursor })
        : leerRespuestas({ comentarioId: donde, cursor: raiz?.cursorDeRespuestas ?? null })
    ).catch(caido)
    setEstado((antes) => conMas(antes, deLaLectura, donde, resultado))
  }
  const leer = (dia: string | null) => {
    setEstado((antes) => leerDesde(antes, dia))
  }

  const enElTope = enElTopeDeComentarios(lista)
  return {
    lista,
    puedeModerar: estado.puedeModerar,
    cargada: estado.cargada,
    leyendo,
    errorDeLectura: primera.error,
    desde: primera.desde,
    pidiendo,
    cargandoMas: pidiendo === RAICES,
    fallo,
    falloDeRaices: fallo?.donde === RAICES ? fallo.error : null,
    ocupado: leyendo || pidiendo !== null,
    enElTope,
    hayMasParaPedir: lista.hayMas && !enElTope,
    verMas: () => void pedirMas(RAICES),
    verMasRespuestas: (raizId: string) => void pedirMas(raizId),
    reintentar: () => (fallo ? void pedirMas(fallo.donde) : leer(primera.desde)),
    recargar: () => {
      leer(primera.desde)
    },
    irAUnaFecha: leer,
    volverALosRecientes: () => {
      leer(null)
    },
    // Lo que devuelve una escritura, aplicado a lo cargado.
    aplicar: useCallback((cambio: (lista: ListaDeComentarios) => ListaDeComentarios) => {
      setEstado((antes) => ({ ...antes, lista: cambio(antes.lista) }))
    }, []),
  }
}

export type Comentarios = ReturnType<typeof useComentarios>
