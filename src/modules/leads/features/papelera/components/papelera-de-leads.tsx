'use client'

import { ArrowLeftIcon, Trash2Icon } from 'lucide-react'
import type { Route } from 'next'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useState } from 'react'
import { CLAVE_DE_CURSOR } from '@/shared/lib/filtros'
import type { Pagina } from '@/shared/lib/paginacion'
import { RUTAS } from '@/shared/lib/rutas'
import { EstadoPaginaSinFilas, EstadoVacio } from '@/shared/ui/estados'
import { Paginacion } from '@/shared/ui/paginacion'
import { TITULO_DE_LA_PAPELERA, type LoteDePapelera as Lote } from '../../../entities/papelera'
import { usePapelera, type Objetivo } from '../hooks/use-papelera'
import { ConfirmarPurga } from './confirmar-purga'
import { LoteDePapelera } from './lote-de-papelera'

type Props = {
  // Una página de los lotes que todavía tienen algo adentro: los propios o, para quien puede vaciarla, todos.
  pagina: Pagina<Lote>
  puedePurgar: boolean
  // El instante en que el servidor armó la página (ISO): contra él se cuentan los días.
  ahora: string
}

const VOLVER =
  'inline-flex min-h-11 w-fit items-center gap-1.5 text-(length:--text-sm) text-(--color-ink-soft) underline-offset-2 hover:text-(--color-ink) hover:underline md:min-h-8'

// La papelera de leads, por lote: quién envió qué, cuándo, y cuánto falta para que se purgue sola.
// Restaurar se hace y lo dice; purgar pide confirmar nombrando lo que se borra. Sólo se ve el
// nombre y el número de cada lead: nunca su teléfono ni sus datos privados.
export function PapeleraDeLeads({ pagina, puedePurgar, ahora }: Props) {
  const papelera = usePapelera()
  const hayCursor = useSearchParams().has(CLAVE_DE_CURSOR)
  const lotes = pagina.filas
  const [aPurgar, setAPurgar] = useState<Objetivo | null>(null)
  return (
    <div className="grid max-w-4xl gap-4">
      <Link href={RUTAS.leads as Route} className={VOLVER}>
        <ArrowLeftIcon aria-hidden className="size-4" />
        Leads
      </Link>
      <header className="grid gap-1">
        <h1 className="text-(length:--text-xl) font-semibold text-(--color-ink)">
          {TITULO_DE_LA_PAPELERA}
        </h1>
        <p className="text-(length:--text-sm) text-(--color-ink-soft)">
          {puedePurgar
            ? 'Todo lo que se envió a la papelera. Se purga solo cuando vence, o antes si lo purgas.'
            : 'Lo que enviaste a la papelera. Puedes restaurarlo hasta que se purgue.'}
        </p>
      </header>
      {lotes.length === 0 && hayCursor ? (
        <EstadoPaginaSinFilas />
      ) : lotes.length === 0 ? (
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
      <Paginacion siguiente={pagina.siguiente} anterior={pagina.anterior} />
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
