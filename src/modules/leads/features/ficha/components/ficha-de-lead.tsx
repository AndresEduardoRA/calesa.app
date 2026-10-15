'use client'

import { ArrowLeftIcon } from 'lucide-react'
import type { Route } from 'next'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { RUTAS } from '@/shared/lib/rutas'
import { useRegional } from '@/shared/ui/regional'
import type { AccionesDeCartera, PersonaDeCartera } from '../../../entities/cartera'
import type { CampoDeLead } from '../../../entities/campo'
import type { Etiqueta } from '../../../entities/etiqueta'
import {
  origenDeLaFicha,
  quienLoTiene,
  type LeadDeFicha,
  type OrigenConEstado,
  type SeccionDeLead,
} from '../../../entities/ficha'
import { DialogoDeEtiquetas } from '../../etiquetas/components/dialogo-de-etiquetas'
import { useEtiquetas } from '../../etiquetas/hooks/use-etiquetas'
import { usePanelDeEtiquetas } from '../../etiquetas/hooks/use-panel-de-etiquetas'
import { AccionesDeMarcas } from '../../marcas/components/acciones-de-marcas'
import { InsigniasDeMarcas } from '../../marcas/components/insignias-de-marcas'
import { useMarcas } from '../../marcas/hooks/use-marcas'
import { usePanelDeLead } from '../hooks/use-panel-de-lead'
import { AvisoDeVencidos } from './aviso-de-vencidos'
import { BarraDeSecciones } from './barra-de-secciones'
import { BotonEditarLead } from './boton-editar-lead'
import { CabeceraDeLead } from './cabecera-de-lead'
import { PanelDeEdicion } from './panel-de-edicion'
import { PanelDeTelefono } from './panel-de-telefono'
import { RefrescarAlVolver } from './refrescar-al-volver'
import { SeccionDatos } from './seccion-datos'

type Props = {
  ficha: LeadDeFicha
  // Todo el layout de campos de los leads.
  campos: readonly CampoDeLead[]
  // Todos, también los desactivados.
  origenes: readonly OrigenConEstado[]
  // Quien mira: para decir «lo tienes tú».
  usuarioId: string
  puedeEditar: boolean
  // Cartera y `leads.editar`: cambiar el principal y administrar los extras.
  puedeCambiarTelefono: boolean
  // La sección de `?seccion=`.
  seccion: SeccionDeLead
  // Lo que la página lee en el servidor para la sección «Seguimientos» (detrás de `<Suspense>`).
  seguimientos: ReactNode
  // Las etiquetas de quien mira (para nombrar las del lead y elegir otras).
  etiquetas: readonly Etiqueta[]
  // Quién lo tiene, y lo que quien mira puede hacer con eso (compartir, transferir, quitar, salir).
  cartera: readonly PersonaDeCartera[]
  accionesDeCartera: AccionesDeCartera
}

type DatosDeSeccion = {
  ficha: LeadDeFicha
  campos: readonly CampoDeLead[]
  origen: { nombre: string; activo: boolean } | null
  puedeCambiarTelefono: boolean
  seguimientos: ReactNode
  cartera: readonly PersonaDeCartera[]
  accionesDeCartera: AccionesDeCartera
}

// Lo que va bajo la cabecera según `?seccion=`. Cada sección nueva suma su entrada acá (y su
// pestaña en `SECCIONES_DE_LEAD`) cuando exista su contenido.
const CONTENIDO_DE_SECCION: Record<SeccionDeLead, (datos: DatosDeSeccion) => ReactNode> = {
  datos: (datos) => <SeccionDatos {...datos} />,
  seguimientos: (datos) => datos.seguimientos,
}

// La ficha de un lead: su cabecera, la barra de secciones y la sección de `?seccion=` («Datos» o
// «Seguimientos»). Las demás (vehículos, cotizaciones, portal, historial) llegan con su parte y no
// se dibujan hasta entonces.
export function FichaDeLead({
  ficha,
  campos,
  origenes,
  usuarioId,
  puedeEditar,
  puedeCambiarTelefono,
  seccion,
  seguimientos,
  etiquetas: lista,
  cartera,
  accionesDeCartera,
}: Props) {
  const { zonaHoraria } = useRegional()
  const panel = usePanelDeLead()
  const marcas = useMarcas(ficha.id, ficha.marcas)
  const etiquetas = useEtiquetas(lista)
  const gestionar = usePanelDeEtiquetas()
  const origen = origenDeLaFicha(origenes, ficha.origenId)
  return (
    <div className="grid max-w-4xl gap-4">
      <Link
        href={RUTAS.leads as Route}
        className="inline-flex min-h-11 w-fit items-center gap-1.5 text-(length:--text-sm) text-(--color-ink-soft) underline-offset-2 hover:text-(--color-ink) hover:underline md:min-h-8"
      >
        <ArrowLeftIcon aria-hidden className="size-4" />
        Leads
      </Link>
      <CabeceraDeLead
        ficha={ficha}
        origen={origen}
        quien={quienLoTiene(ficha, usuarioId)}
        acciones={
          <>
            <AccionesDeMarcas marcas={marcas} etiquetas={etiquetas} alGestionar={gestionar.abrir} />
            {puedeEditar ? <BotonEditarLead /> : null}
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
      <BarraDeSecciones leadId={ficha.id} actual={seccion} />
      {CONTENIDO_DE_SECCION[seccion]({
        ficha,
        campos,
        origen,
        puedeCambiarTelefono,
        seguimientos,
        cartera,
        accionesDeCartera,
      })}
      <PanelDeEdicion
        ficha={ficha}
        campos={campos}
        origenes={origenes}
        zona={zonaHoraria}
        puedeEditar={puedeEditar}
      />
      <PanelDeTelefono ficha={ficha} puedeCambiar={puedeCambiarTelefono} />
      <DialogoDeEtiquetas etiquetas={etiquetas} />
      <RefrescarAlVolver activo={!panel.hayPanel && !gestionar.abierto} />
    </div>
  )
}
