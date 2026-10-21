'use client'

import { ArrowLeftIcon } from 'lucide-react'
import type { Route } from 'next'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { RUTAS } from '@/shared/lib/rutas'
import type { AccionesDeCartera, PersonaDeCartera } from '../../../entities/cartera'
import type { TipoDeLeadEnCatalogo } from '../../../entities/catalogos'
import type { CampoDeLead } from '../../../entities/campo'
import type { Etiqueta } from '../../../entities/etiqueta'
import {
  quienLoTiene,
  type LeadDeFicha,
  type LoQueVe,
  type SeccionDeLead,
} from '../../../entities/ficha'
import { DialogoDeEtiquetas } from '../../etiquetas/components/dialogo-de-etiquetas'
import { useEtiquetas } from '../../etiquetas/hooks/use-etiquetas'
import { usePanelDeEtiquetas } from '../../etiquetas/hooks/use-panel-de-etiquetas'
import { InsigniasDeMarcas } from '../../marcas/components/insignias-de-marcas'
import { useMarcas } from '../../marcas/hooks/use-marcas'
import { usePanelDeLead } from '../hooks/use-panel-de-lead'
import { AvisoDeVencidos } from './aviso-de-vencidos'
import { BarraDeSecciones } from './barra-de-secciones'
import { AccionesDeLaFicha } from './acciones-de-la-ficha'
import { CabeceraDeLead } from './cabecera-de-lead'
import { EdicionDeLaFicha } from './edicion-de-la-ficha'
import { PanelDeTelefono } from './panel-de-telefono'
import { RefrescarAlVolver } from './refrescar-al-volver'
import { SeccionDatos } from './seccion-datos'

type Props = {
  ficha: LeadDeFicha
  // Los campos activos del layout: los que dibuja «Datos». El panel de edición lee el layout completo al abrirse.
  campos: readonly CampoDeLead[]
  // El origen y el tipo de este lead, también apagados: lo nombran. Los catálogos completos los lee el panel de edición al abrirse.
  origen: { nombre: string; activo: boolean; icono: string | null } | null
  tipo: TipoDeLeadEnCatalogo | null
  // Quien mira: para decir «lo tienes tú».
  usuarioId: string
  puedeEditar: boolean
  // Cartera y `leads.editar`: cambiar el principal y administrar los extras.
  puedeCambiarTelefono: boolean
  // La sección de `?seccion=`.
  seccion: SeccionDeLead
  // Lo que la página lee en el servidor para la sección «Seguimientos» (detrás de `<Suspense>`).
  seguimientos: ReactNode
  // La sección «Vehículos»: vive en `vehiculos` y la compone la página (`leads` no importa `vehiculos`).
  vehiculos: ReactNode
  // La sección «Oportunidades» (detrás de `<Suspense>`): la página la monta sólo con `?seccion=oportunidades`.
  oportunidades: ReactNode
  // La sección «Portal» (detrás de `<Suspense>`): la página la monta sólo con `?seccion=portal`.
  portal: ReactNode
  // Lo que quien mira ve: decide qué secciones se dibujan.
  ve: LoQueVe
  // Las etiquetas de quien mira (para nombrar las del lead y elegir otras).
  etiquetas: readonly Etiqueta[]
  // Quién lo tiene, y lo que quien mira puede hacer con eso (compartir, transferir, quitar, salir).
  cartera: readonly PersonaDeCartera[]
  accionesDeCartera: AccionesDeCartera
  // Quien mira puede enviar este lead a la papelera (`leads.eliminar`: «todos», o «propios» siendo el dueño).
  puedeEnviarAPapelera: boolean
}

type DatosDeSeccion = {
  ficha: LeadDeFicha
  campos: readonly CampoDeLead[]
  origen: { nombre: string; activo: boolean; icono: string | null } | null
  tipo: TipoDeLeadEnCatalogo | null
  puedeCambiarTelefono: boolean
  seguimientos: ReactNode
  vehiculos: ReactNode
  oportunidades: ReactNode
  portal: ReactNode
  cartera: readonly PersonaDeCartera[]
  accionesDeCartera: AccionesDeCartera
  // Quien mira gestiona el acceso del cliente: transferir avisa si está vigente.
  vePortal: boolean
}

