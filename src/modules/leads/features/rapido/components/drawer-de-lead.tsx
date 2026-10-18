'use client'

import type { Route } from 'next'
import Link from 'next/link'
import { z } from 'zod'
import { valorMostrado } from '@/shared/lib/campos'
import { formatearFechaHora } from '@/shared/lib/fechas'
import { RUTAS } from '@/shared/lib/rutas'
import { PencilIcon } from 'lucide-react'
import { Button, buttonVariants } from '@/shared/ui/button'
import { ValorMostrado } from '@/shared/ui/campos'
import { Drawer } from '@/shared/ui/drawer'
import { useRegional } from '@/shared/ui/regional'
import { Skeleton } from '@/shared/ui/skeleton'
import { useAbiertoAlgunaVez } from '@/shared/ui/use-abierto-alguna-vez'
import { useUltimo } from '@/shared/ui/use-ultimo'
import type { FilaDeLead } from '../../../entities/listado'
import {
  gruposDelRapido,
  hayPrivadosSinRecibir,
  vistaDelRapido,
  type PestanaDelRapido,
  type VistaDelRapido,
} from '../../../entities/rapido'
import { BadgeDeTipo } from '../../listado/components/badge-de-tipo'
import { InsigniasDeMarcas } from '../../marcas/components/insignias-de-marcas'
import { telefonoDeLista } from '../../listado/components/telefono-de-lista'
import { nombreDelOrigen, type DatosDeLaLista } from '../../listado/components/tipos'
import { useNumerosEnTexto } from '@/shared/ui/numero-de-lead'
import { useDrawerDeLead } from '../hooks/use-drawer-de-lead'
import { useLeadRapido } from '../hooks/use-lead-rapido'
import { EdicionDelResumenDiferido } from './diferidos'
import { PestanasDelRapido } from './pestanas-del-rapido'

type Props = DatosDeLaLista & {
  // Las filas de la página: de ahí sale lo que se ve de inmediato, mientras llega la lectura.
  filas: readonly FilaDeLead[]
  // Quien mira sólo ve su cartera (alcance «propios», o «ver como» un rol con él): un lead que no
  // es de su cartera no se muestra aunque la base lo entregue.
  soloMios: boolean
  // Quien mira tiene `leads.editar`: con el lead en su cartera, el resumen ofrece «Editar».
  puedeEditar: boolean
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

type PropsDeLaCabecera = Pick<PropsDeDatos, 'lead' | 'etiquetas'> & {
  // «Editar»: sólo con permiso y con el lead en la cartera.
  alEditar: (() => void) | null
}

// Lo de arriba, en las tres pestañas: el tipo, las marcas de quien mira, «Editar» y «Abrir ficha».
function CabeceraDelRapido({ lead, etiquetas, alEditar }: PropsDeLaCabecera) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <span className="flex flex-wrap items-center gap-2">
        <BadgeDeTipo tipo={lead.tipo} className="w-fit" />
        {/* El estado de las marcas de quien mira; se cambian en la fila o en la ficha. */}
        <InsigniasDeMarcas marcas={lead.marcas} etiquetas={etiquetas} />
      </span>
      <span className="flex flex-wrap items-center gap-2">
        {alEditar ? (
          <Button type="button" variant="outline" className="h-11 md:h-9" onClick={alEditar}>
            <PencilIcon aria-hidden />
            Editar
          </Button>
        ) : null}
        <Link
          href={`${RUTAS.leads}/${lead.id}` as Route}
          className={buttonVariants({ variant: 'outline', className: 'h-11 md:h-9' })}
        >
          Abrir ficha
        </Link>
      </span>
    </div>
  )
}

type PropsDelCuerpo = PropsDeDatos & { completo: boolean; fallo: boolean; reintentar: () => void }

