'use client'

import type { Dispatch, SetStateAction } from 'react'
import { validarAlta, type ContextoDeAlta, type DatosDeAlta } from '../../../entities/alta'
import type { CampoDeLead } from '../../../entities/campo'
import type { ResultadoDeAlta } from '../../../entities/repositorios'
import type { Verificacion } from '../../../entities/verificacion'
import {
  conTelefonoFrenado,
  frenadoPorElTelefono,
  trasDuplicado,
  trasRechazo,
  trasValidacion,
  type Estado,
} from './estado-del-alta'
import { useCrearLead } from './use-crear-lead'

export type Guardado = { id: string; numero: number; adoptado: boolean }

type Args = {
  estado: Estado
  setEstado: Dispatch<SetStateAction<Estado>>
  layout: readonly CampoDeLead[]
  contexto: ContextoDeAlta
  zona: string
  // Lo que se sabe del teléfono: el número, el veredicto y cómo fijar lo que dice el servidor.
  telefono: {
    numero: string | null
    verificacion: Verificacion | null
    adoptar: boolean
    fijar: (numero: string, verificacion: Verificacion) => void
  }
  // Lo guardado: limpia el borrador y deja el formulario listo para el siguiente.
  alGuardado: (guardado: Guardado, origenId: string | null) => void
}

// Avanzar del paso de los datos al del seguimiento y, desde ahí, guardar: el lead, su primer
// seguimiento y el recordatorio entran juntos. Un duplicado no es un error: se dice junto al
// teléfono. Sin red, el intento queda esperando (con su id) y sale solo al volver.
export function useEnvioDelAlta(args: Args) {
  const { estado, setEstado, layout, contexto, zona, telefono, alGuardado } = args
  const envio = useCrearLead()

  function resolver(dato: ResultadoDeAlta, datos: DatosDeAlta): boolean {
    if (!('verificacion' in dato)) {
      alGuardado(
        { id: dato.id, numero: dato.numero, adoptado: dato.resultado === 'adoptado' },
        datos.origenId,
      )
      return true
    }
    if (telefono.numero !== null) {
      telefono.fijar(telefono.numero, dato.verificacion)
    }
    setEstado((antes) => trasDuplicado(antes, dato.verificacion))
    return false
  }

  async function guardar(datos: DatosDeAlta): Promise<boolean> {
    const hecho = await envio.crear({ id: estado.id, datos, adoptar: telefono.adoptar })
    if (hecho.ok) {
      return resolver(hecho.data, datos)
    }
    if ('sinRed' in hecho) {
      setEstado((antes) => ({ ...antes, pendiente: true, aviso: null }))
      return false
    }
    setEstado((antes) => trasRechazo(antes, hecho.error, hecho.porCampo))
    return false
  }

  async function enviar(): Promise<boolean> {
    if (envio.enCurso) {
      return false
    }
    const enElSeguimiento = estado.paso === 'seguimiento'
    const validacion = validarAlta({
      valores: estado.valores,
      layout,
      contexto,
      zona,
      ahora: new Date().toISOString(),
      conSeguimiento: enElSeguimiento,
    })
    if (!validacion.ok) {
      setEstado((antes) => trasValidacion(antes, validacion.porCampo))
      return false
    }
    const frenado = frenadoPorElTelefono(telefono.verificacion, estado.adoptar)
    if (frenado) {
      setEstado((antes) => conTelefonoFrenado(antes, frenado))
      return false
    }
    if (!enElSeguimiento) {
      setEstado((antes) => ({ ...antes, paso: 'seguimiento', errores: {}, aviso: null }))
      return true
    }
    return guardar(validacion.datos)
  }

  return { enviar, enCurso: envio.enCurso }
}
