'use client'

import { useRef, type ReactNode, type RefObject } from 'react'
import { enfocarPrimerError } from '@/shared/lib/formularios'
import { useAtajo } from './atajos'
import { Aviso } from './aviso'
import { AvisosDelFormulario } from './avisos-del-formulario'
import { Button } from './button'
import { ConfirmarDescarte } from './confirmar-descarte'
import { Modal } from './modal'
import { useCierreConCambios, type CierreConCambios } from './use-cierre-con-cambios'

// Lo que el modal necesita saber del formulario que lleva adentro.
export type FormularioDelModal = {
  enCurso: boolean
  // Si cerrar ahora perdería algo escrito.
  hayCambios: boolean
  // «Cambiaste esto hace 3 min desde otra ventana.»
  conflicto: string | null
  // Un rechazo que no es de ningún campo.
  aviso: string | null
  enLinea: boolean
  // Un guardado que no llegó al servidor y espera a que vuelva la conexión.
  esperandoConexion: boolean
  // `false` si no se guardó: el foco va al primer campo con su motivo.
  enviar: () => Promise<boolean>
  reintentar: () => void
  // «Recargar» tras un conflicto: trae la versión de ahora y conserva lo escrito. Sin versión, nada.
  recargar?: () => void
  recargando?: boolean
  // Lo que se tira al «Descartar» (el borrador).
  descartarBorrador?: () => void
}

type Props = {
  // El id del `<form>` (el botón del pie lo envía desde afuera).
  id: string
  abierto: boolean
  alCerrar: () => void
  titulo: string
  descripcion?: string
  ancho?: 'normal' | 'amplio'
  focoInicial?: () => HTMLElement | null
  focoAlCerrar?: () => HTMLElement | boolean
  formulario: FormularioDelModal
  // Con el modal abierto, lo que se edita dejó de estar (otra pestaña lo eliminó, el lead dejó de
  // verse): por qué ya no se guarda. Lo escrito queda a la vista.
  noDisponible?: string | null
  // Qué pasa al recargar tras un conflicto.
  detalleDelConflicto?: string
  // El texto del botón principal y el de mientras guarda.
  guardar?: { etiqueta: string; enCurso: string }
  children: ReactNode
}

const GUARDAR = { etiqueta: 'Guardar', enCurso: 'Guardando…' }

function Pie({
  id,
  cierre,
  enCurso,
  sinGuardar,
  guardar,
}: {
  id: string
  cierre: CierreConCambios
  enCurso: boolean
  sinGuardar: boolean
  guardar: { etiqueta: string; enCurso: string }
}) {
  if (cierre.confirmando) {
    return <ConfirmarDescarte alSeguir={cierre.seguir} alDescartar={cierre.descartar} />
  }
  return (
    <>
      <Button variant="ghost" onClick={cierre.intentarCerrar} disabled={enCurso}>
        Cancelar
      </Button>
      <Button type="submit" form={id} disabled={sinGuardar}>
        {enCurso ? guardar.enCurso : guardar.etiqueta}
      </Button>
    </>
  )
}

function Avisos({
  formulario,
  noDisponible,
  detalleDelConflicto,
}: {
  formulario: FormularioDelModal
  noDisponible: string | null
  detalleDelConflicto: string | undefined
}) {
  if (noDisponible) {
    return <Aviso tono="peligro">{noDisponible} Lo que escribiste no se guardó.</Aviso>
  }
  return (
    <AvisosDelFormulario
      enLinea={formulario.enLinea}
      esperandoConexion={formulario.esperandoConexion}
      enCurso={formulario.enCurso || formulario.recargando === true}
      conflicto={formulario.conflicto}
      aviso={formulario.aviso}
      detalleDelConflicto={detalleDelConflicto}
      alReintentar={formulario.reintentar}
      alRecargar={formulario.recargar ?? (() => undefined)}
    />
  )
}

// Guardar se apaga mientras guarda, mientras recarga, tras un conflicto (hasta que llegue la versión
// nueva) y si lo que se edita ya no está.
const sinPoderGuardar = (formulario: FormularioDelModal, noDisponible: string | null) =>
  formulario.enCurso ||
  formulario.recargando === true ||
  noDisponible !== null ||
  formulario.conflicto !== null

// Lo que no deja guardar vale también para Enter dentro de un campo, no sólo para el botón. Y una vez
// guardado no se vuelve a enviar: un segundo Enter antes de que el modal termine de cerrarse llamaría
// otra vez a quien lo usa (dos avisos, dos veces la fila en la lista). Tras un intento que no guardó,
// el foco va al primer motivo (no en cada tecla: con dos campos con motivo, escribir en uno no lleva
// al otro).
function useEnvio(
  formulario: FormularioDelModal,
  noDisponible: string | null,
  elemento: RefObject<HTMLFormElement | null>,
) {
  const guardado = useRef(false)
  const sinEnviar =
    noDisponible !== null || formulario.conflicto !== null || formulario.recargando === true
  return async () => {
    if (guardado.current || sinEnviar) {
      return
    }
    if (await formulario.enviar()) {
      guardado.current = true
    } else {
      enfocarPrimerError(elemento.current)
    }
  }
}

// Un formulario en un modal, con el contrato de los que se abren por la URL (docs/DECISIONES.md,
// 2026-10-18): los avisos arriba (sin conexión, conflicto con «Recargar», un rechazo), los campos en un
// `<fieldset>` que se apaga mientras guarda, el modal que no se cierra mientras guarda, cerrar con algo
// escrito que pregunta en el mismo pie, el foco al primer error y `Ctrl/Cmd+S` o `Ctrl/Cmd+Enter` que
// guardan sólo abierto, sin guardar en curso, sin estar preguntando y con algo que se pueda guardar.
export function ModalDeFormulario({
  id,
  abierto,
  alCerrar,
  titulo,
  descripcion,
  ancho,
  focoInicial,
  focoAlCerrar,
  formulario,
  noDisponible = null,
  detalleDelConflicto,
  guardar = GUARDAR,
  children,
}: Props) {
  const elemento = useRef<HTMLFormElement>(null)
  const cierre = useCierreConCambios({
    hayCambios: formulario.hayCambios,
    alCerrar,
    alDescartar: formulario.descartarBorrador,
    abierto,
  })
  const { enCurso } = formulario
  const enviar = useEnvio(formulario, noDisponible, elemento)
  const conAtajos = abierto && !enCurso && !cierre.confirmando && noDisponible === null
  useAtajo('guardar', () => void enviar(), conAtajos)
  useAtajo('guardarYSeguir', () => void enviar(), conAtajos)

  return (
    <Modal
      abierto={abierto}
      alCerrar={cierre.intentarCerrar}
      titulo={titulo}
      descripcion={descripcion}
      ancho={ancho}
      bloqueado={enCurso}
      focoInicial={focoInicial}
      focoAlCerrar={focoAlCerrar}
      pie={
        <Pie
          id={id}
          cierre={cierre}
          enCurso={enCurso}
          sinGuardar={sinPoderGuardar(formulario, noDisponible)}
          guardar={guardar}
        />
      }
    >
      <Avisos
        formulario={formulario}
        noDisponible={noDisponible}
        detalleDelConflicto={detalleDelConflicto}
      />
      <form
        ref={elemento}
        id={id}
        noValidate
        aria-label={titulo}
        onSubmit={(evento) => {
          evento.preventDefault()
          void enviar()
        }}
      >
        <fieldset disabled={enCurso} className="grid min-w-0 gap-3">
          {children}
        </fieldset>
      </form>
    </Modal>
  )
}
