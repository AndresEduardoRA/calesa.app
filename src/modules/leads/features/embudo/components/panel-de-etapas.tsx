'use client'

import { useId } from 'react'
import { Aviso } from '@/shared/ui/aviso'
import { AvisoDeConflicto } from '@/shared/ui/aviso-de-conflicto'
import { CambiosSinGuardar } from '@/shared/ui/cambios-sin-guardar'
import { Drawer } from '@/shared/ui/drawer'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import { PieDelPanel } from '@/shared/ui/pie-del-panel'
import { LARGO_MAXIMO_DE_EMBUDO, type Embudo } from '../../../entities/embudo'
import { usePanelDeEtapas } from '../hooks/use-panel-de-etapas'
import { EliminarEmbudo } from './eliminar-embudo'
import { ListaDeEtapas } from './lista-de-etapas'

type Props = {
  embudo: Embudo
  embudos: readonly Embudo[]
  alCerrar: () => void
}

// «Etapas» del embudo abierto (`?panel=etapas`): el nombre del embudo, sus etapas y «Eliminar embudo».
// Todo se guarda junto, con la versión del embudo. Una etapa con oportunidades no se quita (lo dice
// la base, nombrándola).
export function PanelDeEtapas({ embudo, embudos, alCerrar }: Props) {
  const panel = usePanelDeEtapas(embudo, embudos, alCerrar)
  const idFormulario = useId()
  const idNombre = useId()
  return (
    <Drawer
      abierto
      alCerrar={alCerrar}
      titulo={`Etapas de «${embudo.nombre}»`}
      descripcion="Tu embudo es tuyo: nadie más lo ve. Ordena las etapas con las flechas."
      pie={
        <PieDelPanel idFormulario={idFormulario} enCurso={panel.enCurso} alCancelar={alCerrar} />
      }
    >
      <CambiosSinGuardar hayCambios={panel.hayCambios} />
      <form
        id={idFormulario}
        className="grid gap-4"
        onSubmit={(evento) => {
          evento.preventDefault()
          void panel.enviar()
        }}
      >
        {panel.conflicto ? (
          <AvisoDeConflicto mensaje={panel.conflicto} alRecargar={panel.recargar} />
        ) : null}
        {panel.error ? (
          <Aviso tono="peligro">
            <p>{panel.error}</p>
          </Aviso>
        ) : null}
        <div className="grid gap-1.5">
          <Label htmlFor={idNombre}>Nombre del embudo</Label>
          <Input
            id={idNombre}
            value={panel.nombre}
            maxLength={LARGO_MAXIMO_DE_EMBUDO + 10}
            className="h-11 md:h-9"
            onChange={(evento) => {
              panel.setNombre(evento.target.value)
            }}
          />
        </div>
        <ListaDeEtapas panel={panel} />
        <EliminarEmbudo embudo={embudo} alTerminar={alCerrar} />
      </form>
    </Drawer>
  )
}