// «Resumen»: lo que se sabe del lead. Editarlo es de la ficha.
function CuerpoDelRapido({ completo, fallo, reintentar, ...datos }: PropsDelCuerpo) {
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

type PropsDelContenido = {
  vista: VistaDelRapido
  // Hay un lead en la URL (el drawer no se está cerrando).
  abierto: boolean
  pestana: PestanaDelRapido
  alElegir: (pestana: PestanaDelRapido) => void
  // El último lead que se mostró: el drawer que se cierra no se vacía.
  ultimo: FilaDeLead | null
  reintentar: () => void
  datos: DatosDeLaLista
  // Abre el panel de edición, o nulo si quien mira no puede editar.
  alEditar: (() => void) | null
}

// Lo que va adentro del drawer según cómo esté la lectura.
function ContenidoDelRapido({
  vista,
  abierto,
  pestana,
  alElegir,
  ultimo,
  reintentar,
  datos,
  alEditar,
}: PropsDelContenido) {
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
  // El último que se mostró sólo mientras se cierra: con otro lead en la URL, se espera el suyo (con
  // las pestañas del anterior, anotar escribiría en otro lead).
  const lead = vista.tipo === 'lead' ? vista.lead : abierto ? null : ultimo
  if (lead === null) {
    return <EsqueletoDelRapido etiqueta="Cargando el lead" />
  }
  return (
    <div className="grid gap-4">
      <CabeceraDelRapido
        lead={lead}
        etiquetas={datos.etiquetas}
        alEditar={lead.enCartera ? alEditar : null}
      />
      <PestanasDelRapido
        leadId={lead.id}
        pestana={pestana}
        alElegir={alElegir}
        resumen={
          <CuerpoDelRapido
            {...datos}
            lead={lead}
            completo={vista.tipo === 'lead' ? vista.completo : true}
            fallo={vista.tipo === 'lead' && vista.fallo}
            reintentar={reintentar}
          />
        }
      />
    </div>
  )
}

type PropsDeLaEdicion = {
  // `?panel=editar-lead` está en la URL.
  pedida: boolean
  // El lead que se muestra; sólo se edita si quien mira puede.
  lead: FilaDeLead | null
  puedeEditar: boolean
  campos: DatosDeLaLista['campos']
  origenes: DatosDeLaLista['origenes']
  alGuardado: () => void
}

// El panel de edición va dentro del resumen (Base UI anida los diálogos por el árbol de React, así Esc y «Cancelar» cierran sólo el panel)
// y llega al pulsar «Editar», no al abrir el resumen.
function EdicionDelDrawer(props: PropsDeLaEdicion) {
  const { pedida, lead, puedeEditar, campos, origenes, alGuardado } = props
  const pedidaAlgunaVez = useAbiertoAlgunaVez(pedida)
  if (lead === null || !puedeEditar || !pedidaAlgunaVez) {
    return null
  }
  return (
    <EdicionDelResumenDiferido
      leadId={lead.id}
      nombre={lead.nombre}
      campos={campos}
      origenes={origenes}
      alGuardado={alGuardado}
      alPerderElLead={alGuardado}
    />
  )
}

// El drawer rápido de un lead (`?lead=`) sin salir de la lista: «Resumen» (los datos), «Seguimientos»
// (`?pestana=seguimientos`: la línea de tiempo con anotar) y «Recordatorios» (`?pestana=recordatorios`:
// «Tus recordatorios» con agendar); cada pestaña lee lo suyo al elegirse. Se dibuja enseguida
// con lo que ya trajo la página y se completa con su lectura. Si el lead desaparece, o deja de ser
// visible, mientras está abierto lo dice sin explicar por qué; con un modal abierto adentro no vuelve
// a leer (lo dice el modal al guardar).
export function DrawerDeLead({ filas, soloMios, puedeEditar, ...datos }: Props) {
  const { id, pestana, conModal, elegirPestana, cerrar, editar, editando } = useDrawerDeLead()
  const idValido = id !== null && ES_GUID.safeParse(id).success
  const { lectura, reintentar } = useLeadRapido(idValido ? id : null, conModal)
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
  const numeros = useNumerosEnTexto(mostrado)
  return (
    <Drawer
      abierto={id !== null}
      ancho="amplio"
      alCerrar={cerrar}
      titulo={sinLead ? 'Lead no disponible' : (mostrado?.nombre ?? 'Lead')}
      descripcion={sinLead || numeros === '' ? undefined : numeros}
    >
      <ContenidoDelRapido
        vista={vista}
        abierto={id !== null}
        pestana={pestana}
        alElegir={elegirPestana}
        ultimo={ultimo}
        reintentar={reintentar}
        datos={datos}
        alEditar={puedeEditar ? editar : null}
      />
      <EdicionDelDrawer
        pedida={editando}
        lead={mostrado}
        puedeEditar={puedeEditar}
        campos={datos.campos}
        origenes={datos.origenes}
        alGuardado={reintentar}
      />
    </Drawer>
  )
}
