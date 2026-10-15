import { Trash2Icon } from 'lucide-react'
import type { Route } from 'next'
import Link from 'next/link'
import { RUTAS } from '@/shared/lib/rutas'
import { buttonVariants } from '@/shared/ui/button'

// A la papelera de leads, desde el listado. Lo recibe quien puede abrirla.
export function EnlaceAPapeleraDeLeads() {
  return (
    <Link
      href={RUTAS.papeleraDeLeads as Route}
      className={buttonVariants({ variant: 'outline', className: 'h-11 md:h-9' })}
    >
      <Trash2Icon aria-hidden />
      Papelera
    </Link>
  )
}
