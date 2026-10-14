import type { Metadata } from 'next'
import { puede, requerirSesion } from '@/modules/equipo'
import { EstadoSinPermiso } from '@/shared/ui/estados'
import { PestanasDeLeads } from './pestanas-de-leads'
import { SeccionCampos } from './seccion-campos'

export const metadata: Metadata = { title: 'Leads' }

// Configuración › Leads. Quien no tiene `leads.configurar` no entra: ningún otro permiso necesita
// leer esta configuración (el layout lo leen las pantallas de leads por su cuenta).
export default async function PaginaDeLeads() {
  const sesion = await requerirSesion()
  if (!puede(sesion.permisos, 'leads.configurar')) {
    return <EstadoSinPermiso />
  }
  return (
    <div className="grid max-w-3xl gap-4">
      <div className="grid gap-1">
        <h1 className="text-(length:--text-xl) font-semibold text-(--color-ink)">Leads</h1>
        <p className="text-(length:--text-sm) text-(--color-ink-soft)">
          Los datos que lleva cada lead, además del nombre, el teléfono, el tipo y el origen. Son
          los mismos para prospectos y clientes.
        </p>
      </div>
      <PestanasDeLeads />
      {/* Hoy hay una sola pestaña: con la segunda, `?seccion=` (`pestanaDe()`) decide cuál se dibuja. */}
      <SeccionCampos />
    </div>
  )
}
