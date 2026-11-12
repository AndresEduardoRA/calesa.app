import type { Route } from 'next'
import Link from 'next/link'
import { puede } from '@/modules/equipo'
import { leerFasesDeOrigen, leerFlujoDeOrigen } from '@/modules/flujos'
import { leerUnidad } from '@/modules/logistica'
import { PanelDeLaUnidad } from '@/modules/logistica/pantallas/unidad'
import { getOrigenes } from '@/modules/origenes'
import { datosO } from '@/shared/lib/errores'
import type { Permisos } from '@/shared/lib/permisos'
import { RUTAS } from '@/shared/lib/rutas'
import { buttonVariants } from '@/shared/ui/button'
import { EstadoSinPermiso, EstadoVacio } from '@/shared/ui/estados'
import { HUECOS_DE_LA_UNIDAD, huecosDeLaUnidad } from './huecos-de-la-unidad'

// Lo que no existe, lo que está en la papelera y lo que la persona no ve se muestran igual: decir «no tienes permiso» confirmaría que existe.
export function UnidadNoDisponible() {
  return (
    <EstadoVacio
      titulo="Este vehículo ya no está disponible"
      descripcion="No existe o ya no tienes acceso."
      accion={
        <Link href={RUTAS.logistica as Route} className={buttonVariants({ variant: 'outline' })}>
          Ir a Logística
        </Link>
      }
    />
  )
}

// La unidad con ese id y su panel, o el estado que toque (6.01). La usan la página de la unidad y, en la parte 3, el drawer de la cadena. Exige las dos cosas (D3): la fila bajo la
// RLS de `vehiculos` (`vehiculos.ver`) y `logistica.ver` en el origen de la unidad. Un error de lectura sube al `error.tsx` de `(app)`, que ofrece «Reintentar»; el del flujo del
// origen no tumba el panel: deja apagados los huecos que piden una regla y lo dice.
export async function UnidadAbierta({ id, permisos }: { id: string; permisos: Permisos }) {
  const unidad = datosO(await leerUnidad(id))
  if (!unidad) {
    return <UnidadNoDisponible />
  }
  // Esta pantalla es de vehículos: un ítem no tiene origen y no llega por aquí (su panel es `repuestos/item-abierto`).
  if (unidad.origenId === null || !puede(permisos, 'logistica.ver', unidad.origenId)) {
    return <EstadoSinPermiso />
  }
  const [origenes, fases, flujo] = await Promise.all([
    getOrigenes(true),
    leerFasesDeOrigen(unidad.origenId),
    leerFlujoDeOrigen(unidad.origenId),
  ])
  const origen = datosO(origenes).find((uno) => uno.id === unidad.origenId)
  const fase = datosO(fases).find((una) => una.id === unidad.faseId) ?? null
  const { huecos, aviso } = huecosDeLaUnidad(HUECOS_DE_LA_UNIDAD, { unidad, permisos, flujo })
  return (
    <PanelDeLaUnidad
      unidad={unidad}
      origen={origen?.nombre ?? ''}
      fase={fase}
      huecos={huecos}
      aviso={aviso}
    />
  )
}
