'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { fallo, type ErrorApp, type Resultado } from '@/shared/lib/errores'
import { TOPE_DE_LO_CARGADO } from '@/shared/lib/paginacion'
import { leerRevisiones } from '../../../composicion-revisiones.client'
import {
  type EtiquetasDeRevisiones,
  type PaginaDeRevisiones,
  type RevisionDeLaCotizacion,
} from '../../../entities/revisiones'

// Lo leído de UNA versión de la cotización: `version` es su `actualizadoEn`. Si la cotización cambia (otro guardado, una recarga), lo leído era de otra y se olvida.
// `error` es el del último pedido: sin leer es el de la primera página; leída, el de «Ver más» (lo leído se queda).
type Estado = {
  version: string
  revisiones: RevisionDeLaCotizacion[]
  etiquetas: EtiquetasDeRevisiones
  siguiente: number | null
  leido: boolean
  cargandoMas: boolean
  error: ErrorApp | null
}

const sinLeer = (version: string): Estado => ({
  version,
  revisiones: [],
  etiquetas: { nodos: new Map(), grupos: new Map() },
  siguiente: null,
  leido: false,
  cargandoMas: false,
  error: null,
})

const caido = (): Resultado<PaginaDeRevisiones> =>
  fallo('inesperado', 'No se pudieron cargar las revisiones.')

// Suma una página a lo leído: sus filas al final y sus etiquetas a las que ya había.
function juntar(antes: Estado, pagina: PaginaDeRevisiones): Estado {
  return {
    ...antes,
    revisiones: [...antes.revisiones, ...pagina.revisiones],
    etiquetas: {
      nodos: new Map([...antes.etiquetas.nodos, ...pagina.etiquetas.nodos]),
      grupos: new Map([...antes.etiquetas.grupos, ...pagina.etiquetas.grupos]),
    },
    siguiente: pagina.siguiente,
    leido: true,
    cargandoMas: false,
    error: null,
  }
}

type Parametros = { cotizacionId: string; version: string; abierto: boolean }

// Las revisiones de una cotización guardada, de a `TAMANO_DE_VER_MAS` por cursor y hasta `TOPE_DE_LO_CARGADO`. La primera página se lee al abrir el panel (y no otra vez con la misma
// versión); cada «Ver más» pide la siguiente. La posición no va a la URL. Una respuesta de un pedido que ya no es el último (otra versión, el panel ya no está) se descarta.
export function useRevisiones({ cotizacionId, version, abierto }: Parametros) {
  const [guardado, setGuardado] = useState<Estado>(() => sinLeer(version))
  const estado = guardado.version === version ? guardado : sinLeer(version)
  const ultimo = useRef(0)
  const enVuelo = useRef(false) // un «Ver más» en vuelo: dos toques seguidos no piden la misma página

  useEffect(() => {
    ultimo.current += 1
    enVuelo.current = false
    return () => {
      ultimo.current += 1
      enVuelo.current = false
    }
  }, [cotizacionId, version])

  const aplicar = useCallback((deVersion: string, cambio: (antes: Estado) => Estado) => {
    setGuardado((g) => cambio(g.version === deVersion ? g : sinLeer(deVersion)))
  }, [])
  // La primera página: al abrir, y otra vez tras un error si piden «Reintentar» (el error se limpia al pedirlo).
  const porLeer = abierto && !estado.leido && estado.error === null
  useEffect(() => {
    if (!porLeer) {
      return
    }
    let vigente = true
    leerRevisiones({ cotizacionId, antes: null })
      .catch(caido)
      .then((resultado) => {
        if (vigente) {
          aplicar(version, (antes) =>
            resultado.ok ? juntar(antes, resultado.data) : { ...antes, error: resultado.error },
          )
        }
      })
      .catch(() => undefined)
    return () => {
      vigente = false
    }
  }, [porLeer, cotizacionId, version, aplicar])

  const pedirMas = (antes: number) => {
    if (enVuelo.current) {
      return
    }
    enVuelo.current = true
    ultimo.current += 1
    const pedido = ultimo.current
    aplicar(version, (e) => ({ ...e, cargandoMas: true, error: null }))
    leerRevisiones({ cotizacionId, antes })
      .catch(caido)
      .then((resultado) => {
        if (pedido === ultimo.current) {
          enVuelo.current = false
          aplicar(version, (e) =>
            resultado.ok
              ? juntar(e, resultado.data)
              : { ...e, cargandoMas: false, error: resultado.error },
          )
        }
      })
      .catch(() => undefined)
  }

  const hayMasParaPedir = estado.siguiente !== null && estado.revisiones.length < TOPE_DE_LO_CARGADO
  return {
    ...estado,
    enElTope: estado.siguiente !== null && estado.revisiones.length >= TOPE_DE_LO_CARGADO,
    hayMasParaPedir,
    verMas: () => {
      if (hayMasParaPedir && !estado.cargandoMas && estado.siguiente !== null) {
        pedirMas(estado.siguiente)
      }
    },
    reintentar: () => {
      if (estado.cargandoMas) {
        return
      }
      if (estado.leido && estado.siguiente !== null) {
        pedirMas(estado.siguiente)
      } else if (!estado.leido) {
        // Limpiar el error vuelve a disparar la lectura de la primera página.
        aplicar(version, (e) => ({ ...e, error: null }))
      }
    },
  }
}
