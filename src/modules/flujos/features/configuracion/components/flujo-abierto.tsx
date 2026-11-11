'use client'

import { useState } from 'react'
import { useAbiertoAlgunaVez } from '@/shared/ui/use-abierto-alguna-vez'
import type { FlujoParaConfigurar } from '../../../entities/flujo'
import type { RolLeido } from '../../../entities/lectura-de-fase'
import { useFaseAbierta } from '../hooks/use-fase-abierta'
import { InspectorDeFaseDiferido } from './diferidos'
import type { HuecosDelFlujo } from './huecos'
import { ListaDeFases } from './lista-de-fases'
import { ProveedorDelFlujo } from './proveedor-del-flujo'

type Props = {
  flujo: FlujoParaConfigurar
  nombreDelFlujo: string
  roles: readonly RolLeido[]
  huecos: HuecosDelFlujo
}

// El flujo abierto: su proveedor de versión, la lista de fases y, montado la primera vez que se abre, el inspector de la fase que dice `?fase=`. Un id que no es
// de una fase del flujo se ignora: no abre nada ni escribe la URL.
export function FlujoAbierto({ flujo, nombreDelFlujo, roles, huecos }: Props) {
  const { texto, abrir, cerrar } = useFaseAbierta()
  const fase = flujo.fases.find((f) => f.id === texto)
  // La última fase abierta se conserva mientras el panel se cierra con su animación.
  const [ultima, setUltima] = useState(fase)
  if (fase && fase !== ultima) {
    setUltima(fase)
  }
  const montado = useAbiertoAlgunaVez(fase !== undefined)
  const mostrada = fase ?? ultima
  return (
    <ProveedorDelFlujo flujoId={flujo.id} version={flujo.version}>
      <ListaDeFases flujo={flujo} nombreDelFlujo={nombreDelFlujo} huecos={huecos} alAbrir={abrir} />
      {montado && mostrada ? (
        <InspectorDeFaseDiferido
          abierto={fase !== undefined}
          alCerrar={cerrar}
          flujo={flujo}
          nombreDelFlujo={nombreDelFlujo}
          fase={mostrada}
          roles={roles}
          huecos={huecos}
        />
      ) : null}
    </ProveedorDelFlujo>
  )
}
