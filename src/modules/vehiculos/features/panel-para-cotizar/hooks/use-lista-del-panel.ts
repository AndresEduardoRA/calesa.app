'use client'

import { parseAsString, useQueryStates } from 'nuqs'
import { useEffect, useState } from 'react'
import { fallo, type ErrorApp, type Resultado } from '@/shared/lib/errores'
import { CLAVE_DE_CURSOR } from '@/shared/lib/filtros'
import { leerCursor, type Pagina } from '@/shared/lib/paginacion'
import { leerListaDelPanel } from '../../../composicion.client'
import {
  listaDelPanel,
  type ListaDelPanel,
  type VehiculoDelPanel,
} from '../../../entities/panel-para-cotizar'
import { CLAVE_DE_LISTA } from '../claves'

const PARAMETROS = { [CLAVE_DE_LISTA]: parseAsString, [CLAVE_DE_CURSOR]: parseAsString }

export type ListaLeida =
  | { estado: 'cargando' }
  | { estado: 'lista'; pagina: Pagina<VehiculoDelPanel> }
  | { estado: 'error'; error: ErrorApp }

type Opciones = { origenId: string; esSubasta: boolean; desde: string }

// La pestaña (`?lista=`) y la página (`?cursor=`) del panel del vehículo, y la lectura que les toca. Se escriben en la URL sin ir al
// servidor y reemplazando la entrada del historial: pedirle la página al servidor volvería a montar la hoja abierta detrás, y «atrás»
// cierra el panel en vez de recorrer sus páginas. Cada respuesta guarda el pedido que la trajo: mientras no llega la del actual, se está
// cargando, y una que llega tarde (de otra pestaña o página) no se muestra.
export function useListaDelPanel({ origenId, esSubasta, desde }: Opciones) {
  const [url, escribir] = useQueryStates(PARAMETROS, { history: 'replace' })
  const lista = listaDelPanel(url[CLAVE_DE_LISTA], esSubasta)
  const cursorDeUrl = url[CLAVE_DE_CURSOR] ?? ''
  const [intento, setIntento] = useState(0)
  const clave = `${lista}|${cursorDeUrl}|${String(intento)}`
  const [respuesta, setRespuesta] = useState<{
    clave: string
    resultado: Resultado<Pagina<VehiculoDelPanel>>
  } | null>(null)

  useEffect(() => {
    let vigente = true
    const cursor = leerCursor(cursorDeUrl)
    leerListaDelPanel({ origenId, lista, desde, cursor })
      .catch(() => fallo('inesperado', 'No se pudieron cargar los vehículos.'))
      .then((resultado) => {
        if (vigente) {
          setRespuesta({ clave, resultado })
        }
      })
      .catch(() => undefined)
    return () => {
      vigente = false
    }
  }, [clave, origenId, lista, desde, cursorDeUrl])

  const leida: ListaLeida =
    respuesta?.clave !== clave
      ? { estado: 'cargando' }
      : respuesta.resultado.ok
        ? { estado: 'lista', pagina: respuesta.resultado.data }
        : { estado: 'error', error: respuesta.resultado.error }

  return {
    lista,
    leida,
    cambiarLista: (nueva: ListaDelPanel) => {
      void escribir({ [CLAVE_DE_LISTA]: nueva, [CLAVE_DE_CURSOR]: null })
    },
    irA: (cursor: string) => {
      void escribir({ [CLAVE_DE_CURSOR]: cursor })
    },
    reintentar: () => {
      setIntento((n) => n + 1)
    },
  }
}
