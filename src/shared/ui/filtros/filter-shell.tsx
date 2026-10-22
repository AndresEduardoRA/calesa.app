'use client'

import { SlidersHorizontalIcon } from 'lucide-react'
import { useRef, useState, type ReactNode, type RefObject } from 'react'
import { cn } from 'cn'
import { CORTE_DEL_PANEL, CORTE_DE_LA_TABLA } from '@/shared/lib/ancho'
import type { EsquemaDeFiltros } from '@/shared/lib/filtros'
import { useAlMenos } from '../ancho-de-pantalla'
import { Button } from '../button'
import { Drawer } from '../drawer'
import { ChipsDeFiltros } from './chips-de-filtros'
import { ContextoDeFiltros } from './contexto'
import { CampoDeBusqueda } from './controles-de-texto'
import { PanelDeFiltros } from './panel-de-filtros'
import { SelectorDelListado, type PorPaginaDeLaLista } from './selector-de-por-pagina'
import { useFiltros } from './use-filtros'
import { usePanelAlCostado } from './use-panel-al-costado'

// El panel de filtros entra al costado si el contenedor del listado mide 40 rem o más (`REM_PARA_EL_PANEL_AL_COSTADO`); si no, en una hoja
// inferior. Antes el corte era `lg` (1.024 px de pantalla): con el texto al 200 % los 15 rem del panel son 480 px y dejaban 176 a la lista
//. Hasta que se mide, vale lo que supuso el servidor por el ancho de la petición (antes, una pintura de escritorio podía abrir la hoja
// un instante) y después el contenedor de verdad.
function usePanelAlLado(contenedor: RefObject<HTMLElement | null>): boolean {
  return usePanelAlCostado(contenedor, useAlMenos(CORTE_DEL_PANEL))
}

// Abre el panel (o lo pliega, en escritorio) y dice cuántos filtros hay puestos.
function BotonDeFiltros(props: { cantidad: number; abierto: boolean; alPulsar: () => void }) {
  return (
    <Button
      variant="outline"
      className="h-11 md:h-9"
      aria-expanded={props.abierto}
      onClick={props.alPulsar}
    >
      <SlidersHorizontalIcon aria-hidden />
      Filtros
      {props.cantidad > 0 ? (
        <span className="rounded-full bg-(--color-primario) px-1.5 text-(length:--text-xs) text-(--color-sobre-primario) tabular-nums">
          {props.cantidad}
        </span>
      ) : null}
    </Button>
  )
}

// En el celular el panel va en una hoja inferior (`?panel=filtros`), con «Limpiar» y «Ver resultados».
function HojaDeFiltros(props: {
  abierta: boolean
  hayFiltros: boolean
  alLimpiar: () => void
  alCerrar: () => void
  children: ReactNode
}) {
  return (
    <Drawer
      lado="bottom"
      titulo="Filtros"
      abierto={props.abierta}
      alCerrar={props.alCerrar}
      pie={
        <div className="flex w-full justify-between gap-2">
          <Button variant="ghost" onClick={props.alLimpiar} disabled={!props.hayFiltros}>
            Limpiar
          </Button>
          <Button onClick={props.alCerrar}>Ver resultados</Button>
        </div>
      }
    >
      {props.children}
    </Drawer>
  )
}

// La lista y, a su lado desde 40 rem de contenedor, el panel de filtros (el panel de la hoja del celular es otro, aparte). Mientras llega
// una lista filtrada, la anterior se atenúa.
function CuerpoDeLaLista(props: {
  conPanel: boolean
  panel: ReactNode
  pendiente: boolean
  children: ReactNode
}) {
  return (
    <div
      className={cn(
        'grid items-start gap-4',
        props.conPanel && '@min-[40rem]:grid-cols-[15rem_minmax(0,1fr)]',
      )}
    >
      {props.conPanel ? (
        <aside
          aria-label="Filtros"
          className="hidden rounded-(--radius-card) border border-(--color-line) bg-(--color-surface) p-4 @min-[40rem]:block"
        >
          {props.panel}
        </aside>
      ) : null}
      <div
        aria-busy={props.pendiente}
        className={cn(
          'min-w-0 transition-opacity duration-(--dur-rapida)',
          props.pendiente && 'opacity-60',
        )}
      >
        {props.children}
      </div>
    </div>
  )
}

