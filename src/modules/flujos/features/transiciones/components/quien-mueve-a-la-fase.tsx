'use client'

import { Aviso } from '@/shared/ui/aviso'
import { Button } from '@/shared/ui/button'
import type { FaseParaConfigurar, FlujoParaConfigurar } from '../../../entities/flujo'
import type { RolLeido } from '../../../entities/lectura-de-fase'
import {
  NOTA_DE_PERMISO_GENERAL,
  quienMueve,
  textoDeQuienMueve,
} from '../../../entities/transiciones/quien-mueve'
import { firmaDeRoles, rolesGuardadosDeFase } from '../../../entities/transiciones/roles-de-lista'
import { useRolesDeLaFase } from '../hooks/use-roles-de-la-fase'
import type { SalidasDeLaFase } from '../hooks/use-salidas-de-la-fase'
import { SelectorDeRoles } from './selector-de-roles'

type Props = {
  flujo: FlujoParaConfigurar
  fase: FaseParaConfigurar
  roles: readonly RolLeido[]
  salidas: SalidasDeLaFase
}

// «Quién puede mover a esta fase»: lo que rige hoy (la lista de la fase, sin las de cada salida, que van en su fila) y el selector para cambiarla. Vacío: cualquiera
// con el permiso de mover. Acota, no otorga.
export function QuienMueveALaFase({ flujo, fase, roles, salidas }: Props) {
  const guardados = rolesGuardadosDeFase(flujo, fase.id)
  const texto = textoDeQuienMueve(quienMueve(flujo, null, fase.id), roles, false)
  return (
    <div className="grid min-w-0 gap-2 text-(length:--text-sm) break-words">
      <div className="grid gap-0.5">
        <p className="font-medium text-(--color-ink)">Quién puede mover a esta fase</p>
        <p className="text-(--color-ink)">{texto}</p>
        <p className="text-(length:--text-xs) text-(--color-ink-soft)">{NOTA_DE_PERMISO_GENERAL}</p>
      </div>
      <EditorDeRolesDeLaFase
        key={`${fase.id}:${firmaDeRoles(guardados)}`}
        salidas={salidas}
        guardados={guardados}
        roles={roles}
      />
    </div>
  )
}

function EditorDeRolesDeLaFase({
  salidas,
  guardados,
  roles,
}: {
  salidas: SalidasDeLaFase
  guardados: readonly string[]
  roles: readonly RolLeido[]
}) {
  const f = useRolesDeLaFase({ salidas, guardados })
  return (
    <div className="grid justify-items-start gap-2">
      <SelectorDeRoles
        legend="Roles que pueden mover a esta fase"
        ayuda="Vacío: cualquiera con el permiso de mover."
        roles={roles}
        marcados={f.roles}
        alMarcar={f.marcar}
        deshabilitado={f.enCurso}
      />
      {f.aviso === null ? null : <Aviso tono="peligro">{f.aviso}</Aviso>}
      <Button
        type="button"
        variant="outline"
        className="h-11 md:h-8"
        disabled={f.enCurso || !f.hayCambios}
        onClick={() => void f.guardar()}
      >
        {f.enCurso ? 'Guardando…' : 'Guardar quién mueve'}
      </Button>
    </div>
  )
}
