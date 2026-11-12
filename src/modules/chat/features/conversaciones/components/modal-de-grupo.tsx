'use client'

import { useCallback } from 'react'
import { Campo } from '@/shared/ui/campo'
import { ModalDeFormulario } from '@/shared/ui/modal-de-formulario'
import { useApertura } from '@/shared/ui/use-apertura'
import { leerPersonas } from '../../../composicion.client'
import { MAXIMO_DE_PERSONAS_ELEGIDAS, NOMBRE_MAXIMO_DEL_GRUPO } from '../../../entities/grupos'
import { useFormularioDeGrupo } from '../hooks/use-formulario-de-grupo'
import { BuscadorDePersonas } from './buscador-de-personas'
import { PersonasElegidas } from './personas-elegidas'

type Props = {
  abierto: boolean
  alCerrar: () => void
  usuarioId: string
  alCrear: (conversacion: string) => void
}

const ID_DEL_NOMBRE = 'nombre'

function FormularioDeGrupo({ abierto, alCerrar, usuarioId, alCrear }: Props) {
  const formulario = useFormularioDeGrupo({ abierto, alCrear })
  const leer = useCallback((texto: string) => leerPersonas(texto, usuarioId), [usuarioId])
  const llena = formulario.elegidas.length >= MAXIMO_DE_PERSONAS_ELEGIDAS
  const motivo = formulario.errores['miembros']
  return (
    <ModalDeFormulario
      id="nuevo-grupo"
      abierto={abierto}
      alCerrar={alCerrar}
      titulo="Nuevo grupo"
      descripcion="Ponle un nombre y suma a quienes conversan en él."
      focoInicial={() => document.getElementById(ID_DEL_NOMBRE)}
      formulario={formulario}
      guardar={{ etiqueta: 'Crear grupo', enCurso: 'Creando…' }}
    >
      <Campo
        nombre={ID_DEL_NOMBRE}
        etiqueta="Nombre del grupo"
        autoComplete="off"
        maxLength={NOMBRE_MAXIMO_DEL_GRUPO}
        value={formulario.nombre}
        onChange={(evento) => {
          formulario.escribir(evento.target.value)
        }}
        error={formulario.errores[ID_DEL_NOMBRE]}
      />
      <PersonasElegidas elegidas={formulario.elegidas} alQuitar={formulario.quitar} />
      {llena ? (
        <p className="text-(length:--text-sm) text-(--color-ink-soft)">
          Llegaste al máximo de {MAXIMO_DE_PERSONAS_ELEGIDAS} personas.
        </p>
      ) : (
        <BuscadorDePersonas
          etiqueta="Personas del grupo"
          leer={leer}
          excluir={formulario.elegidas.map((persona) => persona.id)}
          alElegir={formulario.sumar}
        />
      )}
      {motivo ? (
        <p role="alert" className="text-(length:--text-sm) text-(--color-peligro-ink)">
          {motivo}
        </p>
      ) : null}
    </ModalDeFormulario>
  )
}

// «Nuevo grupo»: nombre y personas. El contrato del modal (preguntar antes de descartar, no cerrarse mientras guarda, sin conexión) es de
// `ModalDeFormulario`; cada apertura empieza de cero.
export function ModalDeGrupo(props: Props) {
  const apertura = useApertura(props.abierto)
  return <FormularioDeGrupo key={apertura} {...props} />
}
