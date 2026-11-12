import Link from 'next/link'
import { puede } from '@/modules/equipo'
import type { Unidad } from '@/modules/logistica'
import { PanelDeLaUnidad } from '@/modules/logistica/pantallas/unidad'
import { leerItemDelPanel } from '@/modules/repuestos'
import { datosO } from '@/shared/lib/errores'
import type { Permisos } from '@/shared/lib/permisos'
import { RUTAS } from '@/shared/lib/rutas'
import { buttonVariants } from '@/shared/ui/button'
import { EstadoSinPermiso, EstadoVacio } from '@/shared/ui/estados'
import { HUECOS_DE_LA_UNIDAD, huecosDeLaUnidad } from '../logistica/huecos-de-la-unidad'

// Lo que no existe, lo que está en la papelera y lo que la persona no ve se muestran igual: decir «no tienes permiso» confirmaría que existe.
function ItemNoDisponible() {
  return (
    <EstadoVacio
      titulo="Este repuesto ya no está disponible"
      descripcion="No existe o ya no tienes acceso."
      accion={
        <Link href={RUTAS.repuestos} className={buttonVariants({ variant: 'outline' })}>
          Volver a Repuestos
        </Link>
      }
    />
  )
}

// El ítem con ese id y su panel, o el estado que toque (8.13-2). `repuestos` lee el ítem (fase, proyecto) bajo la RLS de quien mira y `logistica` dibuja el panel: `logistica` no importa
// `repuestos`, así que la unidad se arma aquí. Sin origen (el flujo de repuestos no lo tiene): los huecos se filtran por `repuestos.ver`. No va atada a la página: la «Cadena» la monta igual.
// Un error de lectura sube al `error.tsx` de `(app)`, que ofrece «Reintentar».
export async function ItemAbierto({ id, permisos }: { id: string; permisos: Permisos }) {
  if (!puede(permisos, 'repuestos.ver')) {
    return <EstadoSinPermiso />
  }
  const item = datosO(await leerItemDelPanel(id))
  if (item === null) {
    return <ItemNoDisponible />
  }
  const unidad: Unidad = {
    tipo: 'repuesto',
    id: item.id,
    origenId: null,
    titulo: item.descripcion,
    faseId: item.faseId,
    faseDesde: item.faseDesde,
    proyecto: { id: item.proyecto.id, vehiculoId: item.proyecto.vehiculoId },
  }
  const { huecos, aviso } = huecosDeLaUnidad(HUECOS_DE_LA_UNIDAD, {
    unidad,
    permisos,
    flujo: { ok: true, data: null },
  })
  return (
    <PanelDeLaUnidad
      unidad={unidad}
      origen={`Proyecto #${String(item.proyecto.numero)}`}
      fase={item.fase}
      huecos={huecos}
      aviso={aviso}
    />
  )
}
