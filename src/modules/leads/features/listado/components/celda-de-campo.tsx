'use client'

import { valorMostrado } from '@/shared/lib/campos'
import { ValorMostrado } from '@/shared/ui/campos'
import { useRegional } from '@/shared/ui/regional'
import type { CampoDeLead } from '../../../entities/campo'
import type { FilaDeLead } from '../../../entities/listado'

type Props = { campo: CampoDeLead; fila: FilaDeLead }

// El valor de un campo del layout en una fila. Un privado de un lead que no es de la cartera de
// quien mira nunca llega: se dice, en vez de un guion que haría creer que no hay dato.
export function CeldaDeCampo({ campo, fila }: Props) {
  const { locale, zonaHoraria } = useRegional()
  const valor = fila.atributos[campo.clave]
  if (valor === undefined && campo.soloCartera && !fila.enCartera) {
    return <span className="text-(length:--text-xs) text-(--color-ink-faint)">Solo la cartera</span>
  }
  return <ValorMostrado valor={valorMostrado(campo, valor, { locale, zona: zonaHoraria })} />
}
