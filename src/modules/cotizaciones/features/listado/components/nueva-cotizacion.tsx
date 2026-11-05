'use client'

import { PlusIcon } from 'lucide-react'
import type { Route } from 'next'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAtajo } from '@/shared/ui/atajos'
import { buttonVariants } from '@/shared/ui/button'

// «Nueva cotización»: abre la hoja de cotizar en `ruta` (`rutaDeLaHoja`, con el origen del filtro si ahí se cotiza). La tecla N hace lo mismo mientras el botón esté.
export function NuevaCotizacion({ ruta }: { ruta: string }) {
  const router = useRouter()
  useAtajo('nuevo', () => {
    router.push(ruta as Route)
  })
  return (
    <Link href={ruta as Route} className={buttonVariants({ className: 'h-11 md:h-9' })}>
      <PlusIcon aria-hidden />
      Nueva cotización
    </Link>
  )
}
