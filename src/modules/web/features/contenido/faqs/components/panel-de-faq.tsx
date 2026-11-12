'use client'

import { useId } from 'react'
import { Aviso } from '@/shared/ui/aviso'
import { AvisoDeConflicto } from '@/shared/ui/aviso-de-conflicto'
import { CambiosSinGuardar } from '@/shared/ui/cambios-sin-guardar'
import { Drawer } from '@/shared/ui/drawer'
import { PieDelPanel } from '@/shared/ui/pie-del-panel'
import type { Faq } from '../../../../entities/contenido/faqs'
import { useFormularioDeFaq } from '../hooks/use-formulario-de-faq'
import { CamposDeFaq } from './campos-de-faq'

type Props = {
  abierto: boolean
  // La pregunta que se edita; nula = «Nueva pregunta».
  original: Faq | null
  // Las categorías ya usadas: las sugerencias del campo.
  categorias: readonly string[]
  // La que se editaba dejó de existir con el panel abierto: por qué ya no se guarda.
  noDisponible: string | null
  alGuardar: () => void
  alCerrar: () => void
}

// «Nueva pregunta» o «Editar pregunta»: un Drawer con su URL (`?panel=nueva-faq` o `?panel=faq&faq=<id>`). Quien lo monta le da una `key` por apertura: cada
// una empieza de cero.
export function PanelDeFaq({
  abierto,
  original,
  categorias,
  noDisponible,
  alGuardar,
  alCerrar,
}: Props) {
  const idDelFormulario = useId()
  const f = useFormularioDeFaq({ idDelFormulario, original, alGuardar })
  return (
    <Drawer
      abierto={abierto}
      alCerrar={alCerrar}
      titulo={original ? 'Editar pregunta' : 'Nueva pregunta'}
      pie={
        <PieDelPanel
          idFormulario={idDelFormulario}
          enCurso={f.enCurso}
          alCancelar={alCerrar}
          etiquetaDeGuardar={original ? 'Guardar' : 'Crear pregunta'}
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
        <CamposDeFaq formulario={f} categorias={categorias} />
      </form>
    </Drawer>
  )
}
