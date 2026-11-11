import type { ClaveDePaso, PasoConDestino, PasoSiguiente } from '@/modules/origenes'
import { puede, type ClavePermiso, type Permisos } from '@/shared/lib/permisos'
import { RUTAS } from '@/shared/lib/rutas'

type Destino = {
  // null = la pantalla todavía no existe: el paso se dice, sin enlace. `pasos.test.ts` comprueba
  // que cada ruta declarada tiene su `page.tsx`.
  ruta: string | null
  // La pantalla abre el flujo de este origen (`?origen=<id>`) y el permiso se mira en él (D8, D18).
  porOrigen?: true
  permiso: ClavePermiso
  motivo: string
}

// A dónde lleva cada paso. La fórmula todavía no tiene pantalla.
export const DESTINOS_DE_PASO: Record<ClaveDePaso, Destino> = {
  flujo: {
    ruta: RUTAS.configuracionDeFlujos,
    porOrigen: true,
    permiso: 'flujos.configurar',
    motivo: 'Lo configura quien tiene el permiso «Configurar el flujo».',
  },
  formula: {
    ruta: null,
    permiso: 'cotizaciones.configurar',
    motivo: 'La publica quien tiene el permiso «Configurar el cotizador».',
  },
  permisos: {
    ruta: RUTAS.roles,
    permiso: 'equipo.roles.gestionar',
    motivo: 'Los reparte quien tiene el permiso «Gestionar roles».',
  },
  apibara: {
    ruta: `${RUTAS.empresa}?seccion=integraciones`,
    permiso: 'empresa.ajustes.gestionar',
    motivo: 'La activa quien tiene el permiso «Ajustes de la empresa».',
  },
}

export function conDestino(
  pasos: readonly PasoSiguiente[],
  permisos: Permisos,
  origenId: string,
): PasoConDestino[] {
  return pasos.map((paso) => {
    const destino = DESTINOS_DE_PASO[paso.clave]
    // El permiso del paso «Flujo» se mira en este origen: tener `flujos.configurar` en otro no alcanza.
    const sinPermiso = !puede(permisos, destino.permiso, destino.porOrigen ? origenId : null)
    return {
      ...paso,
      ruta:
        destino.ruta !== null && destino.porOrigen
          ? `${destino.ruta}?origen=${origenId}`
          : destino.ruta,
      // Lo que no tiene pantalla se dice igual para todos; sin el permiso, el motivo.
      motivoDeshabilitado: destino.ruta !== null && sinPermiso ? destino.motivo : null,
    }
  })
}
