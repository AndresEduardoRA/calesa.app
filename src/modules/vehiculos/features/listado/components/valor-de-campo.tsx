'use client'

import { Monto } from '@/shared/ui/monto'
import { useRegional } from '@/shared/ui/regional'
import type { CampoDeVehiculo } from '../../../entities/campo'
import { valorMostrado } from '../../../entities/valor'

type Props = { campo: CampoDeVehiculo; valor: unknown }

// El valor de un campo del layout, dibujado según su tipo. Un monto pasa por <Monto> (Modo Live).
export function ValorDeCampo({ campo, valor }: Props) {
  const { locale, zonaHoraria } = useRegional()
  const mostrado = valorMostrado(campo, valor, { locale, zona: zonaHoraria })
  switch (mostrado.tipo) {
    case 'vacio':
      return <span className="text-(--color-ink-faint)">—</span>
    case 'monto':
      return <Monto valor={mostrado.valor} />
    case 'enlace':
      return (
        <a
          href={mostrado.url}
          target="_blank"
          rel="noreferrer"
          className="text-(--color-primario-ink) underline-offset-2 hover:underline"
        >
          Abrir enlace
        </a>
      )
    case 'texto':
      return <>{mostrado.texto}</>
  }
}
