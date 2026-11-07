import { Trash2Icon } from 'lucide-react'
import type { Route } from 'next'
import Link from 'next/link'
import type { Permisos } from '@/shared/lib/permisos'
import { buttonVariants } from '@/shared/ui/button'
import { puedeAbrirLaPapeleraDeCotizaciones } from '../../../entities/papelera/acceso'
import { RUTA_DE_LA_PAPELERA_DE_COTIZACIONES } from '../../../entities/papelera/ruta'

// A la papelera de cotizaciones, desde el listado, antes de «Nueva cotización». Sólo lo dibuja quien puede abrirla (P2 a). Es un Server Component: `/cotizaciones` no paga JS por él.
export function EnlaceAPapeleraDeCotizaciones({ permisos }: { permisos: Permisos }) {
  if (!puedeAbrirLaPapeleraDeCotizaciones(permisos)) {
    return null
  }
  return (
    <Link
      href={RUTA_DE_LA_PAPELERA_DE_COTIZACIONES as Route}
      className={buttonVariants({ variant: 'outline', className: 'h-11 md:h-9' })}
    >
      <Trash2Icon aria-hidden />
      Papelera
    </Link>
  )
}
