import type { ReactNode } from 'react'
import { Monto } from '@/shared/ui/monto'

// Una cifra de dinero grande con su nota. A diferencia de `CifraDelWidget`, el grupo se nombra sólo con el título: el monto
// no va en ningún `aria-label` (el Modo Live lo sacaría de la vista pero no del nombre). Lo lee el árbol desde `<Monto>`.
export function CifraDeMonto({
  titulo,
  valor,
  moneda,
  dato,
  nota,
}: {
  titulo: string
  valor: number
  moneda: string
  // `data-cifra` de la cifra, para leerla en las pruebas sin depender del texto.
  dato: string
  nota?: ReactNode
}) {
  return (
    <div role="group" aria-label={titulo} className="grid gap-2 p-4">
      <p
        data-cifra={dato}
        className="text-(length:--text-2xl) font-semibold text-(--color-ink) tabular-nums"
      >
        <Monto valor={valor} moneda={moneda} />
      </p>
      {nota ? (
        <div className="grid gap-1 text-(length:--text-sm) text-(--color-ink-soft)">{nota}</div>
      ) : null}
    </div>
  )
}
