'use client'

import type { ReactNode } from 'react'
import { valorMostrado } from '@/shared/lib/campos'
import { formatearFechaHora } from '@/shared/lib/fechas'
import { Button } from '@/shared/ui/button'
import { ValorMostrado } from '@/shared/ui/campos'
import { useRegional } from '@/shared/ui/regional'
import { Skeleton } from '@/shared/ui/skeleton'
import type { FilaDeLead } from '../../../entities/listado'
import { gruposDelRapido, hayPrivadosSinRecibir } from '../../../entities/rapido'
import { nombreDelOrigen, type DatosDeLaLista } from '../../listado/components/tipos'
import { telefonoDeLista } from '../../listado/components/telefono-de-lista'

function Dato({ etiqueta, children }: { etiqueta: string; children: ReactNode }) {
  return (
    <div className="grid gap-0.5">
      <dt className="text-(length:--text-xs) text-(--color-ink-soft)">{etiqueta}</dt>
      <dd className="text-(length:--text-sm) text-(--color-ink)">{children}</dd>
    </div>
  )
}

export function EsqueletoDelRapido({ etiqueta }: { etiqueta: string }) {
  return (
    <div aria-busy="true" aria-label={etiqueta} className="grid gap-2">
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="h-4 w-2/3" />
      <Skeleton className="h-4 w-1/2" />
    </div>
  )
}

export type PropsDeDatos = DatosDeLaLista & { lead: FilaDeLead }

// Los datos propios del lead que le llegaron a quien mira, agrupados como el layout.
function DatosDelLayout({ lead, campos }: PropsDeDatos) {
  const { locale, zonaHoraria } = useRegional()
  const grupos = gruposDelRapido(campos, lead.atributos)
  return (
    <>
      {grupos.map((grupo) => (
        <section key={grupo.nombre ?? '__sin_grupo'} className="grid gap-2">
          {grupo.nombre ? (
            <h3 className="text-(length:--text-sm) font-semibold text-(--color-ink)">
              {grupo.nombre}
            </h3>
          ) : null}
          <dl className="grid gap-3 sm:grid-cols-2">
            {grupo.datos.map(({ campo, valor }) => (
              <Dato key={campo.clave} etiqueta={campo.etiqueta}>
                <ValorMostrado valor={valorMostrado(campo, valor, { locale, zona: zonaHoraria })} />
              </Dato>
            ))}
          </dl>
        </section>
      ))}
      {grupos.length === 0 ? (
        <p className="text-(length:--text-sm) text-(--color-ink-soft)">
          Todavía no tiene más datos cargados.
        </p>
      ) : null}
      {hayPrivadosSinRecibir(campos, lead.enCartera) ? (
        <p className="text-(length:--text-xs) text-(--color-ink-soft)">
          Algunos datos son solo de su cartera.
        </p>
      ) : null}
    </>
  )
}

type PropsDelCuerpo = PropsDeDatos & { completo: boolean; fallo: boolean; reintentar: () => void }

// «Resumen»: lo que se sabe del lead. Editarlo es de la ficha.
export function CuerpoDelRapido({ completo, fallo, reintentar, ...datos }: PropsDelCuerpo) {
  const { zonaHoraria } = useRegional()
  const { lead, origenes, codigoDePais } = datos
  return (
    <div className="grid gap-4">
      <dl className="grid gap-3">
        <Dato etiqueta="Teléfono">
          <span className="tabular-nums">{telefonoDeLista(lead.telefono, codigoDePais)}</span>
          {lead.enCartera ? null : (
            <span className="mt-0.5 block text-(length:--text-xs) text-(--color-ink-soft)">
              Completo solo para su cartera.
            </span>
          )}
        </Dato>
        <Dato etiqueta="Origen del lead">{nombreDelOrigen(origenes, lead.origenId) ?? '—'}</Dato>
        <Dato etiqueta="Creado">{formatearFechaHora(lead.creadoEn, { zona: zonaHoraria })}</Dato>
      </dl>
      {completo ? (
        <DatosDelLayout {...datos} />
      ) : (
        <EsqueletoDelRapido etiqueta="Cargando los datos" />
      )}
      {fallo ? (
        <div role="alert" className="flex flex-wrap items-center gap-2">
          <p className="text-(length:--text-sm) text-(--color-ink)">
            No se pudieron actualizar los datos.
          </p>
          <Button type="button" variant="outline" size="sm" onClick={reintentar}>
            Reintentar
          </Button>
        </div>
      ) : null}
    </div>
  )
}
