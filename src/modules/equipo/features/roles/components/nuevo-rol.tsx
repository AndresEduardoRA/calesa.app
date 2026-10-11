'use client'

import { useAction } from 'next-safe-action/hooks'
import { useId, useRef, useState } from 'react'
import {
  enfocarPrimerError,
  errorDeAccion,
  errorDeCampo,
  valoresDe,
} from '@/shared/lib/formularios'
import { Button } from '@/shared/ui/button'
import { Campo } from '@/shared/ui/campo'
import { Modal } from '@/shared/ui/modal'
import { avisarError, avisarExito } from '@/shared/ui/toasts'
import { COLORES_DE_ROL } from '../../../entities/rol'
import { crearRol } from '../actions/crear-rol'
import { SelectorDeColor, type ColorDeRol } from './selector-de-color'

type Props = {
  abierto: boolean
  alCerrar: () => void
  // Con el id del rol recién creado, para dejarlo a la vista.
  alCrear: (rolId: string) => void
}

// Un rol nace con nombre y color, sin permisos: se le dan después en la matriz.
export function NuevoRol({ abierto, alCerrar, alCrear }: Props) {
  const formulario = useRef<HTMLFormElement>(null)
  const idFormulario = useId()
  const [color, setColor] = useState<ColorDeRol>(COLORES_DE_ROL[0].valor)
  const { executeAsync, result, isPending } = useAction(crearRol)

  async function crear(nombre: string) {
    const resultado = await executeAsync({ nombre, color })
    if (resultado.data?.ok) {
      avisarExito(`Rol «${nombre.trim()}» creado`)
      alCrear(resultado.data.data.id)
      return
    }
    const error = errorDeAccion(resultado)
    if (error) {
      avisarError(error)
    }
    enfocarPrimerError(formulario.current)
  }

  return (
    <Modal
      abierto={abierto}
      alCerrar={alCerrar}
      titulo="Nuevo rol"
      descripcion="Nace sin permisos: se los das después, en la matriz."
      pie={
        <>
          <Button variant="outline" onClick={alCerrar} disabled={isPending}>
            Cancelar
          </Button>
          <Button type="submit" form={idFormulario} disabled={isPending}>
            {isPending ? 'Creando…' : 'Crear rol'}
          </Button>
        </>
      }
    >
      <form
        id={idFormulario}
        ref={formulario}
        noValidate
        className="grid gap-4"
        onSubmit={(evento) => {
          evento.preventDefault()
          void crear(valoresDe(evento.currentTarget, ['nombre']).nombre)
        }}
      >
        <Campo
          nombre="nombre"
          etiqueta="Nombre del rol"
          autoComplete="off"
          maxLength={40}
          error={errorDeCampo(result.validationErrors?.fieldErrors, 'nombre')}
        />
        <SelectorDeColor valor={color} alCambiar={setColor} />
      </form>
    </Modal>
  )
}
