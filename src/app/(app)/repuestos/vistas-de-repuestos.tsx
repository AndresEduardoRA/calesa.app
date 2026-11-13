import type { Route } from 'next'
import Link from 'next/link'
import { RUTAS } from '@/shared/lib/rutas'
import { buttonVariants } from '@/shared/ui/button'

const VISTAS = [
  { clave: 'proyectos', etiqueta: 'Proyectos', ruta: RUTAS.repuestos },
  { clave: 'cadena', etiqueta: 'Cadena', ruta: `${RUTAS.repuestos}?vista=cadena` },
  { clave: 'stock', etiqueta: 'Stock', ruta: `${RUTAS.repuestos}?vista=stock` },
] as const

// «Proyectos», «Cadena» (8.13-3) y «Stock» de `/repuestos` (8.10-3, D3): enlaces (la vista es `?vista=`) y no pestañas, así recargar y compartir llevan a la misma lista. Cambiar de vista no
// conserva filtros ni página: no son los mismos.
export function VistasDeRepuestos({ vista }: { vista: 'proyectos' | 'cadena' | 'stock' }) {
  return (
    <nav aria-label="Qué ver" className="flex flex-wrap gap-2">
      {VISTAS.map((cada) => (
        <Link
          key={cada.clave}
          href={cada.ruta as Route}
          aria-current={cada.clave === vista ? 'page' : undefined}
          className={buttonVariants({
            variant: cada.clave === vista ? 'secondary' : 'ghost',
            className: 'h-11 md:h-9',
          })}
        >
          {cada.etiqueta}
        </Link>
      ))}
    </nav>
  )
}
