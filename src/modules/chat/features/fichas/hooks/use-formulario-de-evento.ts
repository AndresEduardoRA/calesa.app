'use client'

import { useAction } from 'next-safe-action/hooks'
import { useState } from 'react'
import {
  datosDeEventoNuevo,
  destinatariosDeEvento,
  validarEvento,
  type ErroresDeEvento,
  type PersonaElegida,
  type ValoresDeEvento,
} from '@/modules/agenda/client'
import { enviarAccion } from '@/shared/lib/enviar-accion'
import { diaEnZona, sumarDias } from '@/shared/lib/fechas'
import { avisarExito } from '@/shared/ui/toasts'
import { MENSAJE_DE_VALIDACION } from '../../resultado'
import { crearEventoDelChat } from '../actions/crear-evento-del-chat'

type Opciones = {
  conversacion: string
  zona: string
  titulo: string
  // En una directa, la otra persona viene invitada (y se puede quitar).
  invitadaDePartida: PersonaElegida | null
  // Con `agenda.eventos.publicar` el evento es «para seleccionados» y lleva invitados; sin él nace privado y sin invitados (la base no deja otra cosa).
  puedePublicar: boolean
  alCrear: () => void
}

const CAMPOS = ['titulo', 'inicia_en', 'visibilidad', 'destinatarios'] as const

// El formulario corto de `/evento`: título, cuándo empieza e invitados. Empieza mañana a las 09:00. El `id` del intento se conserva en cada reintento.
export function useFormularioDeEvento({
  conversacion,
  zona,
  titulo,
  invitadaDePartida,
  puedePublicar,
  alCrear,
}: Opciones) {
  const [intento] = useState(() => crypto.randomUUID())
  const [inicial] = useState<ValoresDeEvento>(() => ({
    titulo,
    descripcion: '',
    lugar: '',
    iniciaEn: `${sumarDias(diaEnZona(new Date().toISOString(), { zona }), 1)}T09:00`,
    terminaEn: '',
    visibilidad: puedePublicar ? 'seleccionados' : 'privado',
    destinatarios: puedePublicar && invitadaDePartida ? [invitadaDePartida] : [],
  }))
  const [valores, setValores] = useState<ValoresDeEvento>(inicial)
  const [errores, setErrores] = useState<ErroresDeEvento>({})
  const [aviso, setAviso] = useState<string | null>(null)
  const accion = useAction(crearEventoDelChat)

  async function enviar() {
    const locales = validarEvento(valores, zona)
    if (Object.keys(locales).length > 0) {
      setErrores(locales)
      return
    }
    setAviso(null)
    const { inicia_en: iniciaEn } = datosDeEventoNuevo(valores, zona)
    const envio = await enviarAccion(
      accion.executeAsync({
        id: intento,
        conversacion,
        datos: {
          titulo: valores.titulo.trim(),
          inicia_en: iniciaEn,
          visibilidad: valores.visibilidad === 'seleccionados' ? 'seleccionados' : 'privado',
        },
        destinatarios: destinatariosDeEvento(valores),
      }),
      MENSAJE_DE_VALIDACION,
    )
    if (!envio.ok) {
      const porCampo = 'porCampo' in envio ? (envio.porCampo ?? {}) : {}
      const deCampo = Object.fromEntries(
        CAMPOS.flatMap((c) => (porCampo[c] ? [[c, porCampo[c]]] : [])),
      ) as ErroresDeEvento
      setErrores(deCampo)
      setAviso(Object.keys(deCampo).length > 0 ? null : envio.error.mensaje)
      return
    }
    avisarExito('Evento creado.')
    alCrear()
  }

  return {
    valores,
    errores,
    aviso,
    puedePublicar,
    enCurso: accion.isPending,
    hayCambios: JSON.stringify(valores) !== JSON.stringify(inicial),
    cambiar: <C extends keyof ValoresDeEvento>(campo: C, valor: ValoresDeEvento[C]) => {
      setValores((antes) => ({ ...antes, [campo]: valor }))
      setErrores({})
    },
    enviar,
  }
}
