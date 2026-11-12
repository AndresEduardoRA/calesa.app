import { leerFueraDeRegla, armarFueraDeRegla, type GrupoDelPanel } from '@/modules/flujos'
import type { FlujoParaConfigurar } from '@/modules/flujos'
import { AvisoDeFueraDeRegla } from '@/modules/flujos/pantallas/requisitos'
import { FILTRO_FASE, leerTitulosDeVehiculos } from '@/modules/vehiculos'
import { ok } from '@/shared/lib/errores'
import { Aviso } from '@/shared/ui/aviso'
import { RUTAS } from '@/shared/lib/rutas'

// El camino de una fase al inventario: los vehículos de ese origen en esa fase. Un flujo de repuestos no tiene inventario al que enlazar.
function caminoAlInventario(flujo: FlujoParaConfigurar, faseId: string): string | null {
  if (flujo.ambito !== 'vehiculos' || flujo.origenId === null) {
    return null
  }
  const parametros = new URLSearchParams({ origen: flujo.origenId, [FILTRO_FASE]: faseId })
  return `${RUTAS.vehiculos}?${parametros.toString()}`
}

// El aviso «N unidades fuera de regla» sobre la lista de fases (5.08): las unidades que ya están en una fase y no cumplen lo que ésta pide ahora. La base devuelve
// ids; los títulos de los vehículos salen de `vehiculos` con la sesión de quien mira (`flujos` no lo importa) y lo que no ve se nombra sin título. Sin unidades,
// no dibuja nada. Una lectura que falla lo dice sin tumbar la pantalla.
export async function FueraDeReglaDelFlujo({ flujo }: { flujo: FlujoParaConfigurar }) {
  const lectura = await leerFueraDeRegla({ flujoId: flujo.id })
  if (!lectura.ok) {
    return <Aviso tono="aviso">No pudimos revisar las unidades fuera de regla.</Aviso>
  }
  const { unidades, hayMas } = lectura.data
  if (unidades.length === 0) {
    return null
  }
  const ids = unidades.flatMap((u) => (u.vehiculoId === null ? [] : [u.vehiculoId]))
  const titulos =
    ids.length === 0 ? ok(new Map<string, string>()) : await leerTitulosDeVehiculos(ids)
  const grupos: GrupoDelPanel[] = armarFueraDeRegla(
    unidades,
    titulos.ok ? titulos.data : null,
    flujo.fases,
  ).map((g) => ({ ...g, href: caminoAlInventario(flujo, g.faseId) }))
  return (
    <AvisoDeFueraDeRegla
      n={unidades.length}
      hayMas={hayMas}
      grupos={grupos}
      titulosFallaron={!titulos.ok}
    />
  )
}
