import Link from 'next/link'
import type { Route } from 'next'
import { RUTAS } from '@/shared/lib/rutas'
import { buttonVariants } from '@/shared/ui/button'

// El camino de Configuración › Repuestos al flujo de repuestos (8.13-4): las fases por las que avanza un ítem están en Configuración › Flujos. La pantalla de destino y la base
// vuelven a exigir `repuestos.configurar`.
export function EnlaceAlFlujo() {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      <Link
        href={`${RUTAS.configuracionDeFlujos}?ambito=repuestos` as Route}
        className={buttonVariants({ variant: 'outline' })}
      >
        Configurar el flujo de repuestos
      </Link>
      <p className="min-w-0 text-(length:--text-sm) text-(--color-ink-soft)">
        Las fases por las que avanza un ítem, quién las mueve y qué piden para entrar.
      </p>
    </div>
  )
}
