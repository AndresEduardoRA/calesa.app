'use client'

import { useAction } from 'next-safe-action/hooks'
import { useState } from 'react'
import { motivosPorCampo } from '@/shared/lib/campos/esquema-de-valor'
import { enviarAccion } from '@/shared/lib/enviar-accion'
import { avisarExito } from '@/shared/ui/toasts'
import { useEnvioDeModal } from '@/shared/ui/use-envio-de-modal'
import { COLORES_DE_ROL } from '../../../entities/rol'
import { crearRol } from '../actions/crear-rol'
import type { ColorDeRol } from '../components/selector-de-color'
import { esquemaCrearRol } from '../schemas/roles'

const MENSAJE_DE_VALIDACION = 'Revisa los campos marcados.'
const COLOR_INICIAL: ColorDeRol = COLORES_DE_ROL[0].valor

type Args = {
  abierto: boolean
  // Con el id del rol recién creado, para dejarlo a la vista.
  alCrear: (rolId: string) => void
}

// El estado del modal «Nuevo rol»: nombre y color, validados con el mismo esquema que la action. Un nombre repetido o sin
// letras que rechaza el servidor se dice junto al campo; lo demás (sin permiso…) arriba del formulario.
export function useFormularioDeRol({ abierto, alCrear }: Args) {
  const [nombre, setNombre] = useState('')
  const [color, setColor] = useState<ColorDeRol>(COLOR_INICIAL)
  const crear = useAction(crearRol)

  const envio = useEnvioDeModal<{ id: string }>({
    abierto,
    hayCambios: nombre.trim() !== '' || color !== COLOR_INICIAL,
    validar: () => {
      const revisado = esquemaCrearRol.safeParse({ nombre, color })
      return revisado.success ? null : motivosPorCampo(revisado.error.issues)
    },
    pedir: () => enviarAccion(crear.executeAsync({ nombre, color }), MENSAJE_DE_VALIDACION),
    alGuardar: (rol) => {
      avisarExito(`Rol «${nombre.trim()}» creado`)
      alCrear(rol.id)
    },
    campoDelRechazo: (error) =>
      error.codigo === 'duplicado' || error.codigo === 'validacion' ? 'nombre' : null,
  })

  return {
    ...envio,
    nombre,
    color,
    escribir: (valor: string) => {
      setNombre(valor)
      envio.quitarMotivo('nombre')
    },
    elegirColor: setColor,
  }
}
