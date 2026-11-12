'use client'

import { PlusIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { textoDelTope } from '@/shared/lib/conteo'
import { AvisoDeTope } from '@/shared/ui/aviso-de-tope'
import { Button } from '@/shared/ui/button'
import { EstadoError, EstadoVacio } from '@/shared/ui/estados'
import { ListaDeCatalogo } from '@/shared/ui/lista-de-catalogo/lista-de-catalogo'
import type { FilaDeCatalogo } from '@/shared/ui/lista-de-catalogo/tipos'
import { Skeleton } from '@/shared/ui/skeleton'
import { TOPE_DE_CATALOGO_DE_TRANSPORTE } from '../../../entities/transporte/catalogo'
import type { LecturaDeCatalogo } from '../hooks/use-catalogo-de-transporte'

const BOTON = 'h-11 md:h-8'

type Props<T> = {
  // `puerto` o `naviera`: el prefijo de los ids de la lista y del título.
  clave: string
  titulo: string
  descripcion: string
  etiquetaDelBoton: string
  etiquetaDeCarga: string
  tituloDelError: string
  tituloDelVacio: string
  columnaDeUso: string
  sustantivoDelTope: string
  lectura: LecturaDeCatalogo<T>
  filas: (lista: T[]) => FilaDeCatalogo[]
  alNuevo: () => void
  alAbrir: (id: string) => void
  alReintentar: () => void
  // El modal del catálogo, montado por quien lo conoce.
  children?: ReactNode
}

function Cargando({ etiqueta }: { etiqueta: string }) {
  return (
    <div aria-busy="true" aria-label={etiqueta} className="grid gap-2">
      <Skeleton className="h-12" />
      <Skeleton className="h-12" />
      <Skeleton className="h-12" />
    </div>
  )
}

// La forma de un catálogo de transporte de Configuración › Logística (6.08-1): encabezado y botón, los cinco estados y la lista de catálogo. Es un catálogo de la empresa (decenas de filas): no se pagina;
// con el tope se avisa. Quien lo usa pone el hook, las filas y el modal.
export function CatalogoDeTransporte<T>({
  clave,
  titulo,
  descripcion,
  etiquetaDelBoton,
  etiquetaDeCarga,
  tituloDelError,
  tituloDelVacio,
  columnaDeUso,
  sustantivoDelTope,
  lectura,
  filas,
  alNuevo,
  alAbrir,
  alReintentar,
  children,
}: Props<T>) {
  const lista = lectura.tipo === 'listo' ? lectura.filas : null
  const idDelTitulo = `titulo-de-${clave}`
  return (
    <section className="grid gap-3" aria-labelledby={idDelTitulo}>
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <div className="grid gap-0.5">
          <h2 id={idDelTitulo} className="text-(length:--text-lg) font-semibold text-(--color-ink)">
            {titulo}
          </h2>
          <p className="text-(length:--text-sm) text-(--color-ink-soft)">{descripcion}</p>
        </div>
        <Button className={BOTON} onClick={alNuevo}>
          <PlusIcon aria-hidden />
          {etiquetaDelBoton}
        </Button>
      </div>
      {lectura.tipo === 'cargando' ? <Cargando etiqueta={etiquetaDeCarga} /> : null}
      {lectura.tipo === 'error' ? (
        <EstadoError
          titulo={tituloDelError}
          descripcion={lectura.error.mensaje}
          alReintentar={alReintentar}
        />
      ) : null}
      {lista !== null && lista.length === 0 ? (
        <EstadoVacio compacto titulo={tituloDelVacio} />
      ) : null}
      {lista !== null && lista.length > 0 ? (
        <ListaDeCatalogo
          filas={filas(lista)}
          prefijo={clave}
          columnaDeUso={columnaDeUso}
          alAbrir={alAbrir}
          alMover={() => undefined}
        />
      ) : null}
      {lectura.tipo === 'listo' && lectura.hayMas ? (
        <AvisoDeTope
          texto={textoDelTope(TOPE_DE_CATALOGO_DE_TRANSPORTE, {
            sustantivo: sustantivoDelTope,
            orden: 'primeros',
          })}
        />
      ) : null}
      {children}
    </section>
  )
}
