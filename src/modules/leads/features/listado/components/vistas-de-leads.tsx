'use client'

import { MenuDeVistas, type VistaGuardada } from '@/modules/equipo/client'
import { parametrosDeFiltros, type EsquemaDeFiltros } from '@/shared/lib/filtros'
import { useFiltrosDelListado } from '@/shared/ui/filtros'
import { CLAVE_DE_ALCANCE, VALOR_TODOS, type ModoDelListado } from '../../../entities/alcance'

type Props = {
  esquema: EsquemaDeFiltros
  vistas: readonly VistaGuardada[]
  modo: ModoDelListado
}

// Las vistas guardadas de los leads: los filtros de ahora y, si se miran todos, «todos». Una vista
// de «todos» aplicada por quien ya no lo puede ver se lee como «míos»: el parámetro se ignora.
export function VistasDeLeads({ esquema, vistas, modo }: Props) {
  const filtros = useFiltrosDelListado()
  return (
    <MenuDeVistas
      pantalla="leads"
      vistas={vistas}
      actuales={{
        ...(modo === 'todos' ? { [CLAVE_DE_ALCANCE]: VALOR_TODOS } : {}),
        ...parametrosDeFiltros(esquema, filtros.valores),
      }}
      puedeGuardar={filtros.hayFiltros || modo === 'todos'}
    />
  )
}
