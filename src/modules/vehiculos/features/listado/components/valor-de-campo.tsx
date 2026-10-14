'use client'

import { valorMostrado } from '@/shared/lib/campos'
import { ValorMostrado } from '@/shared/ui/campos'
import { useRegional } from '@/shared/ui/regional'
import type { CampoDeVehiculo } from '../../../entities/campo'

type Props = { campo: CampoDeVehiculo; valor: unknown }

// El valor de un campo del layout, dibujado según su tipo y con el formato de la empresa.
export function ValorDeCampo({ campo, valor }: Props) {
  const { locale, zonaHoraria } = useRegional()
  return <ValorMostrado valor={valorMostrado(campo, valor, { locale, zona: zonaHoraria })} />
}
