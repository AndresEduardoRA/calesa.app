import type { Route } from 'next'
import Link from 'next/link'
import { RUTAS } from '@/shared/lib/rutas'
import { buttonVariants } from '@/shared/ui/button'

// El ⚙ de una celda de tipo de cambio hasta el 4.20-3c (P3): la hoja no sabe qué tarifa nombra la celda, así que dice dónde se cambia. Sin lectura ni formulario.
export function TipoDeCambioEnLaEmpresa() {
  return (
    <div className="grid gap-3">
      <p className="text-(length:--text-base) text-(--color-ink)">
        Los tipos de cambio son de la empresa y valen para todos los orígenes: se cambian en
        Configuración › Empresa › Monedas.
      </p>
      <Link
        href={`${RUTAS.empresa}?seccion=monedas` as Route}
        className={buttonVariants({
          variant: 'outline',
          className: 'min-h-11 justify-self-start md:min-h-8',
        })}
      >
        Ir a Monedas
      </Link>
    </div>
  )
}
