'use client'

import { Campo } from '@/shared/ui/campo'
import { ModalDeFormulario } from '@/shared/ui/modal-de-formulario'
import { useApertura } from '@/shared/ui/use-apertura'
import { useFormularioDeRol } from '../hooks/use-formulario-de-rol'
import { SelectorDeColor } from './selector-de-color'

type Props = {
  abierto: boolean
  alCerrar: () => void
  // Con el id del rol recién creado, para dejarlo a la vista.
  alCrear: (rolId: string) => void
}

const ID_DEL_NOMBRE = 'nombre'

function FormularioDeRol({ abierto, alCerrar, alCrear }: Props) {
  const formulario = useFormularioDeRol({ abierto, alCrear })
  return (
    <ModalDeFormulario
      id="nuevo-rol"
      abierto={abierto}
      alCerrar={alCerrar}
      titulo="Nuevo rol"
      descripcion="Nace sin permisos: se los das después, en la matriz."
      focoInicial={() => document.getElementById(ID_DEL_NOMBRE)}
      formulario={formulario}
      guardar={{ etiqueta: 'Crear rol', enCurso: 'Creando…' }}
    >
      <Campo
        nombre={ID_DEL_NOMBRE}
        etiqueta="Nombre del rol"
        autoComplete="off"
        maxLength={40}
        value={formulario.nombre}
        onChange={(evento) => {
          formulario.escribir(evento.target.value)
        }}
        error={formulario.errores[ID_DEL_NOMBRE]}
      />
      <SelectorDeColor valor={formulario.color} alCambiar={formulario.elegirColor} />
    </ModalDeFormulario>
  )
}

// Un rol nace con nombre y color, sin permisos: se le dan después en la matriz. El contrato del modal (preguntar antes de
// descartar, no cerrarse mientras guarda, sin conexión) es de `ModalDeFormulario`; cada apertura empieza de cero.
export function NuevoRol(props: Props) {
  const apertura = useApertura(props.abierto)
  return <FormularioDeRol key={apertura} {...props} />
}
