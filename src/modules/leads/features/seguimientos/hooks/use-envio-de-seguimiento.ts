'use client'

import { useAction } from 'next-safe-action/hooks'
import { useState } from 'react'
import { enviarAccion, type Envio } from '@/shared/lib/enviar-accion'
import { useConflictoHastaLaVersion } from '@/shared/ui/use-conflicto-hasta-la-version'
import { useReintentoAlVolver } from '@/shared/ui/use-reintento-al-volver'
import { useUnEnvioALaVez } from '@/shared/ui/use-un-envio-a-la-vez'
import type { TipoDeSeguimiento } from '../../../entities/alta'
import { MENSAJE_DE_LEAD_NO_DISPONIBLE } from '../../../entities/ficha'
import type { Recordatorio } from '../../../entities/recordatorios'
import type { ResultadoDeSeguimiento } from '../../../entities/repositorios'
import {
  MENSAJE_DE_SEGUIMIENTO_NO_DISPONIBLE,
  type ErroresDelSeguimiento,
  type Seguimiento,
  type ValoresDelSeguimiento,
} from '../../../entities/seguimiento'
import { MENSAJE_DE_VALIDACION } from '../../ficha/resultado'
import { crearSeguimiento } from '../actions/crear-seguimiento'
import { guardarSeguimiento } from '../actions/guardar-seguimiento'
import { useIntento } from './intento-pendiente'
import { pedidoDelSeguimiento, type PedidoDelSeguimiento } from './pedido-del-seguimiento'

type Args = {
  leadId: string
  tipos: readonly TipoDeSeguimiento[]
  zona: string
  original: Seguimiento | null
  valores: ValoresDelSeguimiento
  // Cerrado (se descartó o se fue con «atrás»), lo que esperaba la red no sale.
  abierto: boolean
  // Guardado (o sin nada que guardar al editar): quien lo usa limpia el borrador y cierra. Con el
  // próximo contacto que entró junto, si se pidió uno.
  alGuardar: (seguimiento: Seguimiento, recordatorio: Recordatorio | null) => void
}

type PedidoQueViaja = Extract<PedidoDelSeguimiento, { tipo: 'crear' } | { tipo: 'guardar' }>

// Lo que quedó sin enviar por falta de red: un objeto por intento (estable entre renders).
type Pendiente = { desde: number }

// El lead o el seguimiento dejaron de verse (otra pestaña lo eliminó, le quitaron la cartera).
const yaNoEsta = (mensaje: string) =>
  mensaje === MENSAJE_DE_LEAD_NO_DISPONIBLE || mensaje === MENSAJE_DE_SEGUIMIENTO_NO_DISPONIBLE

function useAcciones() {
  const crear = useAction(crearSeguimiento)
  const guardar = useAction(guardarSeguimiento)
  const unaVez = useUnEnvioALaVez()
  return {
    enCurso: unaVez.enCurso,
    mandar: (pedido: PedidoQueViaja) =>
      unaVez.mandar(() =>
        enviarAccion<ResultadoDeSeguimiento>(
          pedido.tipo === 'crear'
            ? crear.executeAsync(pedido.pedido)
            : guardar.executeAsync(pedido.pedido),
          MENSAJE_DE_VALIDACION,
        ),
      ),
  }
}

// Los motivos de un rechazo: junto a cada campo, o arriba. Escribir en un campo resuelve el suyo (y el
// aviso general).
function useMotivos() {
  const [errores, setErrores] = useState<ErroresDelSeguimiento>({})
  const [aviso, setAviso] = useState<string | null>(null)
  return {
    errores,
    aviso,
    setErrores,
    setAviso,
    resolver: (campo: keyof ValoresDelSeguimiento) => {
      setErrores((antes) => {
        const { [campo as keyof ErroresDelSeguimiento]: _resuelto, ...resto } = antes
        return resto
      })
      setAviso(null)
    },
  }
}

// El envío de un seguimiento: anotar lleva su id de intento (uno por apertura); editar, la versión y
// sólo lo que cambió. Un rechazo deja lo escrito y dice el motivo junto a su campo; un conflicto espera
// la versión nueva; si el lead o el seguimiento dejaron de verse, el modal lo dice (no se cierra ni se
// relee la pantalla: lo escrito queda a la vista). Sin red, sale solo al volver y sólo abierto. Un
// envío a la vez, con una marca propia.
export function useEnvioDeSeguimiento({
  leadId,
  tipos,
  zona,
  original,
  valores,
  abierto,
  alGuardar,
}: Args) {
  const { setErrores, setAviso, ...motivos } = useMotivos()
  const [noDisponible, setNoDisponible] = useState<string | null>(null)
  const [conflicto, setConflicto] = useConflictoHastaLaVersion(original?.actualizadoEn ?? null)
  const [pendiente, setPendiente] = useState<Pendiente | null>(null)
  const { intento, quedoPendiente, resuelto } = useIntento(leadId, original === null)
  const acciones = useAcciones()

  function aplicar(envio: Envio<ResultadoDeSeguimiento>): boolean {
    if (envio.ok) {
      setPendiente(null)
      resuelto()
      alGuardar(envio.data.seguimiento, envio.data.recordatorio ?? null)
      return true
    }
    if ('sinRed' in envio) {
      quedoPendiente()
      setPendiente((antes) => antes ?? { desde: Date.now() })
      return false
    }
    setPendiente(null)
    if (envio.error.codigo === 'conflicto') {
      setConflicto(envio.error.mensaje)
      return false
    }
    if (yaNoEsta(envio.error.mensaje)) {
      setNoDisponible(envio.error.mensaje)
      return false
    }
    setErrores((envio.porCampo ?? {}) as ErroresDelSeguimiento)
    setAviso(envio.porCampo ? null : envio.error.mensaje)
    return false
  }

  async function enviar(): Promise<boolean> {
    if (conflicto !== null || noDisponible !== null) {
      return false
    }
    const pedido = pedidoDelSeguimiento({
      valores,
      original,
      intento,
      leadId,
      ahora: new Date().toISOString(),
      zona,
      tiposActivos: tipos.map((t) => t.id),
    })
    if (pedido.tipo === 'invalido') {
      setErrores(pedido.errores)
      return false
    }
    if (pedido.tipo === 'sin_cambios') {
      if (original) {
        alGuardar(original, null)
      }
      return original !== null
    }
    setAviso(null)
    const envio = await acciones.mandar(pedido)
    return envio === null ? false : aplicar(envio)
  }

  const enLinea = useReintentoAlVolver(abierto ? pendiente : null, () => enviar())

  return {
    ...motivos,
    conflicto,
    noDisponible,
    enCurso: acciones.enCurso,
    enLinea,
    esperandoConexion: pendiente !== null,
    enviar,
    // «Descartar»: lo escrito se va, y con él el intento que esperaba la red.
    olvidarIntento: resuelto,
  }
}
