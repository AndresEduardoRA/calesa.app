'use client'

import { ChevronLeftIcon, ChevronRightIcon, XIcon } from 'lucide-react'
import Image from 'next/image'
import { cn } from 'cn'
import { Button } from '../button'
import { Dialog, DialogClose, DialogContent, DialogTitle } from '../dialog'
import { Skeleton } from '../skeleton'
import { contador, vecina, type ImagenDelVisor } from './tipos'
import type { EstadoDeImagenes } from './use-imagenes'

type Props = {
  abierto: boolean
  alCerrar: () => void
  // Lo que se ve, dicho para el lector de pantalla y arriba del visor (el título de la entidad).
  titulo: string
  estado: EstadoDeImagenes
  actual: number
  alIrA: (indice: number) => void
  alReintentar: () => void
}

const FLECHA =
  'absolute top-1/2 size-11 -translate-y-1/2 rounded-full bg-(--color-surface)/85 shadow-sm backdrop-blur-sm'

// La imagen grande y sus flechas. Se pide sólo la que se ve y sus dos vecinas (`priority` en la actual): abrir el visor no baja las 24.
function Escenario({
  imagenes,
  actual,
  alIrA,
  titulo,
}: {
  imagenes: readonly ImagenDelVisor[]
  actual: number
  alIrA: (indice: number) => void
  titulo: string
}) {
  const total = imagenes.length
  const cerca = new Set([actual, vecina(actual, total, 1), vecina(actual, total, -1)])
  return (
    <div className="relative min-h-0 flex-1 bg-(--color-paper-dim)">
      {imagenes.map((imagen, indice) =>
        cerca.has(indice) ? (
          <Image
            key={imagen.id}
            src={imagen.grande}
            alt={`${titulo}, foto ${contador(indice, total)}`}
            fill
            unoptimized
            priority={indice === actual}
            sizes="100vw"
            className={cn('object-contain', indice === actual ? '' : 'invisible')}
          />
        ) : null,
      )}
      {total > 1 ? (
        <>
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="Foto anterior"
            className={cn(FLECHA, 'left-2')}
            onClick={() => {
              alIrA(vecina(actual, total, -1))
            }}
          >
            <ChevronLeftIcon aria-hidden />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="Foto siguiente"
            className={cn(FLECHA, 'right-2')}
            onClick={() => {
              alIrA(vecina(actual, total, 1))
            }}
          >
            <ChevronRightIcon aria-hidden />
          </Button>
        </>
      ) : null}
    </div>
  )
}

// La tira de miniaturas: la actual marcada con borde y `aria-current`, no sólo con color.
function Miniaturas({
  imagenes,
  actual,
  alIrA,
}: {
  imagenes: readonly ImagenDelVisor[]
  actual: number
  alIrA: (indice: number) => void
}) {
  if (imagenes.length < 2) return null
  return (
    <ol className="flex shrink-0 gap-2 overflow-x-auto p-2" aria-label="Miniaturas">
      {imagenes.map((imagen, indice) => (
        <li key={imagen.id} className="shrink-0">
          <button
            type="button"
            aria-label={`Ver la foto ${contador(indice, imagenes.length)}`}
            aria-current={indice === actual ? 'true' : undefined}
            className={cn(
              'relative block aspect-4/3 w-16 overflow-hidden rounded-(--radius-sm) border-2 transition',
              indice === actual ? 'border-(--color-primario)' : 'border-transparent opacity-70',
            )}
            onClick={() => {
              alIrA(indice)
            }}
          >
            <Image
              src={imagen.miniatura}
              alt=""
              fill
              unoptimized
              loading="lazy"
              sizes="64px"
              className="object-cover"
            />
          </button>
        </li>
      ))}
    </ol>
  )
}

function Cuerpo({
  estado,
  actual,
  alIrA,
  titulo,
  alReintentar,
}: Omit<Props, 'abierto' | 'alCerrar'>) {
  if (estado.estado === 'listas' && estado.imagenes.length > 0) {
    return (
      <>
        <Escenario imagenes={estado.imagenes} actual={actual} alIrA={alIrA} titulo={titulo} />
        <Miniaturas imagenes={estado.imagenes} actual={actual} alIrA={alIrA} />
      </>
    )
  }
  if (estado.estado === 'fallo') {
    return (
      <div role="alert" className="flex flex-1 flex-wrap items-center justify-center gap-2 p-6">
        <p className="text-(length:--text-sm) text-(--color-ink)">
          No se pudieron cargar las fotos.
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="min-h-11 md:min-h-8"
          onClick={alReintentar}
        >
          Reintentar
        </Button>
      </div>
    )
  }
  if (estado.estado === 'listas') {
    return (
      <p className="flex flex-1 items-center justify-center p-6 text-(length:--text-sm) text-(--color-ink-soft)">
        No tiene fotos todavía.
      </p>
    )
  }
  return <Skeleton aria-label="Cargando las fotos" className="m-4 flex-1 rounded-(--radius-card)" />
}

// El visor grande: la foto a casi toda la pantalla, flechas, ← → del teclado, Esc (lo atiende el diálogo), «3 de 12» y las miniaturas. Abierto y
// la foto viven en la URL (`useVisorPorUrl`): se recarga y se comparte. Un solo nivel: se abre sobre una página o un drawer, nunca sobre otro modal.
export function VisorDeImagenes({
  abierto,
  alCerrar,
  titulo,
  estado,
  actual,
  alIrA,
  alReintentar,
}: Props) {
  const total = estado.estado === 'listas' ? estado.imagenes.length : 0
  return (
    <Dialog
      open={abierto}
      onOpenChange={(sigueAbierto) => {
        if (!sigueAbierto) alCerrar()
      }}
    >
      <DialogContent
        showCloseButton={false}
        data-visor-de-imagenes=""
        className="flex h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] max-w-5xl flex-col gap-0 overflow-hidden p-0 sm:max-w-5xl"
        onKeyDown={(evento) => {
          if (total < 2) return
          if (evento.key === 'ArrowRight') {
            evento.preventDefault()
            alIrA(vecina(actual, total, 1))
          } else if (evento.key === 'ArrowLeft') {
            evento.preventDefault()
            alIrA(vecina(actual, total, -1))
          }
        }}
      >
        <div className="flex shrink-0 items-center gap-2 border-b border-(--color-line) py-1 pr-1 pl-4">
          <DialogTitle className="min-w-0 flex-1 truncate text-(length:--text-base)">
            {titulo}
          </DialogTitle>
          {total > 0 ? (
            <span
              aria-live="polite"
              className="text-(length:--text-sm) text-(--color-ink-soft) tabular-nums"
            >
              {contador(actual, total)}
            </span>
          ) : null}
          <DialogClose
            aria-label="Cerrar"
            render={<Button type="button" variant="ghost" size="icon" className="size-11" />}
          >
            <XIcon aria-hidden />
          </DialogClose>
        </div>
        <Cuerpo
          estado={estado}
          actual={actual}
          alIrA={alIrA}
          titulo={titulo}
          alReintentar={alReintentar}
        />
      </DialogContent>
    </Dialog>
  )
}
