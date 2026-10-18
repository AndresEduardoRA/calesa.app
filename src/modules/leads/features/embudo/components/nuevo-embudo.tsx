'use client'

import { Campo } from '@/shared/ui/campo'
import { ModalDeFormulario } from '@/shared/ui/modal-de-formulario'
import { LARGO_MAXIMO_DE_EMBUDO, MAXIMO_DE_EMBUDOS, type Embudo } from '../../../entities/embudo'
import { CLAVE_DEL_NOMBRE_DE_EMBUDO, useNuevoEmbudo } from '../hooks/use-nuevo-embudo'

type Props = {
  embudos: readonly Embudo[]
  alCerrar: () => void
  alCrear: (id: string) => void
}

// «Nuevo embudo» (`?panel=nuevo-embudo`): el nombre y listo. Nace con tres etapas (Nueva, Ganada y Perdida) que se editan
// después en «Etapas». El contrato del modal (preguntar antes de descartar, no cerrarse mientras guarda, sin conexión,
// Ctrl/Cmd+S) es de `ModalDeFormulario`. Quien lo monta lo dibuja sólo mientras la URL lo pide: cada apertura empieza de cero.
export function NuevoEmbudo({ embudos, alCerrar, alCrear }: Props) {
  const formulario = useNuevoEmbudo({ embudos, alCrear })
  return (
    <ModalDeFormulario
      id="nuevo-embudo"
      abierto
      alCerrar={alCerrar}
      titulo="Nuevo embudo"
      descripcion={
        formulario.lleno
          ? `Puedes tener hasta ${String(MAXIMO_DE_EMBUDOS)} embudos. Elimina uno para crear otro.`
          : 'Nace con tres etapas: Nueva, Ganada y Perdida. Las cambias después en «Etapas».'
      }
      focoInicial={() => document.getElementById(CLAVE_DEL_NOMBRE_DE_EMBUDO)}
      formulario={formulario}
      guardar={{ etiqueta: 'Crear embudo', enCurso: 'Creando…' }}
    >
      <Campo
        nombre={CLAVE_DEL_NOMBRE_DE_EMBUDO}
        etiqueta="Nombre"
        autoComplete="off"
        maxLength={LARGO_MAXIMO_DE_EMBUDO + 10}
        value={formulario.nombre}
        onChange={(evento) => {
          formulario.escribir(evento.target.value)
        }}
        error={formulario.errores[CLAVE_DEL_NOMBRE_DE_EMBUDO]}
      />
    </ModalDeFormulario>
  )
}
