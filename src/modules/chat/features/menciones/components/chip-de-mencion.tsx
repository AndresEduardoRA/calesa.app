'use client'

import { NumeroDeLead } from '@/shared/ui/numero-de-lead'
import { useRegional } from '@/shared/ui/regional'
import { formatearNumero } from '@/shared/lib/formato'
import { cn } from 'cn'
import type { ClaseDeMencion, Referencia } from '../../../entities/menciones'
import type { DatosDeReferencia, EstadoDeReferencia } from '../../../entities/referencias'
import type { ContextoDeMenciones } from '../contexto-de-menciones'

// «este lead», «este vehículo», «esta cotización»: lo que se dice de lo que no se ve.
const DEMOSTRATIVO: Record<ClaseDeMencion, string> = {
  lead: 'este lead',
  vehiculo: 'este vehículo',
  cotizacion: 'esta cotización',
  usuario: 'esta persona',
}

export const textoSinAcceso = (clase: ClaseDeMencion) =>
  clase === 'usuario' ? 'Persona no disponible' : `No tienes acceso a ${DEMOSTRATIVO[clase]}`

const CLASES_DEL_CHIP =
  'inline-flex min-h-11 items-center rounded-(--radius-md) bg-(--color-surface-2) px-1.5 text-(--color-primario-ink) underline-offset-2 hover:underline md:min-h-0'

function EtiquetaDelChip({ datos }: { datos: DatosDeReferencia }) {
  const { locale } = useRegional()
  switch (datos.clase) {
    case 'lead':
      return (
        <>
          #{datos.nombre ?? 'Lead'}
          {datos.numeroVisible !== null ? (
            <>
              {' '}
              <NumeroDeLead
                numeros={{
                  numero: datos.numeroVisible,
                  numeroPropio: null,
                  creadorDelPropio: null,
                }}
              />
            </>
          ) : null}
        </>
      )
    case 'vehiculo':
      return <>#{datos.titulo}</>
    case 'cotizacion':
      return (
        <>
          #{formatearNumero(datos.numero, { locale, decimales: 0 })}
          {datos.titulo ? ` ${datos.titulo}` : ''}
        </>
      )
    case 'usuario':
      return <>#{datos.nombre ?? 'Persona'}</>
  }
}

function etiquetaAccesible(datos: DatosDeReferencia): string {
  switch (datos.clase) {
    case 'lead':
      return `Abrir lead ${datos.nombre ?? ''}`.trim()
    case 'vehiculo':
      return `Abrir vehículo ${datos.titulo}`
    case 'cotizacion':
      return `Abrir cotización ${datos.titulo ?? datos.numero}`
    case 'usuario':
      return datos.nombre ?? 'Persona'
  }
}

type Props = {
  referencia: Referencia
  estado: EstadoDeReferencia | 'error' | null
  menciones: ContextoDeMenciones
}

// Una mención en el texto: un botón si se ve (la persona no abre nada: sólo hay un nombre); si no, lo que pasa en palabras. Sin nombre ni id de lo
// que no se ve.
export function ChipDeMencion({ referencia, estado, menciones }: Props) {
  if (estado === null) {
    return (
      <span aria-busy="true" className="text-(--color-ink-soft)">
        Cargando…
      </span>
    )
  }
  if (estado === 'error') {
    return (
      <button
        type="button"
        className={cn(CLASES_DEL_CHIP, 'text-(--color-peligro-ink)')}
        onClick={menciones.reintentar}
      >
        No se pudo cargar · Reintentar
      </button>
    )
  }
  if (estado.situacion !== 'visible') {
    // Lo que no se ve o ya no está se dice en palabras; la persona no abre nada, y lo demás abre el drawer, que dice lo mismo sin datos.
    const texto = estado.situacion === 'eliminado' ? 'Eliminado' : textoSinAcceso(referencia.clase)
    if (referencia.clase === 'usuario' || referencia.id === '') {
      return <span className="text-(--color-ink-soft) italic">{texto}</span>
    }
    return (
      <button
        type="button"
        className={cn(CLASES_DEL_CHIP, 'bg-transparent text-(--color-ink-soft) italic')}
        onClick={() => {
          menciones.abrir(referencia)
        }}
      >
        {texto}
      </button>
    )
  }
  if (estado.datos.clase === 'usuario') {
    return (
      <span className="rounded-(--radius-md) bg-(--color-surface-2) px-1.5 text-(--color-ink)">
        <EtiquetaDelChip datos={estado.datos} />
      </span>
    )
  }
  return (
    <button
      type="button"
      aria-label={etiquetaAccesible(estado.datos)}
      className={CLASES_DEL_CHIP}
      onClick={() => {
        menciones.abrir(referencia)
      }}
    >
      <EtiquetaDelChip datos={estado.datos} />
    </button>
  )
}
