'use client'

import type { NumerosDeLead } from '@/shared/lib/numeros-de-lead'
import { useRouter } from 'next/navigation'
import { useRef, type Dispatch, type SetStateAction } from 'react'
import { validarAlta, type ContextoDeAlta, type DatosDeAlta } from '../../../entities/alta'
import type { CampoDeLead } from '../../../entities/campo'
import type { ResultadoDeAlta } from '../../../entities/repositorios'
import type * as ElPrimerSeguimiento from '../../../entities/primer-seguimiento'
import { hayAlgoEscrito } from '../../../entities/seguimiento-nuevo'
import type { Verificacion } from '../../../entities/verificacion'
import {
  conTelefonoFrenado,
  frenadoPorElTelefono,
  trasDuplicado,
  trasRechazo,
  trasSeguimientoInvalido,
  sinLoQueSeDesactivo,
  trasValidacion,
  type Estado,
} from './estado-del-alta'
import { useCrearLead } from './use-crear-lead'

export type Guardado = {
  id: string
  numeros: NumerosDeLead
  adoptado: boolean
  // Entró con su primer seguimiento: el aviso y la ficha a la que lleva dependen de eso.
  conSeguimiento: boolean
}

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

type Preparado =
  | { ok: true; datos: DatosDeAlta }
  // La validación ya dejó dicho en el estado qué no pasó, o por qué se espera.
  | { ok: false }

type Contexto = Pick<Args, 'estado' | 'setEstado' | 'contexto' | 'zona'>

// Los datos del lead y el teléfono: lo que no pasa queda dicho en el estado y no se sigue.
function validarLosDatos(args: Contexto & Pick<Args, 'layout' | 'telefono'>): DatosDeAlta | null {
  const { estado, setEstado, layout, contexto, zona, telefono } = args
  const validacion = validarAlta({ valores: estado.valores, layout, contexto, zona })
  if (!validacion.ok) {
    setEstado((antes) => trasValidacion(antes, validacion.porCampo))
    return null
  }
  const frenado = frenadoPorElTelefono(telefono.verificacion, estado.adoptar)
  if (frenado) {
    setEstado((antes) => conTelefonoFrenado(antes, frenado))
    return null
  }
  return validacion.datos
}

// El primer seguimiento: lo escrito, o nada. La validación (el documento, las fechas) se pide recién
// ahora y sólo si hay algo escrito, para que no viaje con el resto del alta.
async function preparaElSeguimiento(args: Contexto, datos: DatosDeAlta): Promise<Preparado> {
  const { estado, setEstado, contexto, zona } = args
  if (contexto.tiposDeSeguimiento.length === 0 || !hayAlgoEscrito(estado.seguimiento)) {
    return { ok: true, datos }
  }
  let modulo: typeof ElPrimerSeguimiento
  try {
    modulo = await import('../../../entities/primer-seguimiento')
  } catch {
    // El código de la validación no llegó (sin red): se espera como cualquier envío.
    setEstado((antes) => ({ ...antes, pendiente: true, aviso: null }))
    return { ok: false }
  }
  const resultado = modulo.primerSeguimiento(estado.seguimiento, {
    ahora: new Date().toISOString(),
    zona,
    tiposActivos: contexto.tiposDeSeguimiento.map((t) => t.id),
  })
  if (resultado.tipo === 'invalido') {
    setEstado((antes) => trasSeguimientoInvalido(antes, resultado.errores))
    return { ok: false }
  }
  if (resultado.tipo === 'sin') {
    return { ok: true, datos }
  }
  return {
    ok: true,
    datos: { ...datos, seguimiento: resultado.seguimiento, recordatorio: resultado.recordatorio },
  }
}

// Avanzar del paso de los datos al del seguimiento, y guardar: el lead y, si se escribió algo, su primer
// seguimiento y el próximo contacto entran juntos en una transacción. El segundo paso es opcional: sin
// nada escrito se crea el lead solo. Un duplicado no es un error: se dice junto al teléfono. Sin red,
// el intento queda esperando (con su id) y sale solo al volver.
export function useEnvioDelAlta(args: Args) {
  const { estado, setEstado, layout, contexto, zona, telefono, alGuardado } = args
  const router = useRouter()
  const envio = useCrearLead()
  const preparando = useRef(false)
  const hayTipos = contexto.tiposDeSeguimiento.length > 0

  function resolver(dato: ResultadoDeAlta, datos: DatosDeAlta): boolean {
    if (!('verificacion' in dato)) {
      alGuardado(
        {
          id: dato.id,
          numeros: dato.numeros,
          adoptado: dato.resultado === 'adoptado',
          conSeguimiento: datos.seguimiento !== null,
        },
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

  async function enviarDatos(datos: DatosDeAlta): Promise<boolean> {
    const hecho = await envio.crear({ id: estado.id, datos, adoptar: telefono.adoptar })
    if (hecho.ok) {
      return resolver(hecho.data, datos)
    }
    if ('sinRed' in hecho) {
      setEstado((antes) => ({ ...antes, pendiente: true, aviso: null }))
      return false
    }
    setEstado((antes) => trasRechazo(antes, hecho.error, hecho.porCampo))
    const sinElegir = sinLoQueSeDesactivo(hecho.porCampo)
    if (sinElegir) {
      // El origen o el tipo se desactivó (o se eliminó) mientras se escribía: se vuelve a leer lo que el alta ofrece.
      setEstado(sinElegir)
      router.refresh()
    }
    return false
  }

  // Los datos del lead y del teléfono, antes de pasar a nada más.
  function validarElLead(): DatosDeAlta | null {
    return validarLosDatos({ estado, setEstado, layout, contexto, zona, telefono })
  }

  async function conElSeguimiento(datos: DatosDeAlta): Promise<Preparado> {
    return preparaElSeguimiento({ estado, setEstado, contexto, zona }, datos)
  }

  // Guarda el lead tal como está: con el primer seguimiento si se escribió, y solo si no. Es «Guardar
  // lead» de cualquiera de los dos pasos y `Ctrl/Cmd+S`.
  async function guardar(): Promise<boolean> {
    // Una sola a la vez: `envio.enCurso` recién se prende al enviar, después de pedir la validación del
    // seguimiento, y un segundo `Ctrl/Cmd+S` o un clic en esa ventana saldría dos veces.
    if (envio.enCurso || preparando.current) {
      return false
    }
    const datos = validarElLead()
    if (!datos) {
      return false
    }
    preparando.current = true
    try {
      const completo = await conElSeguimiento(datos)
      if (!completo.ok) {
        return false
      }
      return await enviarDatos(completo.datos)
    } finally {
      preparando.current = false
    }
  }

  // `Ctrl/Cmd+Enter`: en los datos avanza al seguimiento (valida lo del lead antes); en el seguimiento
  // guarda. Sin tipos de seguimiento activos no hay a dónde avanzar: guarda.
  async function enviar(): Promise<boolean> {
    if (estado.paso === 'seguimiento' || !hayTipos) {
      return guardar()
    }
    if (envio.enCurso || !validarElLead()) {
      return false
    }
    setEstado((antes) => ({ ...antes, paso: 'seguimiento', errores: {}, aviso: null }))
    return true
  }

  return { enviar, guardar, enCurso: envio.enCurso }
}
