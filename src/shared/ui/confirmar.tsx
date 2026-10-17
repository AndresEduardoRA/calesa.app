'use client'

import { useId, useRef, useState, type ComponentProps, type ReactNode } from 'react'
import { Aviso } from './aviso'
import { Button } from './button'
import { Input } from './input'
import { Label } from './label'
import { Modal } from './modal'
import { useEnLinea } from './use-en-linea'

type Props = {
  abierto: boolean
  alCerrar: () => void
  // Lo que hace confirmar. Si devuelve una promesa, el botón no vuelve a responder hasta que termina: un doble
  // clic o un Enter repetido llegan antes de que `enCurso` cambie.
  alConfirmar: () => Promise<unknown> | void
  // «Eliminar el rol Logística»: la acción y el nombre del objeto, nunca «¿Estás seguro?».
  titulo: string
  // Qué se pierde y que no se puede deshacer.
  descripcion: string
  etiquetaConfirmar: string
  enCurso?: boolean
  // Para lo masivo e irreversible: hay que tipear esta palabra para habilitar el botón.
  palabraClave?: string
  // No se puede confirmar ahora (sin conexión): el diálogo sigue abierto y lo dice en `children`.
  deshabilitado?: boolean
  // A dónde vuelve el foco al cerrar (el botón que lo abrió, si la URL abre el diálogo y el botón se redibujó).
  focoAlCerrar?: ComponentProps<typeof Modal>['focoAlCerrar']
  // Lo que pasó con el intento (sin conexión, otra persona lo cambió): un `<Aviso>` dentro del
  // diálogo, que no se cierra hasta que la persona decide.
  children?: ReactNode
}

// Confirmación de lo irreversible. Lo reversible no pasa por acá: se hace y se ofrece «Deshacer»
// (`avisarConDeshacer`). Nunca `window.confirm`. Tiene su URL (`?panel=`, `usePanelPorUrl()`): quien lo usa
// calcula `abierto` de ella (`scripts/guardas/confirmar-con-url.test.ts` lo exige).
//
// Mientras actúa no se cierra con Esc, la ✕ ni el clic afuera (el pedido en vuelo podría volver con el
// diálogo cerrado); sin conexión lo dice adentro y no deja confirmar.
export function Confirmar({
  abierto,
  alCerrar,
  alConfirmar,
  titulo,
  descripcion,
  etiquetaConfirmar,
  enCurso = false,
  palabraClave,
  deshabilitado = false,
  focoAlCerrar,
  children,
}: Props) {
  const idCampo = useId()
  const enLinea = useEnLinea()
  const [tipeado, setTipeado] = useState('')
  const enVuelo = useRef(false)
  const falta = palabraClave !== undefined && tipeado.trim() !== palabraClave

  function confirmar() {
    if (enVuelo.current || !enLinea) {
      return
    }
    enVuelo.current = true
    void Promise.resolve(alConfirmar()).finally(() => {
      enVuelo.current = false
    })
  }

  function cerrar() {
    setTipeado('')
    alCerrar()
  }

  return (
    <Modal
      abierto={abierto}
      alCerrar={cerrar}
      titulo={titulo}
      descripcion={descripcion}
      bloqueado={enCurso}
      focoAlCerrar={focoAlCerrar}
      pie={
        <>
          <Button variant="outline" onClick={cerrar} disabled={enCurso}>
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={confirmar}
            disabled={enCurso || falta || deshabilitado || !enLinea}
          >
            {etiquetaConfirmar}
          </Button>
        </>
      }
    >
      {enLinea ? null : (
        <Aviso tono="aviso">
          No hay conexión. No se hizo nada: vuelve a intentar cuando vuelva.
        </Aviso>
      )}
      {children}
      {palabraClave !== undefined ? (
        <div className="grid gap-2">
          <Label htmlFor={idCampo}>Para confirmar, escribir «{palabraClave}»</Label>
          <Input
            id={idCampo}
            value={tipeado}
            autoComplete="off"
            onChange={(evento) => {
              setTipeado(evento.target.value)
            }}
          />
        </div>
      ) : null}
    </Modal>
  )
}
