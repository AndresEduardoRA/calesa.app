'use client'

import { Button } from '@/shared/ui/button'
import { useCierreDeProyecto } from '../hooks/use-cierre-de-proyecto'

type Props = { id: string; numero: number; actualizadoEn: string; cerrado: boolean }

// «Cerrar proyecto» o «Reabrir proyecto» (8.09-2, C3): sólo con `repuestos.editar` (la cabecera no lo dibuja sin él). Apagado mientras corre. En el celular, a todo el ancho y de 44 px.
export function BotonDeCierre({ id, numero, actualizadoEn, cerrado }: Props) {
  const { cerrar, reabrir, enCurso } = useCierreDeProyecto({ id, numero, actualizadoEn })
  return (
    <Button
      type="button"
      variant={cerrado ? 'outline' : 'default'}
      disabled={enCurso}
      onClick={() => {
        void (cerrado ? reabrir() : cerrar())
      }}
      className="min-h-11 w-full sm:w-auto"
    >
      {cerrado ? 'Reabrir proyecto' : 'Cerrar proyecto'}
    </Button>
  )
}
