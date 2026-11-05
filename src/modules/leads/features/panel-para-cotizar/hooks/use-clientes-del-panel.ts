'use client'

import { debounce, parseAsString, useQueryStates } from 'nuqs'
import { useEffect, useMemo, useState } from 'react'
import { fallo, type ErrorApp, type Resultado } from '@/shared/lib/errores'
import { CLAVE_DE_CURSOR } from '@/shared/lib/filtros'
import { leerCursor, type Pagina } from '@/shared/lib/paginacion'
import { leerClientesDelPanel } from '../../../composicion.client'
import type { TipoDeLeadEnCatalogo } from '../../../entities/catalogos'
import {
  idsDeTiposDeLaClase,
  leerTextoDelPanel,
  pestanaDelPanel,
  type ClienteDelPanel,
  type ListaDelPanel,
  type PestanaDelPanel,
} from '../../../entities/panel-para-cotizar'
import { CLAVE_DE_BUSQUEDA, CLAVE_DE_CLASE, PAUSA_AL_TIPEAR_MS } from '../claves'
import { MENSAJE_DE_LECTURA, useCatalogoDelPanel } from './use-catalogo-del-panel'

const PARAMETROS = {
  [CLAVE_DE_CLASE]: parseAsString,
  [CLAVE_DE_BUSQUEDA]: parseAsString,
  [CLAVE_DE_CURSOR]: parseAsString,
}

export type ListaLeida =
  | { estado: 'cargando' }
  | { estado: 'lista'; pagina: Pagina<ClienteDelPanel>; tipos: readonly TipoDeLeadEnCatalogo[] }
  | { estado: 'error'; error: ErrorApp }

// Lo que se muestra: el error del catálogo manda (las filas no se pueden nombrar sin él), y mientras no llegan la página de este pedido y el catálogo, se está cargando.
function leidaDe(
  resultado: Resultado<Pagina<ClienteDelPanel>> | null,
  tipos: readonly TipoDeLeadEnCatalogo[] | null,
  errorDelCatalogo: ErrorApp | null,
): ListaLeida {
  if (errorDelCatalogo !== null) {
    return { estado: 'error', error: errorDelCatalogo }
  }
  if (resultado === null || tipos === null) {
    return { estado: 'cargando' }
  }
  return resultado.ok
    ? { estado: 'lista', pagina: resultado.data, tipos }
    : { estado: 'error', error: resultado.error }
}

type Opciones = {
  // `leads.numero_global.ver` (lo decide la página con `puede()`): con él «#n» busca el número global y el propio de cualquier creador.
  numeroGlobal: boolean
}

// La pestaña (`?clase=`), lo que se busca (`?buscar=`) y la página (`?cursor=`) del panel del cliente, y la lectura que les toca: con un texto que se busca
// (`leerTextoDelPanel()`) manda la búsqueda y las pestañas se esconden; con uno que no alcanza, siguen las pestañas. Se escriben en la URL sin ir al servidor y
// reemplazando la entrada del historial: pedirle la página al servidor volvería a montar la hoja abierta detrás, y «atrás» cierra el panel en vez de recorrer
// sus páginas. El catálogo de tipos se lee al abrir —en «Todos» y en la búsqueda, a la vez que la primera página; la pestaña de una clase lo espera, porque
// necesita los ids de sus tipos— y la lista se muestra cuando llegan los dos; si el catálogo no llega, toda la lista es el error. Cada respuesta guarda el
// pedido que la trajo: mientras no llega la del actual, se está cargando, y una que llega tarde no se muestra.
export function useClientesDelPanel({ numeroGlobal }: Opciones) {
  const [url, escribir] = useQueryStates(PARAMETROS, { history: 'replace' })
  const pestana = pestanaDelPanel(url[CLAVE_DE_CLASE])
  const texto = url[CLAVE_DE_BUSQUEDA] ?? ''
  const leido = useMemo(() => leerTextoDelPanel(texto), [texto])
  const busqueda = leido.busqueda
  const lista: ListaDelPanel = busqueda === null ? pestana : 'busqueda'
  const cursorDeUrl = url[CLAVE_DE_CURSOR] ?? ''
  const [intento, setIntento] = useState(0)
  const { tipos, error: errorDelCatalogo } = useCatalogoDelPanel(intento)
  const textoDeLaBusqueda = busqueda?.texto ?? ''
  const clave = `${lista}|${textoDeLaBusqueda}|${cursorDeUrl}|${String(intento)}`
  const [respuesta, setRespuesta] = useState<{
    clave: string
    resultado: Resultado<Pagina<ClienteDelPanel>>
  } | null>(null)

  // La pestaña de una clase pide los tipos de esa clase: no sale hasta tener el catálogo. «Todos» y la búsqueda no dependen de él: que llegue no los vuelve a pedir.
  const deUnaClase = lista === 'prospecto' || lista === 'cliente'
  const esperaElCatalogo = deUnaClase && tipos === null
  const tiposDeLaClase =
    deUnaClase && tipos !== null ? idsDeTiposDeLaClase(tipos, lista).join('|') : ''
  useEffect(() => {
    if (esperaElCatalogo) {
      return undefined
    }
    let vigente = true
    leerClientesDelPanel({
      lista,
      tiposDeLaClase: tiposDeLaClase === '' ? [] : tiposDeLaClase.split('|'),
      cursor: leerCursor(cursorDeUrl),
      busqueda,
      todos: numeroGlobal,
    })
      .catch(() => fallo('inesperado', MENSAJE_DE_LECTURA))
      .then((resultado) => {
        if (vigente) {
          setRespuesta({ clave, resultado })
        }
      })
      .catch(() => undefined)
    return () => {
      vigente = false
    }
  }, [clave, esperaElCatalogo, lista, busqueda, cursorDeUrl, numeroGlobal, tiposDeLaClase])

  const leida = leidaDe(
    respuesta?.clave === clave ? respuesta.resultado : null,
    tipos,
    errorDelCatalogo,
  )

  return {
    lista,
    pestana,
    // Lo que dice la URL y lo que se entiende de eso.
    texto,
    leido,
    leida,
    cambiarPestana: (nueva: PestanaDelPanel) => {
      void escribir({ [CLAVE_DE_CLASE]: nueva, [CLAVE_DE_CURSOR]: null })
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
