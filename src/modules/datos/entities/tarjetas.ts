// Qué tarjetas de «Exportar» ve cada persona y cuáles puede usar. Sólo decide qué se dibuja: lo que protege es la base
// (`datos_exportacion_registrar` y la RLS de la lectura). Por permisos, nunca por nombre de rol; los orígenes llegan de la base. Sin I/O.
import { puede, type ClavePermiso, type Permisos } from '@/shared/lib/permisos'

export type OrigenDeLaTarjeta = { id: string; nombre: string }

export const MOTIVOS = {
  noVeLeads: 'Tu rol no ve leads.',
  noExportaLeads: 'Tu rol no exporta leads.',
  noVeVehiculos: 'No ves vehículos de ningún origen.',
  noVeCotizaciones: 'No ves cotizaciones de ningún origen.',
} as const

export type Tarjeta = { habilitada: true } | { habilitada: false; motivo: string }

export type TarjetaConOrigenes =
  | { habilitada: true; origenes: OrigenDeLaTarjeta[] }
  | { habilitada: false; motivo: string }
  | { habilitada: false; error: 'origenes' }

export type TarjetasDeExportar = {
  misLeads: Tarjeta
  // `null`: sin `datos.exportar.todo` el bloque no se dibuja.
  todo: { leads: Tarjeta; vehiculos: TarjetaConOrigenes; cotizaciones: TarjetaConOrigenes } | null
}

function tarjetaDeLeads(permisos: Permisos): Tarjeta {
  return puede(permisos, 'leads.ver')
    ? { habilitada: true }
    : { habilitada: false, motivo: MOTIVOS.noVeLeads }
}

function tarjetaDeMisLeads(permisos: Permisos): Tarjeta {
  if (!puede(permisos, 'leads.ver')) {
    return { habilitada: false, motivo: MOTIVOS.noVeLeads }
  }
  return puede(permisos, 'leads.exportar')
    ? { habilitada: true }
    : { habilitada: false, motivo: MOTIVOS.noExportaLeads }
}

// Los orígenes donde la clave vale, en el orden en que llegan.
function origenesDonde(
  permisos: Permisos,
  clave: ClavePermiso,
  origenes: readonly OrigenDeLaTarjeta[],
): OrigenDeLaTarjeta[] {
  return origenes.filter((origen) => puede(permisos, clave, origen.id))
}

function tarjetaDeVehiculos(
  permisos: Permisos,
  origenes: readonly OrigenDeLaTarjeta[] | null,
): TarjetaConOrigenes {
  if (!puede(permisos, 'vehiculos.ver')) {
    return { habilitada: false, motivo: MOTIVOS.noVeVehiculos }
  }
  if (origenes === null) {
    return { habilitada: false, error: 'origenes' }
  }
  const donde = origenesDonde(permisos, 'vehiculos.ver', origenes)
  return donde.length === 0
    ? { habilitada: false, motivo: MOTIVOS.noVeVehiculos }
    : { habilitada: true, origenes: donde }
}

// Sin orígenes leídos sigue habilitada: «Todos los orígenes» no necesita la lista.
function tarjetaDeCotizaciones(
  permisos: Permisos,
  origenes: readonly OrigenDeLaTarjeta[] | null,
): TarjetaConOrigenes {
  if (!puede(permisos, 'cotizaciones.ver')) {
    return { habilitada: false, motivo: MOTIVOS.noVeCotizaciones }
  }
  return {
    habilitada: true,
    origenes: origenes === null ? [] : origenesDonde(permisos, 'cotizaciones.ver', origenes),
  }
}

export function tarjetasDeExportar(
  permisos: Permisos,
  origenes: readonly OrigenDeLaTarjeta[] | null,
): TarjetasDeExportar {
  return {
    misLeads: tarjetaDeMisLeads(permisos),
    todo: puede(permisos, 'datos.exportar.todo')
      ? {
          leads: tarjetaDeLeads(permisos),
          vehiculos: tarjetaDeVehiculos(permisos, origenes),
          cotizaciones: tarjetaDeCotizaciones(permisos, origenes),
        }
      : null,
  }
}
