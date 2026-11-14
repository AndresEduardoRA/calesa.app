import type { Metadata } from 'next'
import { Suspense } from 'react'
import { z } from 'zod'
import { rutaDeActividadDe } from '@/modules/actividad'
import { origenesParaCotizar, rutaDeLaHoja } from '@/modules/cotizaciones'
import { CotizacionesDelLead } from '@/modules/cotizaciones/pantallas/lead'
import { getAjustes } from '@/modules/empresa'
import { puede, requerirSesion } from '@/modules/equipo'
import {
  accionesDeCartera,
  CLAVE_DE_SECCION,
  duenoDe,
  leerFichaDeLead,
  puedeCambiarTelefonoDeLead,
  puedeEditarTelefonosExtra,
  puedeEditarLead,
  puedeEnviarLead,
  puedeGestionarPortal,
  seccionDeLead,
} from '@/modules/leads'
import {
  EsqueletoDeOportunidades,
  EsqueletoDePortal,
  EsqueletoDeSeguimientos,
  FichaDeLead,
  LeadNoDisponible,
  SeccionOportunidades,
  SeccionPortal,
  SeccionSeguimientos,
} from '@/modules/leads/pantallas/ficha'
import { RegistrarVisita } from '@/modules/buscador/pantallas/visita'
import { getOrigenes } from '@/modules/origenes'
import { opcionesDeVehiculoDelLead } from '@/modules/vehiculos'
import {
  EsqueletoDeVehiculosDelLead,
  SeccionVehiculosDelLead,
} from '@/modules/vehiculos/pantallas/vehiculos-del-lead'
import { leerDireccionPublica } from '@/modules/web'
import { datosO } from '@/shared/lib/errores'
import type { Permisos } from '@/shared/lib/permisos'
import { unParametro } from '@/shared/lib/rutas'
import { EstadoSinPermiso } from '@/shared/ui/estados'
import { RegistrarVisto } from '@/modules/equipo/client'

export const metadata: Metadata = { title: 'Lead' }

// «Vehículos» sólo para quien ve vehículos en algún origen; «Oportunidades», con el lead en la cartera; «Cotizaciones», con `cotizaciones.ver` en algún origen (la RLS
// recorta las filas; sin cartera ni origen: P2 del 4.17-4); «Portal», con la cartera y `leads.portal.gestionar`. Lo que no es una sección que existe (o que la persona no ve) abre «Datos».
const loQueVe = (permisos: Permisos, enCartera: boolean) => ({
  vehiculos: puede(permisos, 'vehiculos.ver'),
  oportunidades: enCartera,
  cotizaciones: puede(permisos, 'cotizaciones.ver'),
  portal: puedeGestionarPortal(permisos, enCartera),
})

// «Cotizar» de la cabecera: la hoja de cotizar con este lead elegido, en el primer origen donde quien mira cotiza (las pestañas de la hoja cambian de origen y
// conservan el lead). Sin `cotizaciones.crear` en ningún origen no lee nada; si la lectura de los orígenes falla, el botón no está y la ficha sigue. La base vuelve a exigirlo.
async function paraCotizarDe(permisos: Permisos, leadId: string): Promise<string | null> {
  if (!puede(permisos, 'cotizaciones.crear')) {
    return null
  }
  const [primero] = origenesParaCotizar(permisos, datosO(await getOrigenes()))
  return primero ? rutaDeLaHoja({ origen: primero.id, lead: leadId }) : null
}

