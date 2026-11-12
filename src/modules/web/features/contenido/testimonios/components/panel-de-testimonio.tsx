'use client'

import { useId } from 'react'
import { Aviso } from '@/shared/ui/aviso'
import { AvisoDeConflicto } from '@/shared/ui/aviso-de-conflicto'
import { CambiosSinGuardar } from '@/shared/ui/cambios-sin-guardar'
import { Drawer } from '@/shared/ui/drawer'
import { PieDelPanel } from '@/shared/ui/pie-del-panel'
import type { Testimonio } from '../../../../entities/contenido/testimonios'
import { useFormularioDeTestimonio } from '../hooks/use-formulario-de-testimonio'
import { CamposDeTestimonio } from './campos-de-testimonio'

type Props = {
  abierto: boolean
  // El testimonio que se edita; nulo = «Nuevo testimonio».
  original: Testimonio | null
  // El que se editaba dejó de existir con el panel abierto: por qué ya no se guarda.
  noDisponible: string | null
  alGuardar: () => void
  alCerrar: () => void
}

// «Nuevo testimonio» o «Editar testimonio»: un Drawer con su URL (`?panel=nuevo-testimonio` o `?panel=testimonio&testimonio=<id>`). Quien lo monta le da
// una `key` por apertura: cada una empieza de cero. Antes de guardar avisa, en vivo, lo que le pasaría al consentimiento (la base lo hace cumplir).
export function PanelDeTestimonio({ abierto, original, noDisponible, alGuardar, alCerrar }: Props) {
  const idDelFormulario = useId()
  const f = useFormularioDeTestimonio({ idDelFormulario, original, alGuardar })
  return (
    <Drawer
      abierto={abierto}
      alCerrar={alCerrar}
      titulo={original ? 'Editar testimonio' : 'Nuevo testimonio'}
      pie={
        <PieDelPanel
          idFormulario={idDelFormulario}
          enCurso={f.enCurso}
          alCancelar={alCerrar}
          etiquetaDeGuardar={original ? 'Guardar' : 'Crear testimonio'}
          sinPuedeEnviar={f.sinCambios || noDisponible !== null || f.conflicto !== null}
        />
      }
    >
      <CambiosSinGuardar hayCambios={f.hayCambios} />
      <form
        id={idDelFormulario}
        className="grid gap-4"
        noValidate
        onSubmit={(evento) => {
          evento.preventDefault()
          void f.enviar()
        }}
      >
        {noDisponible ? (
          <Aviso tono="peligro">{noDisponible} Lo que escribiste no se guardó.</Aviso>
        ) : null}
        {f.conflicto ? <AvisoDeConflicto mensaje={f.conflicto} alRecargar={f.recargar} /> : null}
        <CamposDeTestimonio formulario={f} />
        {f.avisos.map((aviso) => (
          <Aviso key={aviso} tono="aviso">
            {aviso}
          </Aviso>
        ))}
      </form>
    </Drawer>
  )
}
