'use client'

import { ChevronDownIcon, FileTextIcon } from 'lucide-react'
import { useEffect, useId, useState } from 'react'
import { conteoCorto, textoDelTope, type ConteoAcotado } from '@/shared/lib/conteo'
import { fechaRelativa } from '@/shared/lib/fechas'
import { TOPE_DE_LO_CARGADO } from '@/shared/lib/paginacion'
import { AvisoDeTope } from '@/shared/ui/aviso-de-tope'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { EstadoError, EstadoVacio } from '@/shared/ui/estados'
import { useRegional } from '@/shared/ui/regional'
import { Skeleton } from '@/shared/ui/skeleton'
import { ETIQUETA_DE_CLASE } from '../../../entities/historial-del-vehiculo'
import { useHistorialDelVehiculo } from '../hooks/use-historial-del-vehiculo'

// Lo que tarda menos que esto no muestra el esqueleto: un parpadeo cuesta más que la espera.
const ESPERA_DEL_ESQUELETO_MS = 300

type Props = {
  vehiculoId: string
  // «Cotizado (n)», leído por el servidor al abrir la hoja: sólo le pone la etiqueta al botón. Puede estar viejo (guardar no vuelve a pedir la página), así que no
  // decide si hay historial: el botón está siempre y lo que muestra lo dice la lectura al desplegarlo.
  conteo: ConteoAcotado | null
}

// El historial de cotizaciones del vehículo elegido, dentro de su panel: plegado, y se lee al desplegarlo. «Ver más» agrega de a 20 hasta el tope.
export function HistorialDelVehiculo({ vehiculoId, conteo }: Props) {
  const historial = useHistorialDelVehiculo(vehiculoId)
  const id = useId()
  const etiqueta =
    conteo !== null && conteo.n > 0
      ? `Historial de cotizaciones (${conteoCorto(conteo)})`
      : 'Historial de cotizaciones'
  return (
    <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-2">
      <Button
        type="button"
        variant="outline"
        aria-expanded={historial.abierto}
        aria-controls={id}
        onClick={historial.alternar}
        className="h-11 min-w-0 justify-between md:h-9"
      >
        <span className="truncate">{etiqueta}</span>
        <ChevronDownIcon
          aria-hidden="true"
          className={historial.abierto ? 'size-4 shrink-0 rotate-180' : 'size-4 shrink-0'}
        />
      </Button>
      <div id={id} hidden={!historial.abierto} className="min-w-0">
        {historial.abierto ? <Contenido historial={historial} /> : null}
      </div>
    </div>
  )
}

function Contenido({ historial }: { historial: ReturnType<typeof useHistorialDelVehiculo> }) {
  const { zonaHoraria } = useRegional()
  if (!historial.leido) {
    if (historial.error) {
      return (
        <div role="alert">
          <EstadoError
            titulo="No se pudo cargar el historial."
            alReintentar={historial.reintentar}
          />
        </div>
      )
    }
    return <EsqueletoDeLasFilas />
  }
  if (historial.filas.length === 0) {
    return <EstadoVacio Icono={FileTextIcon} titulo="Sin cotizaciones que puedas ver." compacto />
  }
  return (
    <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-2">
      <ul aria-label="Historial de cotizaciones" className="grid grid-cols-[minmax(0,1fr)] gap-1">
        {historial.filas.map((cotizacion) => (
          <li
            key={cotizacion.id}
            className="flex min-w-0 items-center gap-2 rounded-(--radius-md) p-2 text-(length:--text-sm) text-(--color-ink)"
          >
            <span className="min-w-0 flex-1 truncate">
              N.º {cotizacion.numero} · {fechaRelativa(cotizacion.creadoEn, { zona: zonaHoraria })}{' '}
              · {cotizacion.autor}
            </span>
            <Badge className="shrink-0">{ETIQUETA_DE_CLASE[cotizacion.clase]}</Badge>
          </li>
        ))}
      </ul>
      {historial.error ? (
        <div role="alert" className="flex flex-wrap items-center gap-2">
          <p className="text-(length:--text-sm) text-(--color-ink-soft)">
            No se pudieron cargar más.
          </p>
          <Button
            type="button"
            variant="outline"
            className="min-h-11 md:min-h-9"
            onClick={historial.reintentar}
          >
            Reintentar
          </Button>
        </div>
      ) : historial.enElTope ? (
        <AvisoDeTope texto={textoDelTope(TOPE_DE_LO_CARGADO, { articulo: 'las' })} />
      ) : historial.hayMasParaPedir ? (
        <Button
          type="button"
          variant="outline"
          className="min-h-11 md:min-h-9"
          disabled={historial.cargando}
          onClick={historial.verMas}
        >
          {historial.cargando ? 'Cargando…' : 'Ver más'}
        </Button>
      ) : null}
    </div>
  )
}

// Mientras llega la lista: tres filas, con letrero para quien lee en voz alta.
function EsqueletoDeLasFilas() {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const espera = setTimeout(() => {
      setVisible(true)
    }, ESPERA_DEL_ESQUELETO_MS)
    return () => {
      clearTimeout(espera)
    }
  }, [])
  return (
    <div aria-busy="true" aria-label="Cargando el historial" className="grid gap-2">
      {visible ? (
        <>
          <Skeleton className="h-9" />
          <Skeleton className="h-9" />
          <Skeleton className="h-9" />
        </>
      ) : null}
    </div>
  )
}
