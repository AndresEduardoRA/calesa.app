'use client'

import { useAbiertoAlgunaVez } from '../use-abierto-alguna-vez'
import { ListaDeAtajosDiferida } from './diferidos'
import { useAtajo } from './use-atajo'

type Props = { abierta: boolean; alCambiar: (abierta: boolean) => void }

// `?` abre «Atajos de teclado». Con la lista abierta, otro `?` no hace nada más.
export function AyudaDeAtajos({ abierta, alCambiar }: Props) {
  useAtajo('ayuda', () => {
    alCambiar(true)
  })
  const montada = useAbiertoAlgunaVez(abierta)
  return montada ? <ListaDeAtajosDiferida abierta={abierta} alCambiar={alCambiar} /> : null
}
