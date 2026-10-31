'use client'

import { parseAsString, useQueryStates } from 'nuqs'
import { useEffect, useMemo, useRef, type RefObject } from 'react'
import { CLAVE_DE_CURSOR, CLAVE_DE_PANEL } from '@/shared/lib/filtros'
import { useAtajo } from '@/shared/ui/atajos'
import { Drawer } from '@/shared/ui/drawer'
import { PestanasConDesborde } from '@/shared/ui/pestanas-con-desborde'
import { nombreDelTipo } from '../../../entities/catalogos'
import { CLAVE_DE_ELEGIR } from '../../../entities/elegir-al-crear'
import {
  PESTANAS_DEL_PANEL,
  pestanaDelPanel,
  TITULO_DE_LA_PESTANA,
  type ClienteElegido,
} from '../../../entities/panel-para-cotizar'
import { PANEL_NUEVO_LEAD } from '../../alta/hooks/use-panel-de-alta'
import { CLAVE_DE_BUSQUEDA, CLAVE_DE_CLASE } from '../claves'
import { useClientesDelPanel } from '../hooks/use-clientes-del-panel'
import { BuscadorDeClientes } from './buscador-de-clientes'
import { ElegidoDelPanel } from './elegido-del-panel'
import { ListaDeClientes } from './lista-de-clientes'

type Props = {
  abierto: boolean
  alCerrar: () => void
  elegido: ClienteElegido | null
  claveDeLaUrl: string
  numeroGlobal: boolean
  // `leads.crear` (lo decide la página con `puede()`): con él, el campo lleva «+», que abre «Nuevo lead».
  puedeCrear: boolean
  focoAlCerrar?: RefObject<HTMLButtonElement | null>
}

const PESTANAS = PESTANAS_DEL_PANEL.map((clave) => ({
  clave,
  titulo: TITULO_DE_LA_PESTANA[clave],
}))

// El panel del cliente de la hoja de cotizar (`?panel=cliente`): el elegido arriba y, en pestañas, «míos» por lo más reciente (todos, o los de una clase), por
// cursor; o, con un texto, la búsqueda por nombre o número. Elegir o quitar escribe el lead de la hoja y quita el panel, su pestaña, lo buscado y su página en
// una sola escritura de la URL, que va al servidor (la hoja se abre con el lead nuevo) y reemplaza la entrada de abrir el panel: «atrás» vuelve a la hoja de
// antes con el panel cerrado. Por `nuqs` y no con el router: el panel lee su URL de `nuqs`, que no se entera de un `router.replace`. Mientras está abierto,
// Ctrl+S no guarda la hoja que quedó detrás.
export function PanelDelCliente({
  abierto,
  alCerrar,
  elegido,
  claveDeLaUrl,
  numeroGlobal,
  puedeCrear,
  focoAlCerrar,
}: Props) {
  const parsers = useMemo(
    () =>
      Object.fromEntries(
        [
          CLAVE_DE_PANEL,
          CLAVE_DE_CLASE,
          CLAVE_DE_BUSQUEDA,
          CLAVE_DE_CURSOR,
          CLAVE_DE_ELEGIR,
          claveDeLaUrl,
        ].map((clave) => [clave, parseAsString]),
      ),
    [claveDeLaUrl],
  )
  const [, escribir] = useQueryStates(parsers)
  // Al pasar a «Nuevo lead» el foco es del teléfono: el que devuelve este panel al terminar de cerrarse (un instante después) se lo quitaría a media palabra.
  const haciaElAlta = useRef(false)
  useEffect(() => {
    if (abierto) {
      haciaElAlta.current = false
    }
  }, [abierto])
  const foco = () => (haciaElAlta.current ? false : (focoAlCerrar?.current ?? true))
  // El último registro responde: el de la hoja queda tapado mientras el panel está abierto.
  useAtajo('guardar', () => undefined, abierto)
  const ir = (id: string | null) => {
    void escribir(
      {
        [CLAVE_DE_PANEL]: null,
        [CLAVE_DE_CLASE]: null,
        [CLAVE_DE_BUSQUEDA]: null,
        [CLAVE_DE_CURSOR]: null,
        [claveDeLaUrl]: id,
      },
      { history: 'replace', shallow: false },
    )
  }
  // «Nuevo lead» es el del shell, con su borrador y la verificación del teléfono: el panel sólo lo abre, diciéndole en qué clave de la URL dejar al creado. Una
  // sola escritura que cierra este panel y abre aquél, reemplazando la entrada de abrir el panel (como elegir) y sin ir al servidor.
  const nuevoLead = () => {
    haciaElAlta.current = true
    void escribir(
      {
        [CLAVE_DE_PANEL]: PANEL_NUEVO_LEAD,
        [CLAVE_DE_ELEGIR]: claveDeLaUrl,
        [CLAVE_DE_CLASE]: null,
        [CLAVE_DE_BUSQUEDA]: null,
        [CLAVE_DE_CURSOR]: null,
      },
      { history: 'replace' },
    )
  }
  return (
    <Drawer abierto={abierto} alCerrar={alCerrar} titulo="Cliente" focoAlCerrar={foco}>
      {abierto ? (
        <ContenidoDelPanel
          elegido={elegido}
          numeroGlobal={numeroGlobal}
          alElegir={ir}
          alNuevoLead={puedeCrear ? nuevoLead : undefined}
        />
      ) : null}
    </Drawer>
  )
}

// Se monta en cada apertura.
function ContenidoDelPanel(props: {
  elegido: ClienteElegido | null
  numeroGlobal: boolean
  alElegir: (id: string | null) => void
  alNuevoLead: (() => void) | undefined
}) {
  const { elegido, numeroGlobal, alElegir, alNuevoLead } = props
  const { lista, pestana, texto, leido, leida, cambiarPestana, cambiarTexto, irA, reintentar } =
    useClientesDelPanel({ numeroGlobal })
  const tipoDelElegido =
    elegido && leida.estado === 'lista' ? nombreDelTipo(leida.tipos, elegido.tipoId) : null
  return (
    // Una sola columna que no crece con lo de adentro: al 200 % en el celular, las pestañas no ensanchan las tarjetas.
    <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-4">
      <BuscadorDeClientes
        textoDeUrl={texto}
        aviso={leido.aviso}
        alCambiar={cambiarTexto}
        alNuevoLead={alNuevoLead}
      />
      {elegido ? (
        <ElegidoDelPanel
          elegido={elegido}
          tipo={tipoDelElegido}
          alQuitar={() => {
            alElegir(null)
          }}
        />
      ) : null}
      {lista === 'busqueda' ? (
        <h3 className="text-(length:--text-sm) font-medium text-(--color-ink)">Resultados</h3>
      ) : (
        // Al 200 % en el celular no entran las tres: la barra se desplaza dentro de su ancho y dice por dónde sigue.
        <PestanasConDesborde
          pestanas={PESTANAS}
          valor={pestana}
          alElegir={(clave) => {
            cambiarPestana(pestanaDelPanel(clave))
          }}
        />
      )}
      <ListaDeClientes
        lista={lista}
        texto={leido.busqueda?.texto ?? ''}
        leida={leida}
        elegidoId={elegido?.id ?? null}
        alElegir={alElegir}
        alIr={irA}
        alReintentar={reintentar}
      />
    </div>
  )
}
