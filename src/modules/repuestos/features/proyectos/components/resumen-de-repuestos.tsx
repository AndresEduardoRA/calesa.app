import type { Route } from 'next'
import Link from 'next/link'
import { conteoEnFrase } from '@/shared/lib/conteo'
import { RUTAS } from '@/shared/lib/rutas'
import { Badge } from '@/shared/ui/badge'
import { buttonVariants } from '@/shared/ui/button'
import { EstadoVacio } from '@/shared/ui/estados'
import {
  ofertaDelResumen,
  type ProyectoDeVehiculo,
  type ResumenDeItems,
} from '../../../entities/proyectos/resumen'
import { CLAVE_DE_VEHICULO, PANEL_NUEVO_PROYECTO } from '../../../entities/proyectos/paneles'
import { rutaDelProyecto } from '../../../entities/proyectos/rutas'
import { EstadoDelProyecto } from './estado-del-proyecto'

type Props = {
  vehiculoId: string
  // Nulo: el vehículo no tiene proyecto de repuestos (o quien mira no lo ve).
  lectura: { proyecto: ProyectoDeVehiculo; resumen: ResumenDeItems } | null
  // `repuestos.editar`: sin él no se ofrece crear.
  puedeCrear: boolean
}

const TEXTO_SIN_PROYECTO = 'Este vehículo no tiene proyecto de repuestos.'

function ParaCrear({ vehiculoId }: { vehiculoId: string }) {
  const parametros = new URLSearchParams({
    panel: PANEL_NUEVO_PROYECTO,
    [CLAVE_DE_VEHICULO]: vehiculoId,
  })
  return (
    <Link
      href={`${RUTAS.repuestos}?${parametros.toString()}` as Route}
      className={buttonVariants({ variant: 'default', className: 'min-h-11 sm:min-h-0' })}
    >
      Crear proyecto de repuestos
    </Link>
  )
}

function cantidadDeItems({ total }: ResumenDeItems): string {
  if (!total.hayMas && total.n === 0) {
    return 'Sin ítems todavía.'
  }
  if (!total.hayMas && total.n === 1) {
    return '1 ítem'
  }
  return `${conteoEnFrase(total)} ítems`
}

// El resumen de repuestos de la pestaña «Repuestos» de la ficha del vehículo (8.09-4, C4): sin proyecto, el vacío con «Crear proyecto de repuestos» (sólo con `repuestos.editar`);
// con él, el enlace, su estado y cuántos ítems lleva por fase. Un conteo nunca es un total exacto («más de 200 ítems»). Sin estado ni cliente: lo lee el servidor.
export function ResumenRepuestos({ vehiculoId, lectura, puedeCrear }: Props) {
  const oferta = ofertaDelResumen({ proyecto: lectura?.proyecto ?? null, puedeCrear })
  if (lectura === null) {
    return (
      <EstadoVacio
        compacto
        titulo={TEXTO_SIN_PROYECTO}
        accion={oferta === 'crear' ? <ParaCrear vehiculoId={vehiculoId} /> : undefined}
      />
    )
  }
  const { proyecto, resumen } = lectura
  return (
    <section
      aria-label="Repuestos del vehículo"
      className="grid min-w-0 gap-3 rounded-(--radius-card) border border-(--color-border) p-4"
    >
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href={rutaDelProyecto(proyecto.id) as Route}
          aria-label={`Abrir el proyecto #${proyecto.numero}`}
          className="inline-flex min-h-11 items-center text-(length:--text-lg) font-semibold tabular-nums underline underline-offset-2 sm:min-h-0"
        >
          Proyecto #{proyecto.numero}
        </Link>
        <EstadoDelProyecto estado={resumen.estado} />
      </div>
      <p className="text-(length:--text-sm) text-(--color-ink-soft)">{cantidadDeItems(resumen)}</p>
      {resumen.grupos.length > 0 ? (
        <ul className="flex min-w-0 flex-wrap gap-2" aria-label="Ítems por fase">
          {resumen.grupos.map((g) => (
            <li key={g.faseId ?? 'sin-fase'}>
              <Badge variant="outline">
                {g.color === null ? null : (
                  <span
                    aria-hidden
                    className="size-2 rounded-full"
                    style={{ backgroundColor: g.color }}
                  />
                )}
                {g.nombre} · {g.n}
              </Badge>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  )
}
