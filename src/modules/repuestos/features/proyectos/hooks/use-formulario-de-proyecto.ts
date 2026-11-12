'use client'

import { useState } from 'react'
import { useBorradorDeEstado } from '@/shared/ui/use-borrador-de-estado'
import {
  BORRADOR_NUEVO_DE_PROYECTO,
  validarProyecto,
  type BorradorDeProyecto,
} from '../../../entities/proyectos/borrador'
import { useEnvioDeProyecto } from './use-envio-de-proyecto'

// Lo que el formulario guarda además del borrador: cómo se llama lo elegido en cada buscador (sólo el id va a la base).
export type EstadoDelFormulario = BorradorDeProyecto & {
  vehiculoTitulo: string
  leadTitulo: string
}

export type ElegidoInicial = { id: string; titulo: string }

type Args = {
  // El vehículo con que abre el formulario (`?vehiculo=`), ya resuelto por el servidor y visible para quien mira.
  vehiculoInicial: ElegidoInicial | null
  alCerrar: () => void
  abierto: boolean
}

const VACIO: EstadoDelFormulario = {
  ...BORRADOR_NUEVO_DE_PROYECTO,
  vehiculoTitulo: '',
  leadTitulo: '',
}

// El estado del formulario «Nuevo proyecto»: el borrador (en `sessionStorage`: son más de 6 campos) y el motivo junto a cada campo; el envío es de `useEnvioDeProyecto`. Cada apertura
// trae un id de intento nuevo (`crypto.randomUUID()`) y los campos vacíos, o el vehículo con que se abrió.
export function useFormularioDeProyecto({ vehiculoInicial, alCerrar, abierto }: Args) {
  const [intento] = useState(() => crypto.randomUUID())
  const [inicial] = useState<EstadoDelFormulario>(() =>
    vehiculoInicial
      ? {
          ...VACIO,
          origen: 'vehiculo',
          vehiculoId: vehiculoInicial.id,
          vehiculoTitulo: vehiculoInicial.titulo,
        }
      : VACIO,
  )
  const [valores, setValores] = useState<EstadoDelFormulario>(inicial)
  const [errores, setErrores] = useState<Record<string, string>>({})

  function escribir(cambios: Partial<EstadoDelFormulario>) {
    setValores((antes) => ({ ...antes, ...cambios }))
    setErrores((antes) => {
      const resto = { ...antes }
      for (const clave of Object.keys(cambios)) {
        delete resto[clave]
      }
      return resto
    })
  }

  const borrador = useBorradorDeEstado({
    activo: abierto,
    clave: 'proyecto-nuevo',
    valores,
    guardado: inicial,
    alReponer: (cambios) => {
      setValores((antes) => ({ ...antes, ...cambios }))
    },
  })
  const envio = useEnvioDeProyecto({
    intento,
    abierto,
    alCerrar,
    alGuardar: borrador.limpiar,
    alRechazarCampos: setErrores,
  })

  async function enviar(): Promise<boolean> {
    if (envio.enCurso) {
      return false
    }
    const validado = validarProyecto(valores)
    if (!validado.ok) {
      setErrores(validado.errores)
      return false
    }
    return envio.mandar(validado.datos)
  }

  return {
    valores,
    errores,
    aviso: envio.aviso,
    enCurso: envio.enCurso,
    enLinea: envio.enLinea,
    esperandoConexion: envio.esperandoConexion,
    // Cerrar ahora perdería lo escrito: el drawer pregunta antes de salir por un aviso.
    hayCambios: JSON.stringify(valores) !== JSON.stringify(inicial),
    escribir,
    enviar,
    descartarBorrador: borrador.limpiar,
  }
}
