'use client'

import type { RefObject } from 'react'
import { Button } from '@/shared/ui/button'
import { Campo } from '@/shared/ui/campo'
import { ConfirmarDescarte } from '@/shared/ui/confirmar-descarte'
import { AvisosDelFormulario } from '@/shared/ui/avisos-del-formulario'
import { Modal } from '@/shared/ui/modal'
import { useCierreConCambios } from '@/shared/ui/use-cierre-con-cambios'
import type { LeadDeFicha, TelefonoExtra } from '../../../entities/ficha'
import { CLAVE_DE_TELEFONO, LARGO_MAXIMO_DE_ETIQUETA } from '../../../entities/telefonos'
import { CampoTelefono } from '../../telefono/components/campo-telefono'
import { useFormularioDeExtra } from '../hooks/use-formulario-de-extra'
import type { TelefonosExtra } from '../hooks/use-telefonos-extra'

type Props = {
  abierto: boolean
  alCerrar: () => void
  ficha: LeadDeFicha
  extras: readonly TelefonoExtra[]
  guardar: TelefonosExtra['guardar']
  // «Agregar teléfono»: el foco vuelve ahí al cerrar, también si el modal se abrió al recargar.
  boton: RefObject<HTMLButtonElement | null>
}

const IDS = {
  formulario: 'lead-extra-nuevo',
  telefono: 'lead-extra-nuevo-telefono',
  etiqueta: 'lead-extra-nuevo-etiqueta',
} as const

// «Agregar teléfono» (`?panel=agregar-telefono`): el número y su etiqueta (opcional). Enter guarda;
// Esc o «Cancelar» cierran y, con algo escrito, preguntan antes en el pie. El número se normaliza
// como el del alta, con el código de país del lead, y dice de qué país es; no se verifica contra otros
// leads (un extra no es único). Mientras guarda, nada se toca y el modal no se cierra. Quien lo monta
// le da una `key` por apertura: cada una empieza vacía, con un id de intento nuevo.
export function ModalDeExtra({ abierto, alCerrar, ficha, extras, guardar, boton }: Props) {
  const formulario = useFormularioDeExtra({ ficha, extras, guardar, alCerrar })
  const cierre = useCierreConCambios({ hayCambios: formulario.hayCambios, alCerrar })
  const { enCurso } = formulario

  return (
    <Modal
      abierto={abierto}
      alCerrar={cierre.intentarCerrar}
      titulo="Agregar teléfono"
      descripcion="Un número más para contactar a este lead. No cambia el principal."
      bloqueado={enCurso}
      focoInicial={() => document.getElementById(IDS.telefono)}
      focoAlCerrar={() => boton.current ?? true}
      pie={
        cierre.confirmando ? (
          <ConfirmarDescarte alSeguir={cierre.seguir} alDescartar={cierre.descartar} />
        ) : (
          <>
            <Button variant="ghost" onClick={cierre.intentarCerrar} disabled={enCurso}>
              Cancelar
            </Button>
            <Button type="submit" form={IDS.formulario} disabled={enCurso}>
              {enCurso ? 'Agregando…' : 'Agregar'}
            </Button>
          </>
        )
      }
    >
      <AvisosDelFormulario
        enLinea={formulario.enLinea}
        esperandoConexion={formulario.esperandoConexion}
        enCurso={enCurso}
        conflicto={null}
        aviso={formulario.aviso}
        alReintentar={formulario.reintentar}
        alRecargar={() => undefined}
      />
      <form
        id={IDS.formulario}
        noValidate
        onSubmit={(evento) => {
          evento.preventDefault()
          void formulario.enviar()
        }}
      >
        <fieldset disabled={enCurso} className="grid gap-3">
          <CampoTelefono
            id={IDS.telefono}
            etiqueta="Teléfono extra"
            autoFocus={false}
            valor={formulario.telefono}
            error={formulario.errores[CLAVE_DE_TELEFONO.telefono]}
            telefono={{
              verificando: false,
              verificacion: null,
              aviso: null,
              adoptar: false,
              comoSeGuarda: formulario.comoSeGuarda,
            }}
            deshabilitado={enCurso}
            alCambiar={formulario.escribirTelefono}
          />
          <Campo
            nombre={IDS.etiqueta}
            etiqueta="Etiqueta (opcional)"
            autoComplete="off"
            maxLength={LARGO_MAXIMO_DE_ETIQUETA + 20}
            value={formulario.etiqueta}
            onChange={(evento) => {
              formulario.escribirEtiqueta(evento.target.value)
            }}
            error={formulario.errores[CLAVE_DE_TELEFONO.etiqueta]}
          />
        </fieldset>
      </form>
    </Modal>
  )
}