type Props = {
  esquema: EsquemaDeFiltros
  // El menú de vistas guardadas, si el listado las tiene.
  vistas?: ReactNode
  // A la derecha de la barra: «Nuevo», exportar…
  acciones?: ReactNode
  // Al pie del panel de filtros.
  pieDelPanel?: ReactNode
  // Al pie de una sección del panel (por su clave).
  accionesDeSeccion?: Readonly<Record<string, ReactNode>>
  // «Ítems por página» de este listado: lo que dibuja la página y los tamaños que ofrece (hasta su máximo). Sin esto, el
  // listado no lo ofrece. Va una sola vez: en la barra desde `md` y, por debajo, arriba de la lista (con 100 tarjetas, al
  // pie quedaba a ~40.000 px).
  porPagina?: PorPaginaDeLaLista
  // La lista. Adentro puede usar `useFiltrosDelListado()`.
  children: ReactNode
}

// El armazón de un listado con filtros: búsqueda, botón «Filtros», chips de lo que está activo y
// «Limpiar»; el panel al costado en escritorio (plegable) y en una hoja inferior en el celular.
// Todo el estado vive en la URL. No sabe de ningún módulo: cada listado le pasa su esquema.
export function FilterShell(props: Props) {
  const { esquema, vistas, acciones, pieDelPanel, accionesDeSeccion, porPagina, children } = props
  const filtros = useFiltros(esquema)
  const raiz = useRef<HTMLDivElement>(null)
  const alLado = usePanelAlLado(raiz)
  const selectorEnLaBarra = useAlMenos(CORTE_DE_LA_TABLA)
  const selector = <SelectorDelListado porPagina={porPagina} aplicar={filtros.aplicarPorPagina} />
  const [plegado, setPlegado] = useState(false)
  const hayPanel = esquema.filtros.length > 0 || pieDelPanel !== undefined
  const panel = (
    <PanelDeFiltros
      filtros={esquema.filtros}
      secciones={esquema.secciones}
      accionesDeSeccion={accionesDeSeccion}
      pie={pieDelPanel}
    />
  )

  return (
    <ContextoDeFiltros value={filtros}>
      {/* Columna `minmax(0, 1fr)`: con una `auto` el texto sin cortar de un chip (una búsqueda de 22 letras, 403 px) fija el mínimo de la grilla y
          ensancha la página al 200 % (5a-23). */}
      <div ref={raiz} className="@container grid grid-cols-[minmax(0,1fr)] gap-3">
        <div data-barra-de-filtros className="flex flex-wrap items-center gap-2">
          {esquema.busqueda ? (
            <CampoDeBusqueda
              etiqueta={esquema.busqueda.etiqueta}
              marcador={esquema.busqueda.marcador}
              minimo={esquema.busqueda.minimo}
              valor={filtros.valores.busqueda}
              alBuscar={filtros.buscar}
            />
          ) : null}
          {hayPanel ? (
            <BotonDeFiltros
              cantidad={Object.keys(filtros.valores.porClave).length}
              abierto={alLado ? !plegado : filtros.panelAbierto}
              alPulsar={() => {
                if (alLado) {
                  setPlegado((antes) => !antes)
                } else {
                  filtros.abrirPanel()
                }
              }}
            />
          ) : null}
          {vistas}
          {/* Con sitio de sobra (un contenedor de 48 rem o más) las acciones van juntas a la derecha; sin él, cada botón envuelve por su
              cuenta —`contents`—, a la izquierda y en el orden en que se leen: un grupo que salta de fila como un bloque y reparte a la
              derecha dejaba «Vistas» sola y los botones desparejos al 200 % (cierre 5b, defecto 4.1). «Ítems por página» va al final. */}
          <div className="contents @3xl:ml-auto @3xl:flex @3xl:min-w-0 @3xl:flex-wrap @3xl:items-center @3xl:justify-end @3xl:gap-2">
            {acciones}
            {selectorEnLaBarra ? selector : null}
          </div>
        </div>
        <ChipsDeFiltros esquema={esquema} />
        {selectorEnLaBarra ? null : selector}
        <CuerpoDeLaLista
          conPanel={hayPanel && !plegado}
          panel={panel}
          pendiente={filtros.pendiente}
        >
          {children}
        </CuerpoDeLaLista>
      </div>
      <HojaDeFiltros
        abierta={filtros.panelAbierto && !alLado}
        hayFiltros={filtros.hayFiltros}
        alLimpiar={filtros.limpiar}
        alCerrar={filtros.cerrarPanel}
      >
        {panel}
      </HojaDeFiltros>
    </ContextoDeFiltros>
  )
}
