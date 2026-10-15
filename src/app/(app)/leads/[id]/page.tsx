import type { Metadata } from 'next'
import { Suspense } from 'react'
import { z } from 'zod'
import { puede, requerirSesion } from '@/modules/equipo'
import {
  accionesDeCartera,
  CLAVE_DE_SECCION,
  EsqueletoDeSeguimientos,
  FichaDeLead,
  LeadNoDisponible,
  leerFichaDeLead,
  puedeCambiarTelefonoDeLead,
  puedeEditarLead,
  SeccionSeguimientos,
  seccionDeLead,
} from '@/modules/leads'
import { datosO } from '@/shared/lib/errores'
import { unParametro } from '@/shared/lib/rutas'
import { EstadoSinPermiso } from '@/shared/ui/estados'

export const metadata: Metadata = { title: 'Lead' }

// La ficha de un lead. Lo que no existe, lo que está en la papelera o sin dueño y lo que la
// persona no ve se muestran igual: decir «no tienes permiso» confirmaría que existe. Qué recibe de
// él (el teléfono completo, los datos «solo la cartera») lo decide la base.
export default async function PaginaLead({ params, searchParams }: PageProps<'/leads/[id]'>) {
  const [sesion, { id }, parametros] = await Promise.all([requerirSesion(), params, searchParams])
  if (!puede(sesion.permisos, 'leads.ver')) {
    return (
      <EstadoSinPermiso descripcion="No tienes permiso para ver leads. Pídeselo a quien administra los roles." />
    )
  }
  if (!z.guid().safeParse(id).success) {
    return <LeadNoDisponible />
  }
  const datos = datosO(await leerFichaDeLead(id))
  if (!datos) {
    return <LeadNoDisponible />
  }
  // Lo que no es una sección que existe abre «Datos».
  const seccion = seccionDeLead(unParametro(parametros[CLAVE_DE_SECCION]))
  return (
    <FichaDeLead
      ficha={datos.ficha}
      campos={datos.campos}
      origenes={datos.origenes}
      usuarioId={sesion.usuarioId}
      puedeEditar={puedeEditarLead(sesion.permisos, datos.ficha.enCartera)}
      puedeCambiarTelefono={puedeCambiarTelefonoDeLead(sesion.permisos, datos.ficha.enCartera)}
      seccion={seccion}
      etiquetas={datos.etiquetas}
      cartera={datos.cartera}
      accionesDeCartera={accionesDeCartera(sesion.permisos, datos.cartera)}
      // Sólo se lee con la sección abierta: «Datos» no paga la línea de tiempo.
      seguimientos={
        seccion === 'seguimientos' ? (
          <Suspense fallback={<EsqueletoDeSeguimientos />}>
            <SeccionSeguimientos leadId={datos.ficha.id} />
          </Suspense>
        ) : null
      }
    />
  )
}
