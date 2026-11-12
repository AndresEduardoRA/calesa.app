'use client'

import { useAction } from 'next-safe-action/hooks'
import { useMemo, useState } from 'react'
import { enviarAccion } from '@/shared/lib/enviar-accion'
import { avisarExito } from '@/shared/ui/toasts'
import { useBorradorDeEstado } from '@/shared/ui/use-borrador-de-estado'
import type { DetalleDeEvento } from '../../../entities/detalle'
import {
  cambiosDeEvento,
  datosDeEventoNuevo,
  destinatariosDeEvento,
  validarEvento,
  valoresDeEvento,
  type CampoDeEvento,
  type ErroresDeEvento,
  type ValoresDeEvento,
} from '../../../entities/edicion'
import { MENSAJE_DE_VALIDACION, rechazarEnvio } from '../../resultado'
import { crearEvento } from '../actions/crear-evento'
import { guardarEvento } from '../actions/guardar-evento'

const CAMPOS: readonly CampoDeEvento[] = [
  'titulo',
  'descripcion',
  'lugar',
  'inicia_en',
  'termina_en',
  'visibilidad',
  'destinatarios',
]

// Los motivos que la base dejó junto a su campo (el `hint` es la clave del formulario).
function erroresDesde(porCampo: Record<string, string>): ErroresDeEvento {
  return Object.fromEntries(
    CAMPOS.flatMap((campo) => (porCampo[campo] ? [[campo, porCampo[campo]]] : [])),
  )
}

// El campo del error que se borra al cambiar un valor (las fechas se llaman como en la base).
function campoConError(campo: keyof ValoresDeEvento): CampoDeEvento {
  if (campo === 'iniciaEn') {
    return 'inicia_en'
  }
  return campo === 'terminaEn' ? 'termina_en' : (campo as CampoDeEvento)
}

type Opciones = {
  // El evento que se edita; nulo al crear (entonces `inicial` trae los valores de partida).
  evento: DetalleDeEvento | null
  inicial: ValoresDeEvento
  zona: string
  // Al crear, con el id nuevo; al guardar, sin nada.
  alCrear: (id: string) => void
  alGuardar: () => void
}

// El formulario de un evento: crear (con el id del intento, que vive mientras el panel está abierto: un reintento no crea dos) o guardar (sólo lo que
// cambió y la versión que se vio). Lo tipeado no se pierde: un rechazo deja los valores y dice el motivo junto a su campo; un conflicto ofrece «Recargar».
export function useFormularioDeEvento({ evento, inicial, zona, alCrear, alGuardar }: Opciones) {
  const [intento] = useState(() => crypto.randomUUID())
  const guardado = useMemo(
    () => (evento ? valoresDeEvento(evento, zona) : inicial),
    [evento, inicial, zona],
  )
  const [valores, setValores] = useState<ValoresDeEvento>(guardado)
  const [errores, setErrores] = useState<ErroresDeEvento>({})
  const [conflicto, setConflicto] = useState<string | null>(null)
  const crear = useAction(crearEvento)
  const guardar = useAction(guardarEvento)
  const borrador = useBorradorDeEstado({
    clave: evento ? `evento-${evento.id}` : 'evento-nuevo',
    valores,
    guardado,
    alReponer: (cambios) => {
      setValores((antes) => ({ ...antes, ...cambios }))
    },
  })
  const cambios = evento ? cambiosDeEvento(evento, valores, zona) : null

  async function enviar() {
    const locales = validarEvento(valores, zona)
    if (Object.keys(locales).length > 0) {
      setErrores(locales)
      return
    }
    const envio = cambios
      ? await enviarAccion(
          guardar.executeAsync({
            id: evento?.id ?? '',
            actualizadoEnEsperado: evento?.actualizadoEn ?? '',
            datos: cambios.datos,
            destinatarios: cambios.destinatarios,
          }),
          MENSAJE_DE_VALIDACION,
        )
      : await enviarAccion(
          crear.executeAsync({
            id: intento,
            datos: datosDeEventoNuevo(valores, zona),
            destinatarios: destinatariosDeEvento(valores),
          }),
          MENSAJE_DE_VALIDACION,
        )
    if (!envio.ok) {
      rechazarEnvio(
        envio.error,
        'porCampo' in envio ? envio.porCampo : undefined,
        setConflicto,
        (porCampo) => {
          setErrores(erroresDesde(porCampo))
        },
      )
      return
    }
    borrador.limpiar()
    avisarExito(evento ? 'Evento guardado.' : 'Evento creado.')
    if (evento) {
      alGuardar()
    } else {
      alCrear(envio.data.id)
    }
  }

  return {
    valores,
    errores,
    conflicto,
    cambiar: <C extends keyof ValoresDeEvento>(campo: C, valor: ValoresDeEvento[C]) => {
      setValores((antes) => ({ ...antes, [campo]: valor }))
      setErrores((e) => ({ ...e, [campoConError(campo)]: undefined }))
    },
    // Al editar sin nada distinto no hay qué mandar.
    sinCambios: cambios !== null && !cambios.hayCambios,
    hayCambios: JSON.stringify(valores) !== JSON.stringify(guardado),
    enCurso: crear.isPending || guardar.isPending,
    enviar,
    recargar: () => {
      window.location.reload()
    },
  }
}
