'use client'

import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'
import Image from 'next/image'
import { useRef, type ReactNode } from 'react'
import { cn } from 'cn'
import { contador } from './tipos'
import { useCarrusel, type PedidoDelCarrusel } from './use-carrusel'
import { VisorDeImagenes } from './visor-de-imagenes'

const UMBRAL_DEL_GESTO = 40

type Props = PedidoDelCarrusel & {
  // `carrusel`: flechas, puntos y gesto en el lugar (tarjeta, cabecera). `abrir`: un lugar chico (la fila de una tabla) que sólo abre el visor.
  modo?: 'carrusel' | 'abrir'
  vacio: ReactNode
  className?: string
}

const FLECHA_CHICA =
  'absolute top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-full text-(--color-ink) opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100 pointer-coarse:opacity-100'

function Puntos({ total, actual }: { total: number; actual: number }) {
  if (total < 2) return null
  return (
    <span aria-hidden className="absolute inset-x-0 bottom-1.5 flex justify-center gap-1">
      {Array.from({ length: Math.min(total, 8) }, (_, indice) => (
        <span
          key={indice}
          className={cn(
            'size-1.5 rounded-full bg-(--color-surface) shadow-sm',
            indice === Math.min(actual, 7) ? 'opacity-100' : 'opacity-50',
          )}
        />
      ))}
    </span>
  )
}

function Flecha({ paso, alMover }: { paso: 1 | -1; alMover: (paso: 1 | -1) => void }) {
  return (
    <button
      type="button"
      aria-label={paso === 1 ? 'Foto siguiente' : 'Foto anterior'}
      className={cn(FLECHA_CHICA, paso === 1 ? 'right-0' : 'left-0')}
      onClick={() => {
        alMover(paso)
      }}
    >
      <span className="flex size-7 items-center justify-center rounded-full bg-(--color-surface)/85 shadow-sm">
        {paso === 1 ? (
          <ChevronRightIcon aria-hidden className="size-4" />
        ) : (
          <ChevronLeftIcon aria-hidden className="size-4" />
        )}
      </span>
    </button>
  )
}

function textoDelBoton(titulo: string, indice: number, total: number): string {
  return total > 1
    ? `Ver las fotos de ${titulo} (${contador(indice, total)})`
    : `Ver la foto de ${titulo}`
}

// Las fotos de una entidad en su lugar (tarjeta, fila, cabecera): la portada que ya trae la fila y, recién cuando alguien se acerca (puntero,
// foco o toque), el resto, una sola vez (`useImagenes`). Con varias, flechas, puntos y gesto; el clic abre el visor grande en esa foto. Va con
// `data-no-abre`: tocar la foto no abre el resumen de la fila.
export function CarruselEnElLugar({ modo = 'carrusel', vacio, className, ...pedido }: Props) {
  const c = useCarrusel(pedido)
  const inicio = useRef<number | null>(null)
  const conGesto = modo === 'carrusel'
  return (
    <>
      <span
        data-no-abre=""
        className={cn('group relative block shrink-0 overflow-hidden', className)}
        onPointerEnter={c.acercarse}
        onFocus={c.acercarse}
        onPointerDown={(evento) => {
          inicio.current = evento.clientX
        }}
        onPointerUp={(evento) => {
          const dx = inicio.current === null ? 0 : evento.clientX - inicio.current
          inicio.current = null
          if (conGesto && Math.abs(dx) >= UMBRAL_DEL_GESTO) c.mover(dx < 0 ? 1 : -1)
        }}
      >
        {c.enLugar ? (
          <button
            type="button"
            aria-label={textoDelBoton(pedido.titulo, c.indice, c.total)}
            className="absolute inset-0 block size-full cursor-zoom-in"
            onClick={c.abrir}
          >
            <Image
              src={c.enLugar}
              alt=""
              fill
              unoptimized
              loading="lazy"
              sizes="(min-width: 768px) 320px, 100vw"
              className="object-cover"
            />
          </button>
        ) : (
          <span aria-hidden className="absolute inset-0 flex items-center justify-center">
            {vacio}
          </span>
        )}
        {conGesto && c.conFlechas ? (
          <>
            <Flecha paso={-1} alMover={c.mover} />
            <Flecha paso={1} alMover={c.mover} />
          </>
        ) : null}
        {conGesto ? <Puntos total={c.total} actual={c.indice} /> : null}
      </span>
      {c.montarVisor ? <VisorDeImagenes titulo={pedido.titulo} {...c.visor} /> : null}
    </>
  )
}
