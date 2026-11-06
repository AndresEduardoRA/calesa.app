'use client'

import { FileTextIcon } from 'lucide-react'
import type { Route } from 'next'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { textoDelTope } from '@/shared/lib/conteo'
import { fechaRelativa } from '@/shared/lib/fechas'
import { TOPE_DE_LO_CARGADO } from '@/shared/lib/paginacion'
import { AvisoDeTope } from '@/shared/ui/aviso-de-tope'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { EstadoError, EstadoVacio } from '@/shared/ui/estados'
import { useRegional } from '@/shared/ui/regional'
import { Skeleton } from '@/shared/ui/skeleton'
import { ETIQUETA_DE_CLASE, type ListaDe } from '../../../entities/historial-del-vehiculo'
import { rutaDeLaCotizacion, rutaDelListado } from '../../../entities/ruta-de-la-hoja'
import type { PaginasDelHistorial } from '../hooks/use-paginas-del-historial'

// Lo que tarda menos que esto no muestra el esqueleto: un parpadeo cuesta más que la espera.
const ESPERA_DEL_ESQUELETO_MS = 300

type Props = {
  historial: PaginasDelHistorial
  // De quién es la lista: el tope enlaza al listado de esa persona o vehículo.
  de: ListaDe
  // El nombre de la lista para quien lee en voz alta: el panel de la hoja y la pestaña de la ficha no la llaman igual.
  etiqueta: string
}

// Las cotizaciones de un vehículo o un lead que quien mira ve, de la más nueva a la más vieja, con sus estados (esqueleto, error, vacío) y su pie («Ver más» o el tope).
// La comparten el historial del panel de la hoja, la pestaña «Cotizaciones» de la ficha del vehículo y la sección de la ficha del lead; la lectura es de `usePaginasDelHistorial`.
export function ListaDelHistorial({ historial, de, etiqueta }: Props) {
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
      <ul aria-label={etiqueta} className="grid grid-cols-[minmax(0,1fr)] gap-1">
        {historial.filas.map((cotizacion) => (
          <li
            key={cotizacion.id}
            className="flex min-w-0 items-center gap-2 rounded-(--radius-md) p-2 text-(length:--text-sm) text-(--color-ink)"
          >
            <Link
              href={rutaDeLaCotizacion(cotizacion.id) as Route}
              className="min-w-0 flex-1 truncate hover:underline"
            >
              N.º {cotizacion.numero} · {fechaRelativa(cotizacion.creadoEn, { zona: zonaHoraria })}{' '}
              · {cotizacion.autor}
            </Link>
            <Badge className="shrink-0">{ETIQUETA_DE_CLASE[cotizacion.clase]}</Badge>
          </li>
        ))}
      </ul>
      <PieDelHistorial historial={historial} de={de} />
    </div>
  )
}

// Lo que va debajo de las filas: el error de «Ver más», el tope con su camino al listado, o «Ver más».
function PieDelHistorial({ historial, de }: { historial: PaginasDelHistorial; de: ListaDe }) {
  return historial.error ? (
    <div role="alert" className="flex flex-wrap items-center gap-2">
      <p className="text-(length:--text-sm) text-(--color-ink-soft)">No se pudieron cargar más.</p>
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
    <AvisoDeTope
      texto={textoDelTope(TOPE_DE_LO_CARGADO, { articulo: 'las' })}
      camino={
        <Link href={rutaDelListado(de) as Route} className="underline hover:text-(--color-ink)">
          Ver todas en Cotizaciones
        </Link>
      }
    />
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
  ) : null
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
