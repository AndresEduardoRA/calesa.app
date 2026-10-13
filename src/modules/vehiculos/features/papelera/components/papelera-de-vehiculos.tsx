'use client'

import { ArrowLeftIcon, Trash2Icon } from 'lucide-react'
import type { Route } from 'next'
import Link from 'next/link'
import { useState } from 'react'
import type { OrigenResumen } from '@/modules/origenes/client'
import { fechaRelativa } from '@/shared/lib/fechas'
import { RUTAS } from '@/shared/lib/rutas'
import { Aviso } from '@/shared/ui/aviso'
import { EstadoVacio } from '@/shared/ui/estados'
import type { LimpiezaPendiente, LoteDePapelera as Lote } from '../../../entities/papelera'
import { usePapelera, type Objetivo } from '../hooks/use-papelera'
import { ConfirmarPurga } from './confirmar-purga'
import { LoteDePapelera } from './lote-de-papelera'

type Props = {
  // Los lotes que todavía tienen algo adentro: los propios o, para quien puede vaciarla, todos.
  lotes: readonly Lote[]
  origenes: readonly OrigenResumen[]
  puedePurgar: boolean
  // El instante en que el servidor armó la página (ISO): contra él se cuentan los días.
  ahora: string
  // Lo que la limpieza de Storage tiene atrasado; sólo le llega a quien puede vaciar la papelera.
  limpieza: LimpiezaPendiente | null
}

const VOLVER =
  'inline-flex min-h-11 w-fit items-center gap-1.5 text-(length:--text-sm) text-(--color-ink-soft) underline-offset-2 hover:text-(--color-ink) hover:underline md:min-h-8'

// La papelera de vehículos, por lote: quién envió qué, cuándo, y cuánto falta para que se purgue
// solo. Restaurar se hace y lo dice; purgar pide confirmar nombrando lo que se borra.
export function PapeleraDeVehiculos({ lotes, origenes, puedePurgar, ahora, limpieza }: Props) {
  const papelera = usePapelera()
  const [aPurgar, setAPurgar] = useState<Objetivo | null>(null)
  const porId = new Map(origenes.map((origen) => [origen.id, origen]))
  return (
    <div className="grid max-w-4xl gap-4">
      <Link href={RUTAS.vehiculos as Route} className={VOLVER}>
        <ArrowLeftIcon aria-hidden className="size-4" />
        Inventario
      </Link>
      <header className="grid gap-1">
        <h1 className="text-(length:--text-xl) font-semibold text-(--color-ink)">
          Papelera de vehículos
        </h1>
        <p className="text-(length:--text-sm) text-(--color-ink-soft)">
          {puedePurgar
            ? 'Todo lo que se envió a la papelera. Se purga solo cuando vence, o antes si lo purgas.'
            : 'Lo que enviaste a la papelera. Puedes restaurarlo hasta que se purgue.'}
        </p>
      </header>
      {limpieza ? (
        <Aviso tono="aviso">
          La limpieza de archivos está atrasada:{' '}
          {limpieza.objetos === 1 ? 'hay 1 archivo' : `hay ${String(limpieza.objetos)} archivos`} de
          lo ya purgado que debían haberse borrado{' '}
          {fechaRelativa(limpieza.desde, { ahora: new Date(ahora) })}. Avisa a quien administra el
          sistema.
        </Aviso>
      ) : null}
      {lotes.length === 0 ? (
        <EstadoVacio
          Icono={Trash2Icon}
          titulo="La papelera está vacía"
          descripcion="Lo que envíes a la papelera queda acá hasta que se purga, y mientras tanto se puede restaurar."
        />
      ) : (
        <ul className="grid gap-3">
          {lotes.map((lote) => (
            <LoteDePapelera
              key={lote.id}
              lote={lote}
              origenes={porId}
              ahora={ahora}
              puedePurgar={puedePurgar}
              enCurso={papelera.enCurso}
              alRestaurar={(objetivo) => {
                void papelera.restaurar(objetivo)
              }}
              alPurgar={setAPurgar}
            />
          ))}
        </ul>
      )}
      <ConfirmarPurga
        objetivo={aPurgar}
        papelera={papelera}
        alCerrar={() => {
          setAPurgar(null)
        }}
      />
    </div>
  )
}
