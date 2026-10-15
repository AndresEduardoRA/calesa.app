'use client'

import { useAction } from 'next-safe-action/hooks'
import { useState } from 'react'
import { enviarAccion, type Envio } from '@/shared/lib/enviar-accion'
import { localDeInstante } from '@/shared/lib/fechas'
import { useAtajo } from '@/shared/ui/atajos'
import { validarRecordatorio } from '../../../entities/recordatorio'
import {
  pedidoDeRecordatorio,
  type ErroresDelRecordatorio,
  type Recordatorio,
} from '../../../entities/recordatorios'
import type { ResultadoDeRecordatorio } from '../../../entities/repositorios'
import { MENSAJE_DE_VALIDACION } from '../../ficha/resultado'
import { crearRecordatorio } from '../actions/crear-recordatorio'
import { guardarRecordatorio } from '../actions/guardar-recordatorio'

type Args = {
  leadId: string
  zona: string
  // Nulo = agendar uno nuevo.
  original: Recordatorio | null
  alGuardar: (recordatorio: ResultadoDeRecordatorio['recordatorio']) => void
}

// Agendar o cambiar un recordatorio: título y cuándo (a futuro, en la zona de la empresa). El alta
// lleva su id de intento; editar, la versión. Un rechazo deja lo escrito.
export function useFormularioDeRecordatorio({ leadId, zona, original, alGuardar }: Args) {
  const cuandoOriginal = original ? localDeInstante(original.recordarEn, { zona }) : ''
  const [titulo, setTitulo] = useState(original?.titulo ?? '')
  const [cuando, setCuando] = useState(cuandoOriginal)
  const [errores, setErrores] = useState<ErroresDelRecordatorio>({})
  const [aviso, setAviso] = useState<string | null>(null)
  const [intento] = useState(() => crypto.randomUUID())
  const crear = useAction(crearRecordatorio)
  const guardar = useAction(guardarRecordatorio)
  const enCurso = crear.isPending || guardar.isPending

  function aplicar(envio: Envio<ResultadoDeRecordatorio>) {
    if (envio.ok) {
      alGuardar(envio.data.recordatorio)
      return
    }
    const porCampo = 'porCampo' in envio ? envio.porCampo : undefined
    setErrores((porCampo ?? {}) as ErroresDelRecordatorio)
    setAviso(porCampo ? null : envio.error.mensaje)
  }

  async function enviar() {
    if (enCurso) {
      return
    }
    const pedido = pedidoDeRecordatorio({
      titulo,
      cuando,
      cuandoOriginal,
      original,
      intento,
      leadId,
      validarCuando: (local) => validarRecordatorio(local, new Date().toISOString(), zona),
    })
    if (pedido.tipo === 'invalido') {
      setErrores(pedido.errores)
    } else if (pedido.tipo === 'sin_cambios') {
      if (original) {
        alGuardar({ ...original, eliminado: false })
      }
    } else {
      aplicar(
        await enviarAccion<ResultadoDeRecordatorio>(
          pedido.tipo === 'crear'
            ? crear.executeAsync(pedido.pedido)
            : guardar.executeAsync(pedido.pedido),
          MENSAJE_DE_VALIDACION,
        ),
      )
    }
  }

  useAtajo('guardar', () => void enviar())
  useAtajo('guardarYSeguir', () => void enviar())

  return {
    titulo,
    cuando,
    errores,
    aviso,
    enCurso,
    cambiarTitulo: (valor: string) => {
      setTitulo(valor)
      setErrores(({ titulo: _t, ...resto }) => resto)
    },
    cambiarCuando: (valor: string) => {
      setCuando(valor)
      setErrores(({ recordarEn: _r, ...resto }) => resto)
    },
    enviar,
  }
}
