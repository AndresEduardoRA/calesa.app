'use client'

import { Button } from './button'

type Props = {
  // El `id` del <form> que envía el botón «Guardar».
  idFormulario: string
  // Un alta ofrece «Guardar y cargar otro».
  esAlta?: boolean
  enCurso: boolean
  alCancelar: () => void
  alGuardarYSeguir?: () => void
}

// Los botones de un panel de edición, siempre a la vista al pie aunque el formulario sea largo. El
// panel desplaza su contenido con un relleno de 1rem y «pegajoso» se mide contra el borde de
// adentro: `-bottom-4` lo lleva hasta el borde de verdad, para que no se vea contenido por debajo.
export function PieDelPanel({
  idFormulario,
  esAlta = false,
  enCurso,
  alCancelar,
  alGuardarYSeguir,
}: Props) {
  return (
    <div className="sticky -bottom-4 -mx-4 -mb-4 flex flex-wrap justify-end gap-2 border-t border-(--color-line) bg-(--color-surface) p-4">
      <Button variant="ghost" onClick={alCancelar} disabled={enCurso}>
        Cancelar
      </Button>
      {esAlta && alGuardarYSeguir ? (
        <Button variant="outline" onClick={alGuardarYSeguir} disabled={enCurso}>
          Guardar y cargar otro
        </Button>
      ) : null}
      <Button type="submit" form={idFormulario} disabled={enCurso}>
        {enCurso ? 'Guardando…' : 'Guardar'}
      </Button>
    </div>
  )
}
