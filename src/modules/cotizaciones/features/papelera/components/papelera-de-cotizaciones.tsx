'use client'

import { ArrowLeftIcon, Trash2Icon } from 'lucide-react'
import type { Route } from 'next'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useMemo } from 'react'
import { CLAVE_DE_CURSOR } from '@/shared/lib/filtros'
import type { Pagina } from '@/shared/lib/paginacion'
import { RUTAS } from '@/shared/lib/rutas'
import { EstadoPaginaSinFilas, EstadoVacio } from '@/shared/ui/estados'
import { Paginacion } from '@/shared/ui/paginacion'
import type { LoteDeCotizaciones } from '../../../entities/papelera/lotes'
import { RUTA_DEL_LISTADO } from '../../../entities/ruta-de-la-hoja'
import { usePapelera } from '../hooks/use-papelera'
import { LoteDePapelera } from './lote-de-papelera'

type Props = {
  // Una página de los lotes que todavía tienen algo adentro: los propios o, para quien puede vaciarla, todos.
  pagina: Pagina<LoteDeCotizaciones>
  puedePurgar: boolean
  // Los orígenes que la página leyó, para nombrar el de cada cotización.
  origenes: readonly { id: string; nombre: string }[]
  // El instante en que el servidor armó la página (ISO): contra él se cuentan los días.
  ahora: string
  // Si quien mira puede abrir la papelera de vehículos (lo compone `src/app`: `cotizaciones` no importa `vehiculos`).
  papeleraDeVehiculos: boolean
}

const VOLVER =
  'inline-flex min-h-11 w-fit items-center gap-1.5 text-(length:--text-sm) text-(--color-ink-soft) underline-offset-2 hover:text-(--color-ink) hover:underline md:min-h-8'

// La papelera de cotizaciones, por lote: quién envió qué, cuándo, y cuánto falta para que se purgue sola. Restaurar se hace y lo dice. Las cotizaciones que se fueron con su
// vehículo no están aquí: vuelven al restaurar el vehículo (P8 a del 4.24-1a).
export function PapeleraDeCotizaciones({
  pagina,
  puedePurgar,
  origenes,
  ahora,
  papeleraDeVehiculos,
}: Props) {
  const papelera = usePapelera()
  const hayCursor = useSearchParams().has(CLAVE_DE_CURSOR)
  const lotes = pagina.filas
  const nombresDeOrigenes = useMemo(
    () => new Map(origenes.map((origen) => [origen.id, origen.nombre])),
    [origenes],
  )
  return (
    <div className="grid max-w-4xl gap-4">
      <Link href={RUTA_DEL_LISTADO as Route} className={VOLVER}>
        <ArrowLeftIcon aria-hidden className="size-4" />
        Cotizaciones
      </Link>
      <header className="grid gap-1">
        <h1 className="text-(length:--text-xl) font-semibold text-(--color-ink)">
          Papelera de cotizaciones
        </h1>
        <p className="text-(length:--text-sm) text-(--color-ink-soft)">
          {puedePurgar
            ? 'Todo lo que se envió a la papelera. Se purga solo cuando vence.'
            : 'Lo que enviaste a la papelera. Puedes restaurarlo hasta que se purgue.'}
        </p>
        <p className="text-(length:--text-sm) text-(--color-ink-soft)">
          Las cotizaciones que se fueron con su vehículo no están aquí: vuelven al restaurar el
          vehículo, en su papelera.
          {papeleraDeVehiculos ? (
            <>
              {' '}
              <Link
                href={RUTAS.papeleraDeVehiculos as Route}
                className="text-(--color-ink) underline underline-offset-2"
              >
                Ir a la papelera de vehículos
              </Link>
            </>
          ) : null}
        </p>
      </header>
      {lotes.length === 0 && hayCursor ? (
        <EstadoPaginaSinFilas />
      ) : lotes.length === 0 ? (
        <EstadoVacio
          Icono={Trash2Icon}
          titulo="La papelera está vacía"
          descripcion="Lo que envíes a la papelera queda aquí hasta que se purga, y mientras tanto se puede restaurar."
        />
      ) : (
        <ul className="grid grid-cols-[minmax(0,1fr)] gap-3">
          {lotes.map((lote) => (
            <LoteDePapelera
              key={lote.id}
              lote={lote}
              ahora={ahora}
              puedePurgar={puedePurgar}
              nombresDeOrigenes={nombresDeOrigenes}
              enCurso={papelera.enCurso}
              alRestaurar={(objetivo) => {
                void papelera.restaurar(objetivo)
              }}
            />
          ))}
        </ul>
      )}
      <Paginacion siguiente={pagina.siguiente} anterior={pagina.anterior} />
    </div>
  )
}
