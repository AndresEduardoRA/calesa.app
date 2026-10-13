'use client'

import { PlusIcon } from 'lucide-react'
import type { Route } from 'next'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { parseAsString, useQueryStates } from 'nuqs'
import { RUTAS } from '@/shared/lib/rutas'
import { Aviso } from '@/shared/ui/aviso'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { EstadoVacio } from '@/shared/ui/estados'
import { MOTIVO_SIN_PERMISO_ORIGENES } from '../../../entities/motivos'
import { contados } from '../../../entities/nombre'
import { ETIQUETA_DE_TIPO_DE_ORIGEN, type OrigenConUso } from '../../../entities/origen'
import { useOrigenes } from '../hooks/use-origenes'
import { PanelNuevoOrigen } from './panel-nuevo-origen'

type Props = { origenes: readonly OrigenConUso[]; puedeGestionar: boolean }

const PANEL_NUEVO = 'nuevo'

function BotonNuevo({ puedeGestionar, alCrear }: { puedeGestionar: boolean; alCrear: () => void }) {
  return (
    <Button className="h-11 md:h-8" onClick={alCrear} disabled={!puedeGestionar}>
      <PlusIcon aria-hidden />
      Nuevo origen
    </Button>
  )
}

// La lista de orígenes, también los desactivados. Abrir uno lleva a su pantalla; crear abre un
// panel con su URL (`?panel=nuevo`).
export function ListaDeOrigenes({ origenes, puedeGestionar }: Props) {
  const router = useRouter()
  const ediciones = useOrigenes()
  const [{ panel }, setParametros] = useQueryStates({ panel: parseAsString }, { shallow: false })
  const cerrar = () => void setParametros({ panel: null })

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-(length:--text-xl) font-semibold text-(--color-ink)">Orígenes</h1>
        <BotonNuevo
          puedeGestionar={puedeGestionar}
          alCrear={() => void setParametros({ panel: PANEL_NUEVO })}
        />
      </div>
      {puedeGestionar ? null : <Aviso>{MOTIVO_SIN_PERMISO_ORIGENES}</Aviso>}
      {origenes.length === 0 ? (
        <EstadoVacio
          titulo="Todavía no hay orígenes"
          descripcion="Un origen es de dónde vienen los vehículos. Al crearlo nacen su flujo de logística y sus campos."
          accion={
            puedeGestionar ? (
              <Button onClick={() => void setParametros({ panel: PANEL_NUEVO })}>
                Crear el primer origen
              </Button>
            ) : undefined
          }
        />
      ) : (
        <ul className="divide-y divide-(--color-line) overflow-hidden rounded-(--radius-card) border border-(--color-line) bg-(--color-surface)">
          {origenes.map((origen) => (
            <li key={origen.id}>
              <Link
                href={`${RUTAS.origenes}/${origen.id}` as Route}
                className="flex min-h-14 flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-2 outline-none hover:bg-(--color-surface-3) focus-visible:shadow-(--shadow-focus)"
              >
                <span className="flex min-w-0 flex-wrap items-center gap-2">
                  <span
                    aria-hidden
                    className="size-3 shrink-0 rounded-full"
                    style={{ backgroundColor: origen.color }}
                  />
                  <span className="truncate text-(length:--text-base) font-medium text-(--color-ink)">
                    {origen.nombre}
                  </span>
                  <Badge variant="secondary">{ETIQUETA_DE_TIPO_DE_ORIGEN[origen.tipo]}</Badge>
                  {origen.activo ? null : <Badge variant="outline">Inactivo</Badge>}
                </span>
                <span className="text-(length:--text-sm) text-(--color-ink-soft)">
                  {contados(origen.uso.vehiculos, origen.sustantivo)} ·{' '}
                  {contados(origen.uso.cotizaciones, 'cotización')}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <PanelNuevoOrigen
        abierto={panel === PANEL_NUEVO && puedeGestionar}
        ediciones={ediciones}
        alCerrar={cerrar}
        alCrear={(id) => {
          // Sin `cerrar()` antes: el cambio de `?panel=` y la navegación se pisarían, y gana el
          // último en llegar. La pantalla del origen no trae el panel.
          router.push(`${RUTAS.origenes}/${id}` as Route)
        }}
      />
    </div>
  )
}
