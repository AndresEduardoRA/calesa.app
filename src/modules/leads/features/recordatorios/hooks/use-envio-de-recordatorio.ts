'use client'

import { useAction } from 'next-safe-action/hooks'
import { useRouter } from 'next/navigation'
import { useRef, useState } from 'react'
import { enviarAccion, type Envio } from '@/shared/lib/enviar-accion'
import { useReintentoAlVolver } from '@/shared/ui/use-reintento-al-volver'
import { MENSAJE_DE_LEAD_NO_DISPONIBLE } from '../../../entities/ficha'
import { validarRecordatorio } from '../../../entities/recordatorio'
import {
  MENSAJE_DE_RECORDATORIO_NO_DISPONIBLE,
  pedidoDeRecordatorio,
  type ErroresDelRecordatorio,
  type Recordatorio,
  type ValoresDelRecordatorio,
} from '../../../entities/recordatorios'
import type { ResultadoDeRecordatorio } from '../../../entities/repositorios'
import { MENSAJE_DE_VALIDACION } from '../../ficha/resultado'
import { crearRecordatorio } from '../actions/crear-recordatorio'
import { guardarRecordatorio } from '../actions/guardar-recordatorio'

type Args = {
  leadId: string
  zona: string
  original: Recordatorio | null
  // Lo que el formulario mostró al abrir (vacío si es nuevo): cambiar sólo el título de uno que ya
  // pasó no pide otra hora.
  cuandoOriginal: string
  valores: ValoresDelRecordatorio
  // Guardado (o sin nada que guardar): quien lo usa limpia el borrador y cierra.
  alGuardar: (recordatorio: ResultadoDeRecordatorio['recordatorio']) => void
}

// Lo que quedó sin enviar por falta de red: un objeto por intento (estable entre renders).
type Pendiente = { desde: number }

type PedidoQueViaja = Extract<
  ReturnType<typeof pedidoDeRecordatorio>,
  { tipo: 'crear' } | { tipo: 'guardar' }
>

// El conflicto se va cuando llega la versión nueva que trae «Recargar», no al pulsarlo: enviar en ese
// instante mandaría la vieja y volvería a chocar.
function useConflictoHastaLaVersionNueva(version: string | null) {
  const [conflicto, setConflicto] = useState<string | null>(null)
  const [vista, setVista] = useState(version)
  if (vista !== version) {
    setVista(version)
    setConflicto(null)
  }
  return [conflicto, setConflicto] as const
}

// Un envío a la vez, con una marca propia y no con `isPending`: el reintento al volver la conexión
// puede llegar mientras el anterior todavía termina. Nulo = ya había uno en vuelo.
function useUnEnvioALaVez() {
  const crear = useAction(crearRecordatorio)
  const guardar = useAction(guardarRecordatorio)
  const [enCurso, setEnCurso] = useState(false)
  const enVuelo = useRef(false)
  async function mandar(pedido: PedidoQueViaja): Promise<Envio<ResultadoDeRecordatorio> | null> {
    if (enVuelo.current) {
      return null
    }
    enVuelo.current = true
    setEnCurso(true)
    try {
      return await enviarAccion<ResultadoDeRecordatorio>(
        pedido.tipo === 'crear'
          ? crear.executeAsync(pedido.pedido)
          : guardar.executeAsync(pedido.pedido),
        MENSAJE_DE_VALIDACION,
      )
    } finally {
      enVuelo.current = false
      setEnCurso(false)
    }
  }
  return { mandar, enCurso }
}

// El envío de un recordatorio: el alta lleva su id de intento; editar, la versión. Un rechazo deja lo
// escrito y dice el motivo junto a su campo; un conflicto espera la versión nueva; sin red, sale solo
// al volver (una vez: el id o la versión hacen que repetirlo no duplique ni choque). Un envío a la vez,
// con una marca propia: el reintento al volver puede llegar mientras el anterior todavía termina.
export function useEnvioDeRecordatorio({
  leadId,
  zona,
  original,
  cuandoOriginal,
  valores,
  alGuardar,
}: Args) {
  const router = useRouter()
  const [errores, setErrores] = useState<ErroresDelRecordatorio>({})
  const [aviso, setAviso] = useState<string | null>(null)
  const [conflicto, setConflicto] = useConflictoHastaLaVersionNueva(original?.actualizadoEn ?? null)
  const [pendiente, setPendiente] = useState<Pendiente | null>(null)
  const [intento] = useState(() => crypto.randomUUID())
  const unaVez = useUnEnvioALaVez()

  function aplicar(envio: Envio<ResultadoDeRecordatorio>): boolean {
    if (envio.ok) {
      setPendiente(null)
      alGuardar(envio.data.recordatorio)
      return true
    }
    if ('sinRed' in envio) {
      setPendiente((antes) => antes ?? { desde: Date.now() })
      return false
    }
    setPendiente(null)
    if (envio.error.codigo === 'conflicto') {
      setConflicto(envio.error.mensaje)
      return false
    }
    setErrores((envio.porCampo ?? {}) as ErroresDelRecordatorio)
    setAviso(envio.porCampo ? null : envio.error.mensaje)
    // Ya no está (otra pestaña lo eliminó) o el lead dejó de verse: la página se vuelve a leer y el
    // modal lo dice; lo escrito sigue a la vista.
    if (
      envio.error.mensaje === MENSAJE_DE_RECORDATORIO_NO_DISPONIBLE ||
      envio.error.mensaje === MENSAJE_DE_LEAD_NO_DISPONIBLE
    ) {
      router.refresh()
    }
    return false
  }

  async function enviar(): Promise<boolean> {
    if (conflicto !== null) {
      return false
    }
    const pedido = pedidoDeRecordatorio({
      ...valores,
      cuandoOriginal,
      original,
      intento,
      leadId,
      validarCuando: (local) => validarRecordatorio(local, new Date().toISOString(), zona),
    })
    if (pedido.tipo === 'invalido') {
      setErrores(pedido.errores)
      return false
    }
    if (pedido.tipo === 'sin_cambios') {
      if (original) {
        alGuardar({ ...original, eliminado: false })
      }
      return true
    }
    setAviso(null)
    const envio = await unaVez.mandar(pedido)
    return envio === null ? false : aplicar(envio)
  }

  const enLinea = useReintentoAlVolver(pendiente, () => enviar())

  return {
    errores,
    aviso,
    conflicto,
    enCurso: unaVez.enCurso,
    enLinea,
    esperandoConexion: pendiente !== null,
    enviar,
    // Escribir en un campo resuelve su motivo.
    resolver: (campo: keyof ErroresDelRecordatorio) => {
      setErrores(({ [campo]: _resuelto, ...resto }) => resto)
    },
  }
}
