'use client'

import type { RefObject } from 'react'
import { Campo } from '@/shared/ui/campo'
import { ModalDeFormulario } from '@/shared/ui/modal-de-formulario'
import type { TelefonoExtra } from '../../../entities/ficha'
import {
  CLAVE_DE_TELEFONO,
  LARGO_MAXIMO_DE_ETIQUETA,
  type LeadDeTelefonos,
} from '../../../entities/telefonos'
import { CampoTelefono } from '../../telefono/components/campo-telefono'
import { useFormularioDeExtra } from '../hooks/use-formulario-de-extra'
import type { TelefonosExtra } from '../hooks/use-telefonos-extra'

type Props = {
  abierto: boolean
  alCerrar: () => void
  lead: LeadDeTelefonos
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

const GUARDAR = { etiqueta: 'Agregar', enCurso: 'Agregando…' }

// «Agregar teléfono» (`?panel=agregar-telefono` en la ficha, `?extra=nuevo` en el panel y el resumen): el número y su etiqueta
// (opcional). Enter guarda; el contrato del modal (preguntar antes de cerrar con algo escrito, no cerrarse mientras guarda) es
// de `ModalDeFormulario`. El número se normaliza como el del alta, con el código de país del lead, y dice de qué país es; al terminar de
// tipear se verifica contra los demás leads: con «los teléfonos extra cuentan como el principal» encendida un número que ya tiene otro
// lead bloquea y ofrece «Ver ese lead»; apagada, sólo avisa. Mientras guarda, nada se toca y el modal no se cierra. Quien lo monta
// le da una `key` por apertura: cada una empieza vacía, con un id de intento nuevo.
export function ModalDeExtra({ abierto, alCerrar, lead, extras, guardar, boton }: Props) {
  const formulario = useFormularioDeExtra({ lead, extras, guardar, alCerrar, abierto })
  const { enCurso } = formulario

  return (
    <ModalDeFormulario
      id={IDS.formulario}
      abierto={abierto}
      alCerrar={alCerrar}
      titulo="Agregar teléfono"
      descripcion="Un número más para contactar a este lead. No cambia el principal."
      focoInicial={() => document.getElementById(IDS.telefono)}
      focoAlCerrar={() => boton.current ?? true}
      formulario={formulario}
      guardar={GUARDAR}
    >
      <CampoTelefono
        id={IDS.telefono}
        etiqueta="Teléfono extra"
        autoFocus={false}
        valor={formulario.telefono}
        error={formulario.errores[CLAVE_DE_TELEFONO.telefono]}
        telefono={{
          verificando: formulario.verificando,
          verificacion: formulario.verificacion,
          aviso: formulario.avisoDelNumero,
          adoptar: false,
          comoSeGuarda: formulario.comoSeGuarda,
        }}
        textoDeAbrir="Ver ese lead"
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
    </ModalDeFormulario>
  )
}
