'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { useReintentoAlVolver } from '@/shared/ui/use-reintento-al-volver'
import {
  CLAVE_DEL_ICONO,
  CLAVE_DEL_NOMBRE,
  decidirEnvioDeOrigen,
  hayCambiosEnOrigen,
  type OrigenDeLeadConUso,
} from '../../../entities/origen-de-lead'
import { useRespuestaDelFormulario } from './use-respuesta-del-formulario'
import type { OrigenesDeLead } from './use-origenes-de-lead'

type Args = {
  origenes: OrigenesDeLead
  // Nulo = «Nuevo origen».
  original: OrigenDeLeadConUso | null
  alCerrar: () => void
  // Cerrado (se descartó o se fue con «atrás»), lo que esperaba la red no sale.
  abierto: boolean
}

// El estado del modal de un origen: el nombre, el motivo junto al campo, el envío. El id del intento
// nace al abrir y se conserva en cada reintento (guardar dos veces lo mismo no duplica). Un conflicto
// espera la versión nueva (la trae «Recargar»); sin conexión, lo escrito queda y sale solo al volver.
// Un envío a la vez lo cuida `useOrigenesDeLead`: devuelve nulo si ya había uno en vuelo.
export function useFormularioDeOrigen({ origenes, original, alCerrar, abierto }: Args) {
  const router = useRouter()
  const [intento] = useState(() => crypto.randomUUID())
  const [nombre, setNombre] = useState(original?.nombre ?? '')
  const [icono, setIcono] = useState<string | null>(original?.icono ?? null)
  const [recargando, recargarPagina] = useTransition()
  const respuesta = useRespuestaDelFormulario(original, alCerrar)
  const { errores, setErrores, aviso, setAviso, conflicto, pendiente, aplicar } = respuesta

  async function enviar(): Promise<boolean> {
    if (conflicto !== null) {
      return false
    }
    const decision = decidirEnvioDeOrigen(nombre, icono, origenes.origenes, original)
    if (decision.paso === 'invalido') {
      setErrores(decision.motivos)
      return false
    }
    if (decision.paso === 'nada') {
      alCerrar()
      return true
    }
    setAviso(null)
    if (decision.paso === 'crear') {
      return aplicar(await origenes.crear(intento, decision.nombre, icono))
    }
    // `guardar` sólo sale con un origen que se edita.
    return original ? aplicar(await origenes.guardar(original, decision.cambios)) : false
  }

  const enLinea = useReintentoAlVolver(abierto ? pendiente : null, () => enviar())

  return {
    nombre,
    icono,
    errores,
    aviso,
    conflicto,
    enCurso: origenes.enCurso,
    enLinea,
    esperandoConexion: pendiente !== null,
    // Cerrar ahora perdería lo escrito: el modal pregunta antes.
    hayCambios: hayCambiosEnOrigen(nombre, icono, original),
    recargando,
    escribir: (valor: string) => {
      setNombre(valor)
      setErrores(({ [CLAVE_DEL_NOMBRE]: _resuelto, ...resto }) => resto)
    },
    elegirIcono: (valor: string | null) => {
      setIcono(valor)
      setErrores(({ [CLAVE_DEL_ICONO]: _resuelto, ...resto }) => resto)
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
