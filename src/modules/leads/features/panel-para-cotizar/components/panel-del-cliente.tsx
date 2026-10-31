'use client'

import { parseAsString, useQueryStates } from 'nuqs'
import { useMemo, type RefObject } from 'react'
import { CLAVE_DE_CURSOR, CLAVE_DE_PANEL } from '@/shared/lib/filtros'
import { useAtajo } from '@/shared/ui/atajos'
import { Drawer } from '@/shared/ui/drawer'
import { PestanasConDesborde } from '@/shared/ui/pestanas-con-desborde'
import { nombreDelTipo } from '../../../entities/catalogos'
import {
  PESTANAS_DEL_PANEL,
  pestanaDelPanel,
  TITULO_DE_LA_PESTANA,
  type ClienteElegido,
} from '../../../entities/panel-para-cotizar'
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
  focoAlCerrar,
}: Props) {
  const parsers = useMemo(
    () =>
      Object.fromEntries(
        [CLAVE_DE_PANEL, CLAVE_DE_CLASE, CLAVE_DE_BUSQUEDA, CLAVE_DE_CURSOR, claveDeLaUrl].map(
          (clave) => [clave, parseAsString],
        ),
      ),
    [claveDeLaUrl],
  )
  const [, escribir] = useQueryStates(parsers)
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
  return (
    <Drawer abierto={abierto} alCerrar={alCerrar} titulo="Cliente" focoAlCerrar={focoAlCerrar}>
      {abierto ? (
        <ContenidoDelPanel elegido={elegido} numeroGlobal={numeroGlobal} alElegir={ir} />
      ) : null}
    </Drawer>
  )
}

// Se monta en cada apertura.
function ContenidoDelPanel(props: {
  elegido: ClienteElegido | null
  numeroGlobal: boolean
  alElegir: (id: string | null) => void
}) {
  const { elegido, numeroGlobal, alElegir } = props
  const { lista, pestana, texto, leido, leida, cambiarPestana, cambiarTexto, irA, reintentar } =
    useClientesDelPanel({ numeroGlobal })
  const tipoDelElegido =
    elegido && leida.estado === 'lista' ? nombreDelTipo(leida.tipos, elegido.tipoId) : null
  return (
    // Una sola columna que no crece con lo de adentro: al 200 % en el celular, las pestañas no ensanchan las tarjetas.
    <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-4">
      <BuscadorDeClientes textoDeUrl={texto} aviso={leido.aviso} alCambiar={cambiarTexto} />
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
