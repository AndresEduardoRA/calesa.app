'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { useReintentoAlVolver } from '@/shared/ui/use-reintento-al-volver'
import {
  CLAVE_DE_LA_CLASE,
  CLAVE_DEL_ICONO,
  CLAVE_DEL_NOMBRE,
  decidirEnvioDeTipo,
  hayCambiosEnTipo,
  type ClaseDeTipoDeLead,
  type TipoDeLeadConUso,
} from '../../../entities/tipo-de-lead'
import { useRespuestaDelFormulario } from './use-respuesta-del-formulario'
import type { TiposDeLead } from './use-tipos-de-lead'

type Args = {
  tipos: TiposDeLead
  // Nulo = «Nuevo tipo».
  original: TipoDeLeadConUso | null
  alCerrar: () => void
  // Cerrado (se descartó o se fue con «atrás»), lo que esperaba la red no sale.
  abierto: boolean
}

// El estado del modal de un tipo: el nombre, la clase (sólo al crear: no cambia después), el motivo junto al campo, el envío. El
// id del intento nace al abrir y se conserva en cada reintento (guardar dos veces lo mismo no duplica). Un conflicto espera la
// versión nueva (la trae «Recargar»); sin conexión, lo escrito queda y sale solo al volver. Un envío a la vez lo cuida
// `useTiposDeLead`: devuelve nulo si ya había uno en vuelo.
export function useFormularioDeTipo({ tipos, original, alCerrar, abierto }: Args) {
  const router = useRouter()
  const [intento] = useState(() => crypto.randomUUID())
  const [nombre, setNombre] = useState(original?.nombre ?? '')
  const [clase, setClase] = useState<ClaseDeTipoDeLead | null>(original?.clase ?? null)
  const [icono, setIcono] = useState<string | null>(original?.icono ?? null)
  const [recargando, recargarPagina] = useTransition()
  const respuesta = useRespuestaDelFormulario(original, alCerrar)
  const { setErrores } = respuesta

  async function enviar(): Promise<boolean> {
    if (respuesta.conflicto !== null) {
      return false
    }
    const decision = decidirEnvioDeTipo({
      texto: nombre,
      clase,
      icono,
      tipos: tipos.tipos,
      original,
    })
    if (decision.paso === 'invalido') {
      setErrores(decision.motivos)
      return false
    }
    if (decision.paso === 'nada') {
      alCerrar()
      return true
    }
    respuesta.setAviso(null)
    if (decision.paso === 'crear') {
      return respuesta.aplicar(await tipos.crear(intento, decision.nombre, decision.clase, icono))
    }
    // `guardar` sólo sale con un tipo que se edita.
    return original ? respuesta.aplicar(await tipos.guardar(original, decision.cambios)) : false
  }

  const enLinea = useReintentoAlVolver(abierto ? respuesta.pendiente : null, () => enviar())

  return {
    nombre,
    clase,
    icono,
    errores: respuesta.errores,
    aviso: respuesta.aviso,
    conflicto: respuesta.conflicto,
    enCurso: tipos.enCurso,
    enLinea,
    esperandoConexion: respuesta.pendiente !== null,
    hayCambios: hayCambiosEnTipo(nombre, clase, icono, original),
    recargando,
    escribir: (valor: string) => {
      setNombre(valor)
      setErrores(({ [CLAVE_DEL_NOMBRE]: _resuelto, ...resto }) => resto)
    },
    elegirIcono: (valor: string | null) => {
      setIcono(valor)
      setErrores(({ [CLAVE_DEL_ICONO]: _resuelto, ...resto }) => resto)
    },
    elegirClase: (valor: ClaseDeTipoDeLead) => {
      setClase(valor)
      setErrores(({ [CLAVE_DE_LA_CLASE]: _resuelto, ...resto }) => resto)
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
