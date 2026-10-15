'use client'

import { ArrowLeftIcon } from 'lucide-react'
import type { Route } from 'next'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { RUTAS } from '@/shared/lib/rutas'
import { useRegional } from '@/shared/ui/regional'
import type { CampoDeLead } from '../../../entities/campo'
import {
  origenDeLaFicha,
  quienLoTiene,
  type LeadDeFicha,
  type OrigenConEstado,
  type SeccionDeLead,
} from '../../../entities/ficha'
import { usePanelDeLead } from '../hooks/use-panel-de-lead'
import { BotonEditarLead } from './boton-editar-lead'
import { CabeceraDeLead } from './cabecera-de-lead'
import { PanelDeEdicion } from './panel-de-edicion'
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
  // La sección de `?seccion=`: por ahora sólo «datos».
  seccion: SeccionDeLead
}

type DatosDeSeccion = {
  ficha: LeadDeFicha
  campos: readonly CampoDeLead[]
  origen: { nombre: string; activo: boolean } | null
}

// Lo que va bajo la cabecera según `?seccion=`. Cada sección nueva suma su entrada acá (y su
// pestaña en `SECCIONES_DE_LEAD`) cuando exista su contenido.
const CONTENIDO_DE_SECCION: Record<SeccionDeLead, (datos: DatosDeSeccion) => ReactNode> = {
  datos: (datos) => <SeccionDatos {...datos} />,
}

// La ficha de un lead: su cabecera y la sección «Datos». Por ahora es la única sección: las
// demás (seguimientos, recordatorios, vehículos, cotizaciones, portal, historial) llegan con su
// parte y no se dibujan hasta entonces.
export function FichaDeLead({ ficha, campos, origenes, usuarioId, puedeEditar, seccion }: Props) {
  const { zonaHoraria } = useRegional()
  const panel = usePanelDeLead()
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
        acciones={puedeEditar ? <BotonEditarLead /> : null}
      />
      {CONTENIDO_DE_SECCION[seccion]({ ficha, campos, origen })}
      <PanelDeEdicion
        ficha={ficha}
        campos={campos}
        origenes={origenes}
        zona={zonaHoraria}
        puedeEditar={puedeEditar}
      />
      <RefrescarAlVolver activo={!panel.abierto} />
    </div>
  )
}