// Lo que va bajo la cabecera según `?seccion=`. Cada sección nueva suma su entrada acá (y su
// pestaña en `SECCIONES_DE_LEAD`) cuando exista su contenido.
const CONTENIDO_DE_SECCION: Record<SeccionDeLead, (datos: DatosDeSeccion) => ReactNode> = {
  datos: (datos) => <SeccionDatos {...datos} />,
  seguimientos: (datos) => datos.seguimientos,
  vehiculos: (datos) => datos.vehiculos,
  oportunidades: (datos) => datos.oportunidades,
  portal: (datos) => datos.portal,
}

// El enlace de vuelta al listado, arriba de la cabecera.
function VolverALeads() {
  return (
    <Link
      href={RUTAS.leads as Route}
      className="inline-flex min-h-11 w-fit items-center gap-1.5 text-(length:--text-sm) text-(--color-ink-soft) underline-offset-2 hover:text-(--color-ink) hover:underline md:min-h-8"
    >
      <ArrowLeftIcon aria-hidden className="size-4" />
      Leads
    </Link>
  )
}

type PropsDeLosPaneles = {
  ficha: LeadDeFicha
  puedeEditar: boolean
  puedeCambiarTelefono: boolean
  etiquetas: ReturnType<typeof useEtiquetas>
  // Ningún panel abierto: la ficha vuelve a leer al volver a la pestaña.
  refrescaAlVolver: boolean
}

// Lo que se abre encima de la ficha: editar el lead, cambiar el teléfono, gestionar etiquetas. Cada uno vive en su `?panel=`.
function PanelesDeLaFicha(props: PropsDeLosPaneles) {
  const { ficha, puedeEditar, puedeCambiarTelefono, etiquetas } = props
  return (
    <>
      <EdicionDeLaFicha ficha={ficha} puedeEditar={puedeEditar} />
      <PanelDeTelefono ficha={ficha} puedeCambiar={puedeCambiarTelefono} />
      <DialogoDeEtiquetas etiquetas={etiquetas} />
      <RefrescarAlVolver activo={props.refrescaAlVolver} />
    </>
  )
}

// La ficha de un lead: su cabecera, la barra de secciones y la sección de `?seccion=` («Datos»,
// «Seguimientos», «Vehículos», «Oportunidades» o «Portal»). Las demás (cotizaciones, historial) llegan
// con su parte y no se dibujan hasta entonces.
export function FichaDeLead({
  ficha,
  campos,
  origen,
  tipo,
  usuarioId,
  puedeEditar,
  puedeCambiarTelefono,
  seccion,
  seguimientos,
  vehiculos,
  oportunidades,
  portal,
  ve,
  etiquetas: lista,
  cartera,
  accionesDeCartera,
  puedeEnviarAPapelera,
}: Props) {
  const panel = usePanelDeLead()
  const marcas = useMarcas(ficha.id, ficha.marcas)
  const etiquetas = useEtiquetas(lista)
  const gestionar = usePanelDeEtiquetas()
  return (
    // Una sola columna que no crece con su contenido: sin `minmax(0, 1fr)`, la barra de secciones (con
    // cinco, más ancha que un celular) ensanchaba toda la ficha y los modales quedaban cortados.
    <div className="grid max-w-4xl grid-cols-[minmax(0,1fr)] gap-4">
      <VolverALeads />
      <CabeceraDeLead
        ficha={ficha}
        origen={origen}
        tipo={tipo}
        quien={quienLoTiene(ficha, usuarioId)}
        acciones={
          <>
            <AccionesDeLaFicha
              ficha={ficha}
              marcas={marcas}
              etiquetas={etiquetas}
              alGestionar={gestionar.abrir}
              puedeEditar={puedeEditar}
              puedeEnviarAPapelera={puedeEnviarAPapelera}
            />
          </>
        }
        marcas={
          <InsigniasDeMarcas
            marcas={marcas.marcas}
            etiquetas={etiquetas.lista}
            conFavorito={false}
          />
        }
      />
      <AvisoDeVencidos leadId={ficha.id} vencidos={ficha.recordatoriosVencidos} seccion={seccion} />
      <BarraDeSecciones leadId={ficha.id} actual={seccion} ve={ve} />
      {CONTENIDO_DE_SECCION[seccion]({
        ficha,
        campos,
        origen,
        tipo,
        puedeCambiarTelefono,
        seguimientos,
        vehiculos,
        oportunidades,
        portal,
        cartera,
        accionesDeCartera,
        vePortal: ve.portal,
      })}
      <PanelesDeLaFicha
        {...{ ficha, puedeEditar, puedeCambiarTelefono, etiquetas }}
        refrescaAlVolver={!panel.hayPanel && !gestionar.abierto}
      />
    </div>
  )
}
