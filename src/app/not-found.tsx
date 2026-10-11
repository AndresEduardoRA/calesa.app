import type { Metadata } from 'next'
import Link from 'next/link'
import { CompassIcon } from 'lucide-react'
import { buttonVariants } from '@/shared/ui/button'

export const metadata: Metadata = { title: 'No existe' }

// Una dirección que no lleva a nada (mal tipeada, o de algo que se eliminó).
export default function NoEncontrado() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
      <CompassIcon aria-hidden className="size-8 text-(--color-ink-faint)" />
      <h1 className="text-(length:--text-lg) font-medium text-(--color-ink)">
        Esta página no existe
      </h1>
      <p className="max-w-sm text-(length:--text-sm) text-(--color-ink-soft)">
        Puede que la dirección esté mal escrita o que lo que buscabas ya no esté.
      </p>
      <Link href="/" className={buttonVariants({ variant: 'outline' })}>
        Ir al inicio
      </Link>
    </main>
  )
}
