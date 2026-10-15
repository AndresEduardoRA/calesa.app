'use client'

import { useMemo, useState } from 'react'
import { localDeInstante } from '@/shared/lib/fechas'
import { useAtajo } from '@/shared/ui/atajos'
import { useBorradorDeEstado } from '@/shared/ui/use-borrador-de-estado'
import { useReintentoAlVolver } from '@/shared/ui/use-reintento-al-volver'
import type { TipoDeSeguimiento } from '../../../entities/alta'
import { documentoLimpio } from '../../../entities/documento-limpio'
import { MENSAJE_DE_LEAD_NO_DISPONIBLE } from '../../../entities/ficha'
import type { Recordatorio } from '../../../entities/recordatorios'
import {
  documentoInicial,
  MENSAJE_DE_SEGUIMIENTO_NO_DISPONIBLE,
  type Seguimiento,
  type ValoresDelSeguimiento,
} from '../../../entities/seguimiento'
import {
  conErrores,
  conValor,
  esperandoRed,
  pedidoDelRedactor,
  rechazado,
  redactorLimpio,
  sinConflicto,
  type EstadoDelRedactor,
} from './estado-del-redactor'
import { useEnvioDelSeguimiento, type EnvioDeSeguimiento } from './use-envio-del-seguimiento'

type Args = {
  leadId: string
  tipos: readonly TipoDeSeguimiento[]
  zona: string
  // Nulo = anotar uno nuevo.
  original: Seguimiento | null
  // Con el recordatorio que entró junto, si se pidió uno.
  alGuardar: (seguimiento: Seguimiento, recordatorio: Recordatorio | null) => void
  // El lead o el seguimiento dejaron de verse: vuelve a leerlo el servidor.
  alPerderAcceso: () => void
  // «Recargar» tras un conflicto: trae la versión de ahora sin perder lo escrito.
  alRecargar: () => void
}

function valoresIniciales(
  original: Seguimiento | null,
  tipos: readonly TipoDeSeguimiento[],
  zona: string,
): ValoresDelSeguimiento {
  if (!original) {
    return {
      tipoId: tipos[0]?.id ?? '',
      titulo: '',
      detalle: null,
      visible: false,
      ocurridoEn: '',
      recordatorio: '',
    }
  }
  return {
    tipoId: original.tipoId,
    titulo: original.titulo,
    detalle: documentoInicial(original),
    visible: original.visibilidad === 'publico',
    ocurridoEn: localDeInstante(original.ocurridoEn, { zona }),
    recordatorio: '',
  }
}

const perdioElAcceso = (mensaje: string) =>
  mensaje === MENSAJE_DE_LEAD_NO_DISPONIBLE || mensaje === MENSAJE_DE_SEGUIMIENTO_NO_DISPONIBLE

// Lo escrito, de vuelta del almacenamiento: el detalle pasa otra vez por la lista blanca.
const reponer = (cambios: Partial<ValoresDelSeguimiento>) => (antes: EstadoDelRedactor) => ({
  ...antes,
  valores: {
    ...antes.valores,
    ...cambios,
    ...('detalle' in cambios ? { detalle: documentoLimpio(cambios.detalle) } : {}),
  },
})

// Anotar o editar un seguimiento: valida con las reglas de la base antes de enviar y pinta los
// motivos junto a cada campo, guarda un borrador por lead (o por seguimiento), muestra el conflicto
// conservando lo escrito y, sin conexión, reintenta al volver. El alta lleva su id de intento: un
// reintento o un doble clic no duplican.
export function useRedactor({ leadId, tipos, zona, original, ...avisos }: Args) {
  const guardado = useMemo(() => valoresIniciales(original, tipos, zona), [original, tipos, zona])
  const [estado, setEstado] = useState(() => redactorLimpio(guardado))
  const [intento, setIntento] = useState(() => crypto.randomUUID())
  const envio = useEnvioDelSeguimiento()
  const borrador = useBorradorDeEstado({
    clave: original ? `seguimiento-${original.id}` : `seguimiento-nuevo-${leadId}`,
    valores: estado.valores,
    guardado,
    alReponer: (cambios) => {
      setEstado(reponer(cambios))
    },
  })

  function aplicar(resultado: EnvioDeSeguimiento): boolean {
    if (resultado.ok) {
      borrador.limpiar()
      if (!original) {
        setEstado(redactorLimpio(guardado))
        setIntento(crypto.randomUUID())
      }
      avisos.alGuardar(resultado.data.seguimiento, resultado.data.recordatorio ?? null)
      return true
    }
    if ('sinRed' in resultado) {
      setEstado(esperandoRed)
      return false
    }
    setEstado((antes) => rechazado(antes, resultado.error, resultado.porCampo))
    if (perdioElAcceso(resultado.error.mensaje)) {
      avisos.alPerderAcceso()
    }
    return false
  }

  async function enviar(): Promise<boolean> {
    if (envio.enCurso) {
      return false
    }
    const pedido = pedidoDelRedactor({
      valores: estado.valores,
      original,
      intento,
      leadId,
      ahora: new Date().toISOString(),
      zona,
      tiposActivos: tipos.map((t) => t.id),
    })
    if (pedido.tipo === 'invalido') {
      setEstado((antes) => conErrores(antes, pedido.errores))
      return false
    }
    if (pedido.tipo === 'sin_cambios' && original) {
      return aplicar({ ok: true, data: { resultado: 'sin_cambios', seguimiento: original } })
    }
    return pedido.tipo === 'sin_cambios' ? false : aplicar(await envio.enviar(pedido))
  }

  const enLinea = useReintentoAlVolver(estado.pendiente, () => enviar())
  useAtajo('guardar', () => void enviar())
  useAtajo('guardarYSeguir', () => void enviar())

  return {
    ...estado,
    esperandoConexion: estado.pendiente !== null,
    enLinea,
    enCurso: envio.enCurso,
    hayAlgoEscrito: JSON.stringify(estado.valores) !== JSON.stringify(guardado),
    cambiar: <K extends keyof ValoresDelSeguimiento>(clave: K, valor: ValoresDelSeguimiento[K]) => {
      setEstado((antes) => conValor(antes, clave, valor))
    },
    enviar,
    recargar: () => {
      setEstado(sinConflicto)
      avisos.alRecargar()
    },
    // Cancelar a propósito: lo escrito se va.
    descartar: () => {
      borrador.limpiar()
      setEstado(redactorLimpio(guardado))
    },
  }
}

export type Redactor = ReturnType<typeof useRedactor>
