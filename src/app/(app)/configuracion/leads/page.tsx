import type { Metadata } from 'next'
import { puede, requerirSesion } from '@/modules/equipo'
import { unParametro } from '@/shared/lib/rutas'
import { EstadoSinPermiso } from '@/shared/ui/estados'
import { pestanaDe } from './pestanas'
import { PestanasDeLeads } from './pestanas-de-leads'
import { SeccionCampos } from './seccion-campos'
import { SeccionOrigenes } from './seccion-origenes'

export const metadata: Metadata = { title: 'Leads' }

// Configuración › Leads. Quien no tiene `leads.configurar` no entra: ningún otro permiso necesita
// leer esta configuración (el layout y los orígenes los leen las pantallas de leads por su cuenta).
// Las pestañas viven en `?seccion=`: los campos, y los orígenes del lead.
export default async function PaginaDeLeads({ searchParams }: PageProps<'/configuracion/leads'>) {
  const [sesion, parametros] = await Promise.all([requerirSesion(), searchParams])
  if (!puede(sesion.permisos, 'leads.configurar')) {
    return <EstadoSinPermiso />
  }
  const pestana = pestanaDe(unParametro(parametros['seccion']))
  return (
    <div className="grid max-w-3xl gap-4">
      <div className="grid gap-1">
        <h1 className="text-(length:--text-xl) font-semibold text-(--color-ink)">Leads</h1>
        <p className="text-(length:--text-sm) text-(--color-ink-soft)">
          {pestana === 'campos'
            ? 'Los datos que lleva cada lead, además del nombre, el teléfono, el tipo y el origen. Son los mismos para prospectos y clientes.'
            : 'De dónde llegan los leads. Es lo que se elige en el alta y lo que filtra el listado.'}
        </p>
      </div>
      <PestanasDeLeads />
      {pestana === 'campos' ? <SeccionCampos /> : null}
      {pestana === 'origenes' ? <SeccionOrigenes /> : null}
    </div>
  )
}
