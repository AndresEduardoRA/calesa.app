'use client'

import { useAction } from 'next-safe-action/hooks'
import { useState } from 'react'
import {
  datosDeTareaNueva,
  validarTarea,
  type ErroresDeTarea,
  type PersonaElegida,
  type ValoresDeTarea,
} from '@/modules/agenda/client'
import { enviarAccion } from '@/shared/lib/enviar-accion'
import { avisarExito } from '@/shared/ui/toasts'
import { MENSAJE_DE_VALIDACION } from '../../resultado'
import { crearTareaDelChat } from '../actions/crear-tarea-del-chat'

type Opciones = {
  conversacion: string
  zona: string
  // Lo escrito tras `/tarea`: el título de partida.
  titulo: string
  // En una directa, la otra persona viene elegida (y se puede cambiar).
  responsableDePartida: PersonaElegida | null
  // Sin `agenda.tareas.asignar` la tarea es de quien la crea: no se manda `responsable_id`.
  puedeAsignar: boolean
  alCrear: () => void
}

const CAMPOS = ['titulo', 'descripcion', 'vence_en', 'responsable_id'] as const

// El formulario corto de `/tarea`: título, vencimiento opcional y responsable. El `id` del intento nace al abrirse y se conserva en cada reintento
// (la base responde `repetido`). Valida con las reglas de agenda; los motivos de la base caen en su campo por el `hint`.
export function useFormularioDeTarea({
  conversacion,
  zona,
  titulo,
  responsableDePartida,
  puedeAsignar,
  alCrear,
}: Opciones) {
  const [intento] = useState(() => crypto.randomUUID())
  const inicial: ValoresDeTarea = {
    titulo,
    descripcion: '',
    venceEn: '',
    responsable: puedeAsignar ? responsableDePartida : null,
  }
  const [valores, setValores] = useState<ValoresDeTarea>(inicial)
  const [errores, setErrores] = useState<ErroresDeTarea>({})
  const [aviso, setAviso] = useState<string | null>(null)
  const accion = useAction(crearTareaDelChat)

  async function enviar(ahoraIso: string) {
    const locales = validarTarea(valores, zona, ahoraIso)
    if (Object.keys(locales).length > 0) {
      setErrores(locales)
      return
    }
    setAviso(null)
    const { vence_en: venceEn, responsable_id: responsableId } = datosDeTareaNueva(valores, zona)
    const envio = await enviarAccion(
      accion.executeAsync({
        id: intento,
        conversacion,
        datos: {
          titulo: valores.titulo.trim(),
          ...(venceEn ? { vence_en: venceEn } : {}),
          ...(responsableId ? { responsable_id: responsableId } : {}),
        },
      }),
      MENSAJE_DE_VALIDACION,
    )
    if (!envio.ok) {
      const porCampo = 'porCampo' in envio ? (envio.porCampo ?? {}) : {}
      const deCampo = Object.fromEntries(
        CAMPOS.flatMap((c) => (porCampo[c] ? [[c, porCampo[c]]] : [])),
      ) as ErroresDeTarea
      setErrores(deCampo)
      setAviso(Object.keys(deCampo).length > 0 ? null : envio.error.mensaje)
      return
    }
    avisarExito('Tarea creada.')
    alCrear()
  }

  return {
    valores,
    errores,
    aviso,
    puedeAsignar,
    enCurso: accion.isPending,
    hayCambios: JSON.stringify(valores) !== JSON.stringify(inicial),
    cambiar: <C extends keyof ValoresDeTarea>(campo: C, valor: ValoresDeTarea[C]) => {
      setValores((antes) => ({ ...antes, [campo]: valor }))
      setErrores({})
    },
    enviar,
  }
}
