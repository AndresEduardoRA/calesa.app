'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import type { Envio } from '@/shared/lib/enviar-accion'
import { avisarExito } from '@/shared/ui/toasts'
import { useConflictoHastaLaVersion } from '@/shared/ui/use-conflicto-hasta-la-version'
import { useReintentoAlVolver } from '@/shared/ui/use-reintento-al-volver'
import {
  CLAVE_DEL_NOMBRE,
  normalizarNombreDeOrigen,
  validarNombreDeOrigen,
  type OrigenDeLeadConUso,
  type RespuestaDeOrigenes,
} from '../../../entities/origen-de-lead'
import type { OrigenesDeLead } from './use-origenes-de-lead'

type Args = {
  origenes: OrigenesDeLead
  // Nulo = «Nuevo origen».
  original: OrigenDeLeadConUso | null
  alCerrar: () => void
  // Cerrado (se descartó o se fue con «atrás»), lo que esperaba la red no sale.
  abierto: boolean
}

type Pendiente = { desde: number }

// El estado del modal de un origen: el nombre, el motivo junto al campo, el envío. El id del intento
// nace al abrir y se conserva en cada reintento (guardar dos veces lo mismo no duplica). Un conflicto
// espera la versión nueva (la trae «Recargar»); sin conexión, lo escrito queda y sale solo al volver.
// Un envío a la vez lo cuida `useOrigenesDeLead`: devuelve nulo si ya había uno en vuelo.
export function useFormularioDeOrigen({ origenes, original, alCerrar, abierto }: Args) {
  const router = useRouter()
  const [intento] = useState(() => crypto.randomUUID())
  const [nombre, setNombre] = useState(original?.nombre ?? '')
  const [errores, setErrores] = useState<Record<string, string>>({})
  const [aviso, setAviso] = useState<string | null>(null)
  const [conflicto, setConflicto] = useConflictoHastaLaVersion(original?.actualizadoEn ?? null)
  const [pendiente, setPendiente] = useState<Pendiente | null>(null)
  const [recargando, recargarPagina] = useTransition()

  function aplicar(envio: Envio<RespuestaDeOrigenes> | null): boolean {
    if (envio === null) {
      return false
    }
    if (envio.ok) {
      setPendiente(null)
      avisarExito(original ? 'Origen guardado.' : 'Origen creado.')
      alCerrar()
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
    setErrores(envio.porCampo ?? {})
    setAviso(envio.porCampo ? null : envio.error.mensaje)
    return false
  }

  async function enviar(): Promise<boolean> {
    if (conflicto !== null) {
      return false
    }
    const validado = validarNombreDeOrigen(nombre, origenes.origenes, original?.id ?? null)
    if (!validado.ok) {
      setErrores({ [CLAVE_DEL_NOMBRE]: validado.motivo })
      return false
    }
    // Sin cambio no hay nada que guardar: se cierra.
    if (original && validado.nombre === original.nombre) {
      alCerrar()
      return true
    }
    setAviso(null)
    return aplicar(
      original
        ? await origenes.renombrar(original, validado.nombre)
        : await origenes.crear(intento, validado.nombre),
    )
  }

  const enLinea = useReintentoAlVolver(abierto ? pendiente : null, () => enviar())

  return {
    nombre,
    errores,
    aviso,
    conflicto,
    enCurso: origenes.enCurso,
    enLinea,
    esperandoConexion: pendiente !== null,
    // Cerrar ahora perdería lo escrito: el modal pregunta antes.
    hayCambios: normalizarNombreDeOrigen(nombre) !== (original?.nombre ?? ''),
    recargando,
    escribir: (valor: string) => {
      setNombre(valor)
      setErrores(({ [CLAVE_DEL_NOMBRE]: _resuelto, ...resto }) => resto)
    },
    enviar,
    reintentar: () => {
      void enviar()
    },
    // La versión nueva llega con la lista de la página; lo escrito se conserva.
    recargar: () => {
      recargarPagina(() => {
        router.refresh()
      })
    },
  }
}
