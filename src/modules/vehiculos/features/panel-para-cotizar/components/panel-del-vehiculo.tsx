'use client'

import { parseAsString, useQueryStates } from 'nuqs'
import { useMemo, useState, type ReactNode, type RefObject } from 'react'
import { CLAVE_DE_CURSOR, CLAVE_DE_PANEL } from '@/shared/lib/filtros'
import { useAtajo } from '@/shared/ui/atajos'
import { Button } from '@/shared/ui/button'
import { Drawer } from '@/shared/ui/drawer'
import { PestanasConDesborde } from '@/shared/ui/pestanas-con-desborde'
import {
  desdeDelCierre,
  listaDelPanel,
  type VehiculoElegido,
} from '../../../entities/panel-para-cotizar'
import { Miniatura } from '../../listado/components/miniatura'
import { CLAVE_DE_BUSQUEDA, CLAVE_DE_LISTA } from '../claves'
import { useListaDelPanel } from '../hooks/use-lista-del-panel'
import { BuscadorDelPanel } from './buscador-del-panel'
import { ListaDelPanel } from './lista-del-panel'

type Props = {
  abierto: boolean
  alCerrar: () => void
  origenId: string
  esSubasta: boolean
  elegido: VehiculoElegido | null
  claveDeLaUrl: string
  // El historial del elegido (lo arma la página; `vehiculos` no conoce `cotizaciones`): va dentro de «Elegido», debajo de su título. Sin elegido no se dibuja.
  historial?: ReactNode
  focoAlCerrar?: RefObject<HTMLButtonElement | null>
}

// El panel del vehículo de la hoja de cotizar (`?panel=vehiculo`): el elegido arriba y, en pestañas, los vehículos del origen por
// «Últ. cotización» o «Cierre subasta», por cursor. Elegir o quitar escribe el vehículo de la hoja y quita el panel, su pestaña y su
// página en una sola escritura de la URL, que va al servidor (la hoja se abre con el vehículo nuevo) y reemplaza la entrada de abrir el
// panel: «atrás» vuelve a la hoja de antes con el panel cerrado. Por `nuqs` y no con el router: el panel lee su URL de `nuqs`, que no
// se entera de un `router.replace`. Mientras está abierto, Ctrl+S no guarda la hoja que quedó detrás.
export function PanelDelVehiculo(props: Props) {
  const { abierto, alCerrar, origenId, esSubasta, elegido, claveDeLaUrl, historial, focoAlCerrar } =
    props
  const parsers = useMemo(
    () =>
      Object.fromEntries(
        [CLAVE_DE_PANEL, CLAVE_DE_LISTA, CLAVE_DE_BUSQUEDA, CLAVE_DE_CURSOR, claveDeLaUrl].map(
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
        [CLAVE_DE_LISTA]: null,
        [CLAVE_DE_BUSQUEDA]: null,
        [CLAVE_DE_CURSOR]: null,
        [claveDeLaUrl]: id,
      },
      { history: 'replace', shallow: false },
    )
  }
  return (
    <Drawer abierto={abierto} alCerrar={alCerrar} titulo="Vehículo" focoAlCerrar={focoAlCerrar}>
      {abierto ? (
        <ContenidoDelPanel
          origenId={origenId}
          esSubasta={esSubasta}
          elegido={elegido}
          historial={historial}
          alElegir={ir}
        />
      ) : null}
    </Drawer>
  )
}

const PESTANAS = [
  { clave: 'ultima', titulo: 'Últ. cotización' },
  { clave: 'cierre', titulo: 'Cierre subasta' },
] as const

// Se monta en cada apertura: el borde de «Cierre subasta» se toma al abrir y queda fijo mientras el panel está abierto.
function ContenidoDelPanel(props: {
  origenId: string
  esSubasta: boolean
  elegido: VehiculoElegido | null
  historial: ReactNode
  alElegir: (id: string | null) => void
}) {
  const { origenId, esSubasta, elegido, historial, alElegir } = props
  const [desde] = useState(() => desdeDelCierre(new Date()))
  const { lista, pestana, texto, leido, leida, cambiarLista, cambiarTexto, irA, reintentar } =
    useListaDelPanel({
      origenId,
      esSubasta,
      desde,
    })
  return (
    // Una sola columna que no crece con lo de adentro: al 200 % en el celular, las pestañas no ensanchan las tarjetas.
    <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-4">
      <BuscadorDelPanel textoDeUrl={texto} aviso={leido.aviso} alCambiar={cambiarTexto} />
      {elegido ? (
        <section
          aria-label="Elegido"
          className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-2 rounded-(--radius-card) border border-(--color-line) p-2"
        >
          <div className="flex min-w-0 items-center gap-3">
            <Miniatura ruta={elegido.portadaRuta} className="w-12" />
            <span className="grid min-w-0 flex-1">
              <span className="text-(length:--text-xs) text-(--color-ink-soft)">Elegido</span>
              <span className="truncate font-medium text-(--color-ink)">{elegido.titulo}</span>
            </span>
            <Button
              type="button"
              variant="outline"
              className="h-11 md:h-9"
              onClick={() => {
                alElegir(null)
              }}
            >
              Quitar
            </Button>
          </div>
          {historial}
        </section>
      ) : null}
      {lista === 'busqueda' ? (
        <h3 className="text-(length:--text-sm) font-medium text-(--color-ink)">Resultados</h3>
      ) : esSubasta ? (
        // Al 200 % en el celular no entran las dos: la barra se desplaza dentro de su ancho y dice por dónde sigue.
        <PestanasConDesborde
          pestanas={PESTANAS}
          valor={pestana}
          alElegir={(clave) => {
            cambiarLista(listaDelPanel(clave, true))
          }}
        />
      ) : (
        <h3 className="text-(length:--text-sm) font-medium text-(--color-ink)">Últ. cotización</h3>
      )}
      <ListaDelPanel
        lista={lista}
        texto={leido.busqueda ?? ''}
        leida={leida}
        elegidoId={elegido?.id ?? null}
        alElegir={alElegir}
        alIr={irA}
        alReintentar={reintentar}
      />
    </div>
  )
}