// Las secciones que se leen con su pestaña abierta: «Datos» no paga la línea de tiempo ni nada de lo demás. Cada una es lo que su `<Suspense>` espera.
function seccionesDe(
  datos: { ficha: { id: string; nombre: string } },
  seccion: string,
  ve: { vehiculos: boolean },
) {
  return {
    // Sólo se lee con la sección abierta: «Datos» no paga la línea de tiempo.
    seguimientos:
      seccion === 'seguimientos' ? (
        <Suspense fallback={<EsqueletoDeSeguimientos />}>
          <SeccionSeguimientos
            leadId={datos.ficha.id}
            // Para elegir un vehículo en un seguimiento o un recordatorio (sólo con el permiso).
            {...(ve.vehiculos ? { vehiculos: opcionesDeVehiculoDelLead(datos.ficha.id) } : {})}
          />
        </Suspense>
      ) : null,
    // La sección vive en `vehiculos`: la página la compone (`leads` no importa `vehiculos`).
    vehiculos:
      seccion === 'vehiculos' ? (
        <Suspense fallback={<EsqueletoDeVehiculosDelLead />}>
          <SeccionVehiculosDelLead leadId={datos.ficha.id} leadNombre={datos.ficha.nombre} />
        </Suspense>
      ) : null,
    oportunidades:
      seccion === 'oportunidades' ? (
        <Suspense fallback={<EsqueletoDeOportunidades />}>
          <SeccionOportunidades
            leadId={datos.ficha.id}
            leadNombre={datos.ficha.nombre}
            {...(ve.vehiculos ? { vehiculos: opcionesDeVehiculoDelLead(datos.ficha.id) } : {})}
          />
        </Suspense>
      ) : null,
    // La sección vive en `cotizaciones`: la página la compone (`leads` no importa `cotizaciones`). Se lee desde el navegador al abrirla; la `key` empieza de cero con otro lead.
    cotizaciones:
      seccion === 'cotizaciones' ? (
        <CotizacionesDelLead key={datos.ficha.id} leadId={datos.ficha.id} />
      ) : null,
    // El nombre de la empresa y la dirección de la web los componen `empresa` y `web` (`leads` no los importa).
    portal:
      seccion === 'portal' ? (
        <Suspense fallback={<EsqueletoDePortal />}>
          <SeccionPortal
            leadId={datos.ficha.id}
            leadNombre={datos.ficha.nombre}
            empresa={getAjustes().then((ajustes) => ajustes.nombre)}
            direccion={leerDireccionPublica().then(datosO)}
          />
        </Suspense>
      ) : null,
  }
}

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
  // La lectura de los orígenes corre a la vez que la de la ficha (sólo para quien cotiza).
  const [lectura, paraCotizar] = await Promise.all([
    leerFichaDeLead(id),
    paraCotizarDe(sesion.permisos, id),
  ])
  const datos = datosO(lectura)
  if (!datos) {
    return <LeadNoDisponible />
  }
  const ve = loQueVe(sesion.permisos, datos.ficha.enCartera)
  const seccion = seccionDeLead(unParametro(parametros[CLAVE_DE_SECCION]), ve)
  return (
    <>
      <RegistrarVisita tipo="lead" id={datos.ficha.id} />
      <RegistrarVisto modulo="leads" tipo="lead" id={datos.ficha.id} />
      <FichaDeLead
        ficha={datos.ficha}
        campos={datos.campos}
        origen={datos.origen}
        tipo={datos.tipo}
        usuarioId={sesion.usuarioId}
        puedeEditar={puedeEditarLead(sesion.permisos, datos.ficha.enCartera)}
        puedeCambiarTelefono={puedeCambiarTelefonoDeLead(sesion.permisos, datos.ficha.enCartera)}
        puedeEditarExtras={puedeEditarTelefonosExtra(sesion.permisos, datos.ficha.enCartera)}
        puedeConfigurar={puede(sesion.permisos, 'leads.configurar')}
        seccion={seccion}
        ve={ve}
        paraCotizar={paraCotizar}
        paraActividad={
          puede(sesion.permisos, 'actividad.ver')
            ? rutaDeActividadDe('leads', datos.ficha.id)
            : null
        }
        etiquetas={datos.etiquetas}
        cartera={datos.cartera}
        accionesDeCartera={accionesDeCartera(sesion.permisos, datos.cartera)}
        puedeEnviarAPapelera={puedeEnviarLead(
          sesion.permisos,
          duenoDe(datos.cartera)?.usuarioId ?? null,
          sesion.usuarioId,
        )}
        {...seccionesDe(datos, seccion, ve)}
      />
    </>
  )
}
