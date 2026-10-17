'use client'

import { Button } from './button'
import { ConfirmarDescarte } from './confirmar-descarte'

// Una salida pendiente (la acción de un aviso, «Abrir ficha»): con algo escrito se pregunta en el mismo pie, como en un modal.
// Es lo que devuelve `useCierreConCambios()`.
export type SalidaPendiente = { confirmando: boolean; seguir: () => void; descartar: () => void }

type Props = {
  // El `id` del <form> que envía el botón «Guardar».
  idFormulario: string
  // Un alta ofrece «Guardar y cargar otro».
  esAlta?: boolean
  enCurso: boolean
  alCancelar: () => void
  alGuardarYSeguir?: () => void
  // Un panel de una sola acción la nombra («Cambiar teléfono»). Con `sinPuedeEnviar` el botón no
  // envía (hay algo que corregir antes), sin esconderlo.
  etiquetaDeGuardar?: string
  etiquetaEnCurso?: string
  sinPuedeEnviar?: boolean
  salida?: SalidaPendiente
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
  etiquetaDeGuardar = 'Guardar',
  etiquetaEnCurso = 'Guardando…',
  sinPuedeEnviar = false,
  salida,
}: Props) {
  return (
    <div className="sticky -bottom-4 -mx-4 -mb-4 flex flex-wrap justify-end gap-2 border-t border-(--color-line) bg-(--color-surface) p-4">
      {salida?.confirmando ? (
        <ConfirmarDescarte alSeguir={salida.seguir} alDescartar={salida.descartar} />
      ) : (
        <>
          <Button variant="ghost" onClick={alCancelar} disabled={enCurso}>
            Cancelar
          </Button>
          {esAlta && alGuardarYSeguir ? (
            <Button variant="outline" onClick={alGuardarYSeguir} disabled={enCurso}>
              Guardar y cargar otro
            </Button>
          ) : null}
          <Button type="submit" form={idFormulario} disabled={enCurso || sinPuedeEnviar}>
            {enCurso ? etiquetaEnCurso : etiquetaDeGuardar}
          </Button>
        </>
      )}
    </div>
  )
}
