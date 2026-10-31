'use client'

import { debounce, parseAsString, useQueryStates } from 'nuqs'
import { useEffect, useMemo, useState } from 'react'
import { fallo, type ErrorApp, type Resultado } from '@/shared/lib/errores'
import { CLAVE_DE_CURSOR } from '@/shared/lib/filtros'
import { leerCursor, type Pagina } from '@/shared/lib/paginacion'
import { leerListaDelPanel } from '../../../composicion.client'
import {
  listaDelPanel,
  type ListaDelPanel,
  type PestanaDelPanel,
  type VehiculoDelPanel,
} from '../../../entities/panel-para-cotizar'
import { leerTextoDelPanel } from '../../../entities/texto-del-panel'
import { CLAVE_DE_BUSQUEDA, CLAVE_DE_LISTA, PAUSA_AL_TIPEAR_MS } from '../claves'

const PARAMETROS = {
  [CLAVE_DE_LISTA]: parseAsString,
  [CLAVE_DE_BUSQUEDA]: parseAsString,
  [CLAVE_DE_CURSOR]: parseAsString,
}

export type ListaLeida =
  | { estado: 'cargando' }
  | { estado: 'lista'; pagina: Pagina<VehiculoDelPanel> }
  | { estado: 'error'; error: ErrorApp }

type Opciones = { origenId: string; esSubasta: boolean; desde: string }

// La pestaña (`?lista=`), lo que se busca (`?buscar=`) y la página (`?cursor=`) del panel del vehículo, y la lectura que les toca: con un texto que
// se busca (`leerTextoDelPanel()`) manda la búsqueda y las pestañas se esconden; con uno que no alcanza, siguen las pestañas. Se escriben en la URL sin ir al
// servidor y reemplazando la entrada del historial: pedirle la página al servidor volvería a montar la hoja abierta detrás, y «atrás»
// cierra el panel en vez de recorrer sus páginas. Cada respuesta guarda el pedido que la trajo: mientras no llega la del actual, se está
// cargando, y una que llega tarde (de otra pestaña o página) no se muestra.
export function useListaDelPanel({ origenId, esSubasta, desde }: Opciones) {
  const [url, escribir] = useQueryStates(PARAMETROS, { history: 'replace' })
  const pestana = listaDelPanel(url[CLAVE_DE_LISTA], esSubasta)
  const texto = url[CLAVE_DE_BUSQUEDA] ?? ''
  const leido = useMemo(() => leerTextoDelPanel(texto), [texto])
  const busqueda = leido.busqueda ?? ''
  const lista: ListaDelPanel = busqueda === '' ? pestana : 'busqueda'
  const cursorDeUrl = url[CLAVE_DE_CURSOR] ?? ''
  const [intento, setIntento] = useState(0)
  const clave = `${lista}|${busqueda}|${cursorDeUrl}|${String(intento)}`
  const [respuesta, setRespuesta] = useState<{
    clave: string
    resultado: Resultado<Pagina<VehiculoDelPanel>>
  } | null>(null)

  useEffect(() => {
    let vigente = true
    const cursor = leerCursor(cursorDeUrl)
    leerListaDelPanel({
      origenId,
      lista,
      desde,
      cursor,
      texto: busqueda === '' ? undefined : busqueda,
    })
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
  }, [clave, origenId, lista, busqueda, desde, cursorDeUrl])

  const leida: ListaLeida =
    respuesta?.clave !== clave
      ? { estado: 'cargando' }
      : respuesta.resultado.ok
        ? { estado: 'lista', pagina: respuesta.resultado.data }
        : { estado: 'error', error: respuesta.resultado.error }

  return {
    lista,
    pestana,
    // Lo que dice la URL y lo que se entiende de eso.
    texto,
    leido,
    leida,
    cambiarLista: (nueva: PestanaDelPanel) => {
      void escribir({ [CLAVE_DE_LISTA]: nueva, [CLAVE_DE_CURSOR]: null })
    },
    // Escribir en la URL espera la pausa del tecleo; un texto nuevo vuelve a la primera página.
    cambiarTexto: (nuevo: string) => {
      void escribir(
        { [CLAVE_DE_BUSQUEDA]: nuevo === '' ? null : nuevo, [CLAVE_DE_CURSOR]: null },
        { limitUrlUpdates: debounce(PAUSA_AL_TIPEAR_MS) },
      )
    },
    irA: (cursor: string) => {
      void escribir({ [CLAVE_DE_CURSOR]: cursor })
    },
    reintentar: () => {
      setIntento((n) => n + 1)
    },
  }
}
