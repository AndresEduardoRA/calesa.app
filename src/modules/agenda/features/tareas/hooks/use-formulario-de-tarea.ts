'use client'

import { useAction } from 'next-safe-action/hooks'
import { useMemo, useState } from 'react'
import { enviarAccion } from '@/shared/lib/enviar-accion'
import { avisarExito } from '@/shared/ui/toasts'
import { useBorradorDeEstado } from '@/shared/ui/use-borrador-de-estado'
import { originalDeTarea, type DetalleDeTarea } from '../../../entities/detalle'
import {
  cambiosDeTarea,
  datosDeTareaNueva,
  validarTarea,
  valoresDeTarea,
  type CampoDeTarea,
  type ErroresDeTarea,
  type ValoresDeTarea,
} from '../../../entities/edicion'
import { MENSAJE_DE_VALIDACION, rechazarEnvio } from '../../resultado'
import { crearTarea } from '../actions/crear-tarea'
import { guardarTarea } from '../actions/guardar-tarea'

const CAMPOS: readonly CampoDeTarea[] = ['titulo', 'descripcion', 'vence_en', 'responsable_id']

// Los motivos que la base dejó junto a su campo (el `hint` es la clave del formulario).
function erroresDesde(porCampo: Record<string, string>): ErroresDeTarea {
  return Object.fromEntries(
    CAMPOS.flatMap((campo) => (porCampo[campo] ? [[campo, porCampo[campo]]] : [])),
  )
}

// El campo del error que se borra al cambiar un valor (el vencimiento y el responsable se llaman como en la base).
function campoConError(campo: keyof ValoresDeTarea): CampoDeTarea {
  if (campo === 'venceEn') {
    return 'vence_en'
  }
  return campo === 'responsable' ? 'responsable_id' : (campo as CampoDeTarea)
}

type Opciones = {
  // La tarea que se edita; nula al crear (entonces `inicial` trae los valores de partida).
  tarea: DetalleDeTarea | null
  inicial: ValoresDeTarea
  zona: string
  alCrear: (id: string) => void
  alGuardar: () => void
}

// El formulario de una tarea: crear (con el id del intento) o guardar (sólo lo que cambió y la versión que se vio; el responsable no cambia aquí).
export function useFormularioDeTarea({ tarea, inicial, zona, alCrear, alGuardar }: Opciones) {
  const [intento] = useState(() => crypto.randomUUID())
  const original = useMemo(() => (tarea ? originalDeTarea(tarea) : null), [tarea])
  const guardado = useMemo(
    () => (original ? valoresDeTarea(original, zona) : inicial),
    [original, inicial, zona],
  )
  const [valores, setValores] = useState<ValoresDeTarea>(guardado)
  const [errores, setErrores] = useState<ErroresDeTarea>({})
  const [conflicto, setConflicto] = useState<string | null>(null)
  const crear = useAction(crearTarea)
  const guardar = useAction(guardarTarea)
  const borrador = useBorradorDeEstado({
    clave: tarea ? `tarea-${tarea.id}` : 'tarea-nueva',
    valores,
    guardado,
    alReponer: (cambios) => {
      setValores((antes) => ({ ...antes, ...cambios }))
    },
  })
  const cambios = original ? cambiosDeTarea(original, valores, zona) : null

  async function enviar(ahoraIso: string) {
    const locales = validarTarea(valores, zona, ahoraIso, tarea?.venceEn ?? null)
    if (Object.keys(locales).length > 0) {
      setErrores(locales)
      return
    }
    const envio =
      tarea && cambios
        ? await enviarAccion(
            guardar.executeAsync({
              id: tarea.id,
              actualizadoEnEsperado: tarea.actualizadoEn,
              datos: cambios,
            }),
            MENSAJE_DE_VALIDACION,
          )
        : await enviarAccion(
            crear.executeAsync({ id: intento, datos: datosDeTareaNueva(valores, zona) }),
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
    avisarExito(tarea ? 'Tarea guardada.' : 'Tarea creada.')
    if (tarea) {
      alGuardar()
    } else {
      alCrear(envio.data.id)
    }
  }

  return {
    valores,
    errores,
    conflicto,
    cambiar: <C extends keyof ValoresDeTarea>(campo: C, valor: ValoresDeTarea[C]) => {
      setValores((antes) => ({ ...antes, [campo]: valor }))
      setErrores((e) => ({ ...e, [campoConError(campo)]: undefined }))
    },
    sinCambios: cambios !== null && Object.keys(cambios).length === 0,
    hayCambios: JSON.stringify(valores) !== JSON.stringify(guardado),
    enCurso: crear.isPending || guardar.isPending,
    enviar,
    recargar: () => {
      window.location.reload()
    },
  }
}
