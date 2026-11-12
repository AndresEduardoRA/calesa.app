'use client'

import { Button } from '@/shared/ui/button'
import { useEliminarProyecto } from '../hooks/use-eliminar-proyecto'

type Props = { id: string; numero: number; actualizadoEn: string }

// «Eliminar proyecto» (8.09-4, C7): sólo con `repuestos.editar` y la hoja sin ítems (la cabecera no lo dibuja si no). Sin confirmación: es reversible, se avisa con «Deshacer». Apagado mientras corre;
// en el celular, a todo el ancho y de 44 px.
export function BotonDeEliminarProyecto({ id, numero, actualizadoEn }: Props) {
  const { eliminar, enCurso } = useEliminarProyecto({ id, numero, actualizadoEn })
  return (
    <Button
      type="button"
      variant="outline"
      disabled={enCurso}
      onClick={() => {
        void eliminar()
      }}
      className="min-h-11 w-full sm:w-auto"
    >
      Eliminar proyecto
    </Button>
  )
}
