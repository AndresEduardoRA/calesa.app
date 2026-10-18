'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { useReintentoAlVolver } from '@/shared/ui/use-reintento-al-volver'
import {
  CLAVE_DE_LA_CLASE,
  CLAVE_DEL_NOMBRE,
  normalizarNombreDeTipo,
  validarTipo,
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
  const [recargando, recargarPagina] = useTransition()
  const respuesta = useRespuestaDelFormulario(original, alCerrar)
  const { setErrores } = respuesta

  async function enviar(): Promise<boolean> {
    if (respuesta.conflicto !== null) {
      return false
    }
    const validado = validarTipo(nombre, clase, tipos.tipos, original)
    if (!validado.ok) {
      setErrores(validado.motivos)
      return false
    }
    // Sin cambio no hay nada que guardar: se cierra.
    if (original && validado.nombre === original.nombre) {
      alCerrar()
      return true
    }
    respuesta.setAviso(null)
    return respuesta.aplicar(
      original
        ? await tipos.renombrar(original, validado.nombre)
        : await tipos.crear(intento, validado.nombre, validado.clase),
    )
  }

  const enLinea = useReintentoAlVolver(abierto ? respuesta.pendiente : null, () => enviar())

  return {
    nombre,
    clase,
    errores: respuesta.errores,
    aviso: respuesta.aviso,
    conflicto: respuesta.conflicto,
    enCurso: tipos.enCurso,
    enLinea,
    esperandoConexion: respuesta.pendiente !== null,
    // Cerrar ahora perdería lo escrito: el modal pregunta antes. Elegir la clase ya es algo hecho.
    hayCambios:
      normalizarNombreDeTipo(nombre) !== (original?.nombre ?? '') || (!original && clase !== null),
    recargando,
    escribir: (valor: string) => {
      setNombre(valor)
      setErrores(({ [CLAVE_DEL_NOMBRE]: _resuelto, ...resto }) => resto)
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
