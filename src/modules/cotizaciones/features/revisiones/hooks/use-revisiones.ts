'use client'

import { useCallback, useEffect, useState } from 'react'
import { leerRevisiones } from '../../../composicion-revisiones.client'
import { usePedidosDeRevisiones } from './use-pedidos-de-revisiones'
import { caido, juntar, sinLeer, type Estado } from './ventana-de-revisiones'

type Parametros = { cotizacionId: string; version: string; abierto: boolean }

// Las revisiones de una cotización guardada, de a `TAMANO_DE_VER_MAS` por cursor y hasta `TOPE_DE_LO_CARGADO`. La primera página se lee al abrir el panel (y no otra vez con la misma
// versión); los pedidos de después (`usePedidosDeRevisiones`) son «Ver más», «Ir a una fecha» (reemplaza lo leído por el día elegido y lo anterior) y «Volver a las más recientes»
// (4.17-5c); la posición no va a la URL. Un solo pedido en vuelo (`useTurno`): ningún otro se adelanta a él.
export function useRevisiones({ cotizacionId, version, abierto }: Parametros) {
  const [guardado, setGuardado] = useState<Estado>(() => sinLeer(version))
  const estado = guardado.version === version ? guardado : sinLeer(version)

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
    leerRevisiones({ cotizacionId, antes: null, hasta: null })
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

  const pedidos = usePedidosDeRevisiones(cotizacionId, estado, (cambio) => {
    aplicar(version, cambio)
  })
  return {
    ...estado,
    ocupado: estado.pidiendo !== null,
    cargandoMas: estado.pidiendo === 'mas',
    ...pedidos,
  }
}
