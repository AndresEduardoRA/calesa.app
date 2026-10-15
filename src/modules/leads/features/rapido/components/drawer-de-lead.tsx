'use client'

import type { Route } from 'next'
import Link from 'next/link'
import { z } from 'zod'
import { valorMostrado } from '@/shared/lib/campos'
import { formatearFechaHora } from '@/shared/lib/fechas'
import { RUTAS } from '@/shared/lib/rutas'
import { Button, buttonVariants } from '@/shared/ui/button'
import { ValorMostrado } from '@/shared/ui/campos'
import { Drawer } from '@/shared/ui/drawer'
import { useRegional } from '@/shared/ui/regional'
import { Skeleton } from '@/shared/ui/skeleton'
import { useUltimo } from '@/shared/ui/use-ultimo'
import type { FilaDeLead } from '../../../entities/listado'
import {
  gruposDelRapido,
  hayPrivadosSinRecibir,
  vistaDelRapido,
  type VistaDelRapido,
} from '../../../entities/rapido'
import { BadgeDeTipo } from '../../listado/components/badge-de-tipo'
import { telefonoDeLista } from '../../listado/components/telefono-de-lista'
import { nombreDelOrigen, type DatosDeLaLista } from '../../listado/components/tipos'
import { useDrawerDeLead } from '../hooks/use-drawer-de-lead'
import { useLeadRapido } from '../hooks/use-lead-rapido'

type Props = DatosDeLaLista & {
  // Las filas de la página: de ahí sale lo que se ve de inmediato, mientras llega la lectura.
  filas: readonly FilaDeLead[]
  // Quien mira sólo ve su cartera (alcance «propios», o «ver como» un rol con él): un lead que no
  // es de su cartera no se muestra aunque la base lo entregue.
  soloMios: boolean
}

const ES_GUID = z.guid()

function Dato({ etiqueta, children }: { etiqueta: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-0.5">
      <dt className="text-(length:--text-xs) text-(--color-ink-soft)">{etiqueta}</dt>
      <dd className="text-(length:--text-sm) text-(--color-ink)">{children}</dd>
    </div>
  )
}

function EsqueletoDelRapido({ etiqueta }: { etiqueta: string }) {
  return (
    <div aria-busy="true" aria-label={etiqueta} className="grid gap-2">
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="h-4 w-2/3" />
      <Skeleton className="h-4 w-1/2" />
    </div>
  )
}

type PropsDeDatos = DatosDeLaLista & { lead: FilaDeLead }

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

// Lo que se sabe del lead. Sólo lectura: sin acciones ni seguimientos; la ficha es lo que sigue.
function CuerpoDelRapido({ completo, fallo, reintentar, ...datos }: PropsDelCuerpo) {
  const { zonaHoraria } = useRegional()
  const { lead, origenes, codigoDePais } = datos
  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <BadgeDeTipo tipo={lead.tipo} className="w-fit" />
        <Link
          href={`${RUTAS.leads}/${lead.id}` as Route}
          className={buttonVariants({ variant: 'outline', className: 'h-11 md:h-9' })}
        >
          Abrir ficha
        </Link>
      </div>
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

type PropsDelContenido = {
  vista: VistaDelRapido
  // El último lead que se mostró: el drawer que se cierra no se vacía.
  ultimo: FilaDeLead | null
  reintentar: () => void
  datos: DatosDeLaLista
}

// Lo que va adentro del drawer según cómo esté la lectura.
function ContenidoDelRapido({ vista, ultimo, reintentar, datos }: PropsDelContenido) {
  if (vista.tipo === 'no_disponible') {
    return (
      <p role="status" className="text-(length:--text-sm) text-(--color-ink)">
        Este lead ya no está disponible: no existe o ya no tienes acceso.
      </p>
    )
  }
  if (vista.tipo === 'error') {
    return (
      <div role="alert" className="grid gap-3">
        <p className="text-(length:--text-sm) text-(--color-ink)">No se pudo cargar el lead.</p>
        <Button type="button" variant="outline" onClick={reintentar} className="w-fit">
          Reintentar
        </Button>
      </div>
    )
  }
  const lead = vista.tipo === 'lead' ? vista.lead : ultimo
  if (lead === null) {
    return <EsqueletoDelRapido etiqueta="Cargando el lead" />
  }
  return (
    <CuerpoDelRapido
      {...datos}
      lead={lead}
      completo={vista.tipo === 'lead' ? vista.completo : true}
      fallo={vista.tipo === 'lead' && vista.fallo}
      reintentar={reintentar}
    />
  )
}

// El drawer rápido de un lead (`?lead=`): un vistazo de sólo lectura sin salir de la lista. Se
// dibuja enseguida con lo que ya trajo la página y se completa con su lectura. Si el lead
// desaparece, o deja de ser visible, mientras está abierto lo dice sin explicar por qué.
export function DrawerDeLead({ filas, soloMios, ...datos }: Props) {
  const { id, cerrar } = useDrawerDeLead()
  const idValido = id !== null && ES_GUID.safeParse(id).success
  const { lectura, reintentar } = useLeadRapido(idValido ? id : null)
  const vista = vistaDelRapido({
    id,
    idValido,
    lectura,
    delListado: filas.find((fila) => fila.id === id) ?? null,
    soloMios,
  })
  // Al cerrarse, el drawer tarda un momento en irse: conserva su último lead para no vaciarse.
  const ultimo = useUltimo(vista.tipo === 'lead' ? vista.lead : null)
  const mostrado = vista.tipo === 'lead' ? vista.lead : ultimo
  const sinLead = vista.tipo === 'no_disponible'
  return (
    <Drawer
      abierto={id !== null}
      alCerrar={cerrar}
      titulo={sinLead ? 'Lead no disponible' : (mostrado?.nombre ?? 'Lead')}
      {...(mostrado && !sinLead ? { descripcion: `Lead #${String(mostrado.numero)}` } : {})}
    >
      <ContenidoDelRapido vista={vista} ultimo={ultimo} reintentar={reintentar} datos={datos} />
    </Drawer>
  )
}
