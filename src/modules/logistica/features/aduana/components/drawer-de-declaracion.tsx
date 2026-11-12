'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useId, useRef } from 'react'
import { enfocarPrimerError } from '@/shared/lib/formularios'
import { AvisosDelFormulario } from '@/shared/ui/avisos-del-formulario'
import { useCambiosSinGuardar } from '@/shared/ui/cambios-del-panel'
import { Drawer } from '@/shared/ui/drawer'
import { focoDeQuienAbrio } from '@/shared/ui/foco-de-quien-abre'
import { PieDelPanel } from '@/shared/ui/pie-del-panel'
import type { DeclaracionLeida } from '../../../entities/aduana/declaracion'
import { useFormularioDeDeclaracion } from '../hooks/use-formulario-de-declaracion'
import { usePanelDeDeclaracion } from '../hooks/use-panel-de-declaracion'
import { CamposDeDeclaracion } from './campos-de-declaracion'

type Props = {
  // Nulo = «Nueva declaración».
  original: DeclaracionLeida | null
}

function Formulario({ original, alCerrar }: Props & { alCerrar: () => void }) {
  const idFormulario = useId()
  const formulario = useRef<HTMLFormElement>(null)
  const router = useRouter()
  const panel = usePanelDeDeclaracion()
  const f = useFormularioDeDeclaracion({
    original,
    alGuardar: (guardada) => {
      panel.abrirResumen(guardada.id)
    },
  })
  // Con algo escrito, la acción de un aviso que sale de la pantalla pregunta en el pie; descartar tira el borrador.
  useCambiosSinGuardar(f.hayCambios, f.descartarBorrador)
  const hayErrores = Object.keys(f.errores).length > 0
  useEffect(() => {
    if (hayErrores) {
      enfocarPrimerError(formulario.current)
    }
  }, [f.errores, hayErrores])
  return (
    <div className="grid gap-4">
      <form
        id={idFormulario}
        ref={formulario}
        noValidate
        className="grid gap-3"
        onSubmit={(evento) => {
          evento.preventDefault()
          void f.enviar()
        }}
      >
        <AvisosDelFormulario
          enLinea
          esperandoConexion={false}
          enCurso={f.enCurso}
          conflicto={f.conflicto}
          aviso={f.aviso}
          detalleDelConflicto="No se guardó nada. Recargar trae su estado y conserva lo que escribiste."
          alReintentar={() => void f.enviar()}
          alRecargar={() => {
            // La declaración nueva llega como `original`; lo tipeado se queda.
            router.refresh()
          }}
        />
        <CamposDeDeclaracion formulario={f} />
      </form>
      <PieDelPanel
        idFormulario={idFormulario}
        enCurso={f.enCurso}
        alCancelar={alCerrar}
        etiquetaDeGuardar={original ? 'Guardar' : 'Crear declaración'}
      />
    </div>
  )
}

// El formulario de una declaración (`?panel=nueva-declaracion` o `?panel=editar-declaracion&declaracion=<id>`): alta y edición. La página sólo lo dibuja con la URL que lo abre, y
// cancelar vuelve al resumen de la declaración que se editaba (o a la lista, en el alta). El contrato de cierre con algo escrito es de `<Drawer>` y `useCambiosSinGuardar`.
export function DrawerDeDeclaracion({ original }: Props) {
  const panel = usePanelDeDeclaracion()
  function cerrar() {
    if (original) {
      panel.abrirResumen(original.id)
    } else {
      panel.cerrar()
    }
  }
  return (
    <Drawer
      abierto
      alCerrar={cerrar}
      titulo={original ? `Editar la declaración ${original.numero}` : 'Nueva declaración'}
      descripcion="Los vehículos y el canal de aforo se cargan desde el resumen."
      ancho="amplio"
      focoAlCerrar={focoDeQuienAbrio}
    >
      <Formulario original={original} alCerrar={cerrar} />
    </Drawer>
  )
}
