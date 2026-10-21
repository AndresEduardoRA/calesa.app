'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { useReintentoAlVolver } from '@/shared/ui/use-reintento-al-volver'
import {
  CLAVE_DEL_ICONO,
  CLAVE_DEL_NOMBRE,
  cambiosDeTipoDeSeguimiento,
  normalizarNombreDeTipoDeSeguimiento,
  validarTipoDeSeguimiento,
  type TipoDeSeguimientoConUso,
} from '../../../entities/tipo-de-seguimiento'
import { useRespuestaDelFormulario } from './use-respuesta-del-formulario'
import type { TiposDeSeguimiento } from './use-tipos-de-seguimiento'

type Args = {
  tipos: TiposDeSeguimiento
  // Nulo = «Nuevo tipo».
  original: TipoDeSeguimientoConUso | null
  alCerrar: () => void
  // Cerrado (se descartó o se fue con «atrás»), lo que esperaba la red no sale.
  abierto: boolean
}

// El estado del modal de un tipo de seguimiento: el nombre, el icono, el motivo junto al campo, el envío. El id del intento nace al abrir y
// se conserva en cada reintento (guardar dos veces lo mismo no duplica). Un conflicto espera la versión nueva (la trae «Recargar»); sin
// conexión, lo escrito queda y sale solo al volver. Un envío a la vez lo cuida `useTiposDeSeguimiento`: devuelve nulo si ya había uno
// en vuelo.
export function useFormularioDeTipoDeSeguimiento({ tipos, original, alCerrar, abierto }: Args) {
  const router = useRouter()
  const [intento] = useState(() => crypto.randomUUID())
  const [nombre, setNombre] = useState(original?.nombre ?? '')
  const [icono, setIcono] = useState<string | null>(original?.icono ?? null)
  const [recargando, recargarPagina] = useTransition()
  const respuesta = useRespuestaDelFormulario(original, alCerrar)
  const { setErrores } = respuesta

  async function enviar(): Promise<boolean> {
    if (respuesta.conflicto !== null) {
      return false
    }
    const validado = validarTipoDeSeguimiento(nombre, tipos.tipos, original)
    if (!validado.ok) {
      setErrores(validado.motivos)
      return false
    }
    respuesta.setAviso(null)
    if (!original) {
      return respuesta.aplicar(await tipos.crear(intento, validado.nombre, icono))
    }
    const cambios = cambiosDeTipoDeSeguimiento(original, validado.nombre, icono)
    // Sin cambio no hay nada que guardar: se cierra.
    if (Object.keys(cambios).length === 0) {
      alCerrar()
      return true
    }
    return respuesta.aplicar(await tipos.guardar(original, cambios))
  }

  const enLinea = useReintentoAlVolver(abierto ? respuesta.pendiente : null, () => enviar())

  return {
    nombre,
    icono,
    errores: respuesta.errores,
    aviso: respuesta.aviso,
    conflicto: respuesta.conflicto,
    enCurso: tipos.enCurso,
    enLinea,
    esperandoConexion: respuesta.pendiente !== null,
    // Cerrar ahora perdería lo escrito: el modal pregunta antes. Elegir un icono ya es algo hecho.
    hayCambios:
      normalizarNombreDeTipoDeSeguimiento(nombre) !== (original?.nombre ?? '') ||
      icono !== (original?.icono ?? null),
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
