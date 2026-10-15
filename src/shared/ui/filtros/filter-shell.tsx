'use client'

import { SlidersHorizontalIcon } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { cn } from 'cn'
import type { EsquemaDeFiltros } from '@/shared/lib/filtros'
import { Button } from '../button'
import { Drawer } from '../drawer'
import { useConsultaDeMedios } from '../use-consulta-de-medios'
import { ChipsDeFiltros } from './chips-de-filtros'
import { ContextoDeFiltros } from './contexto'
import { CampoDeBusqueda } from './controles'
import { PanelDeFiltros } from './panel-de-filtros'
import { useFiltros } from './use-filtros'

// Desde acá el panel de filtros entra al costado; por debajo, en una hoja inferior.
const ESCRITORIO = '(min-width: 1024px)'

function useEsEscritorio(): boolean {
  return useConsultaDeMedios(ESCRITORIO)
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
  // La lista. Adentro puede usar `useFiltrosDelListado()`.
  children: ReactNode
}

// El armazón de un listado con filtros: búsqueda, botón «Filtros», chips de lo que está activo y
// «Limpiar»; el panel al costado en escritorio (plegable) y en una hoja inferior en el celular.
// Todo el estado vive en la URL. No sabe de ningún módulo: cada listado le pasa su esquema.
export function FilterShell(props: Props) {
  const { esquema, vistas, acciones, pieDelPanel, accionesDeSeccion, children } = props
  const filtros = useFiltros(esquema)
  const esEscritorio = useEsEscritorio()
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
      <div className="grid gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {esquema.busqueda ? (
            <CampoDeBusqueda
              etiqueta={esquema.busqueda.etiqueta}
              valor={filtros.valores.busqueda}
              alBuscar={filtros.buscar}
            />
          ) : null}
          {hayPanel ? (
            <BotonDeFiltros
              cantidad={Object.keys(filtros.valores.porClave).length}
              abierto={esEscritorio ? !plegado : filtros.panelAbierto}
              alPulsar={() => {
                if (esEscritorio) {
                  setPlegado((antes) => !antes)
                } else {
                  filtros.abrirPanel()
                }
              }}
            />
          ) : null}
          {vistas}
          <div className="ml-auto flex min-w-0 flex-wrap items-center justify-end gap-2">
            {acciones}
          </div>
        </div>
        <ChipsDeFiltros esquema={esquema} />
        <div
          className={cn(
            'grid items-start gap-4',
            hayPanel && !plegado && 'lg:grid-cols-[15rem_minmax(0,1fr)]',
          )}
        >
          {hayPanel && !plegado ? (
            <aside
              aria-label="Filtros"
              className="hidden rounded-(--radius-card) border border-(--color-line) bg-(--color-surface) p-4 lg:block"
            >
              {panel}
            </aside>
          ) : null}
          <div
            aria-busy={filtros.pendiente}
            className={cn(
              'min-w-0 transition-opacity duration-(--dur-rapida)',
              filtros.pendiente && 'opacity-60',
            )}
          >
            {children}
          </div>
        </div>
      </div>
      <HojaDeFiltros
        abierta={filtros.panelAbierto && !esEscritorio}
        hayFiltros={filtros.hayFiltros}
        alLimpiar={filtros.limpiar}
        alCerrar={filtros.cerrarPanel}
      >
        {panel}
      </HojaDeFiltros>
    </ContextoDeFiltros>
  )
}
