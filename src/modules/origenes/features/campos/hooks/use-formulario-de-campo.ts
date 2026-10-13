'use client'

import { useState } from 'react'
import { cambiosRespectoDe, necesitaVistaPrevia } from '../../../entities/cambios-de-campo'
import { claveDeCampo, type CampoDeLayout } from '../../../entities/campo'
import {
  resumenDeEliminacion,
  resumenDeImpacto,
  type ResumenDeImpacto,
} from '../../../entities/impacto'
import type { TipoDeOrigen } from '../../../entities/origen'
import { valorDefectoPara } from '../../../entities/valor-defecto'
import type { ErroresDeCampo, ValoresDeCampo } from '../components/campos-de-campo'
import type { EdicionesDeCampos } from './use-campos'

type Aviso = { modo: 'guardar' | 'eliminar'; resumen: ResumenDeImpacto }

type Args = {
  origenId: string
  tipoDeOrigen: TipoDeOrigen
  campo: CampoDeLayout | null
  todos: readonly CampoDeLayout[]
  ediciones: EdicionesDeCampos
  alTerminar: () => void
}

const VALORES_DE_UN_CAMPO_NUEVO: ValoresDeCampo = {
  etiqueta: '',
  clave: '',
  tipo: 'texto',
  opciones: [],
  requerido: false,
  grupo: '',
  enTarjeta: false,
  filtrable: false,
  publicoWeb: false,
  claveApibara: '',
  activo: true,
  valorDefecto: null,
}

function valoresIniciales(campo: CampoDeLayout | null): ValoresDeCampo {
  if (campo === null) {
    return VALORES_DE_UN_CAMPO_NUEVO
  }
  return {
    ...campo,
    grupo: campo.grupo ?? '',
    claveApibara: campo.claveApibara ?? '',
  }
}

// Un valor por defecto que deja de servir (cambió el tipo, se sacó su opción) se va solo.
function conDefectoVigente(valores: ValoresDeCampo): ValoresDeCampo {
  return {
    ...valores,
    valorDefecto: valorDefectoPara(valores.tipo, valores.opciones, valores.valorDefecto),
  }
}

const vacioANulo = (texto: string) => (texto.trim() === '' ? null : texto.trim())

// Lo que la persona dejó en el formulario, medido contra lo guardado: sólo viaja lo que cambió.
function cambiosDelFormulario(campo: CampoDeLayout, valores: ValoresDeCampo) {
  return cambiosRespectoDe(campo, {
    etiqueta: valores.etiqueta.trim(),
    tipo: valores.tipo,
    opciones: valores.opciones,
    requerido: valores.requerido,
    grupo: vacioANulo(valores.grupo),
    enTarjeta: valores.enTarjeta,
    filtrable: valores.filtrable,
    publicoWeb: valores.publicoWeb,
    claveApibara: vacioANulo(valores.claveApibara),
    activo: valores.activo,
    valorDefecto: valores.valorDefecto,
  })
}

type ResultadoDeGuardar =
  | { estado: 'guardado' | 'sin_cambios' | 'fallo' }
  | { estado: 'pregunta'; resumen: ResumenDeImpacto }

// Guarda los cambios de un campo. Un cambio que puede tocar datos se cuenta primero; con algo
// que decir (o algo que lo impide) devuelve la pregunta en vez de guardar.
async function guardarCambios(
  editado: CampoDeLayout,
  valores: ValoresDeCampo,
  confirmado: boolean,
  ediciones: EdicionesDeCampos,
): Promise<ResultadoDeGuardar> {
  const cambios = cambiosDelFormulario(editado, valores)
  if (Object.keys(cambios).length === 0) {
    return { estado: 'sin_cambios' }
  }
  if (!confirmado && necesitaVistaPrevia(editado, cambios)) {
    const conteo = await ediciones.vistaPrevia(editado.id)
    if (!conteo.ok) {
      return { estado: 'fallo' }
    }
    const resumen = resumenDeImpacto(editado, cambios, conteo.data)
    if (resumen.bloquea || resumen.avisos.length > 0) {
      return { estado: 'pregunta', resumen }
    }
  }
  const resultado = await ediciones.guardar(editado, cambios)
  return { estado: resultado.ok ? 'guardado' : 'fallo' }
}

// El estado de crear o editar un campo, con el aviso de impacto que va antes de guardar un cambio
// que toca datos ya cargados. Cualquier cambio en el formulario descarta el aviso: lo que se
// confirma es lo que se está viendo.
export function useFormularioDeCampo(args: Args) {
  const { origenId, tipoDeOrigen, campo, todos, ediciones, alTerminar } = args
  const [valores, setValores] = useState(() => valoresIniciales(campo))
  const [aviso, setAviso] = useState<Aviso | null>(null)
  const [errores, setErrores] = useState<ErroresDeCampo>({})

  const clave =
    campo?.clave ??
    claveDeCampo(
      valores.etiqueta.trim() || 'campo',
      todos.map((otro) => otro.clave),
    )

  function cambiar(parcial: Partial<ValoresDeCampo>) {
    setAviso(null)
    setErrores({})
    setValores((actuales) => conDefectoVigente({ ...actuales, ...parcial }))
  }

  async function crear() {
    const { activo: _activo, ...nuevo } = valores
    const resultado = await ediciones.crear({
      ...nuevo,
      origenId,
      clave,
      claveApibara: tipoDeOrigen === 'subasta' ? valores.claveApibara : null,
    })
    if (resultado.ok) {
      alTerminar()
    } else if (resultado.error.codigo === 'duplicado') {
      setErrores({ clave: 'Ya hay un campo con un nombre parecido en este origen.' })
    }
    return resultado.ok
  }

  async function guardar(editado: CampoDeLayout) {
    const confirmado = aviso?.modo === 'guardar' && !aviso.resumen.bloquea
    const resultado = await guardarCambios(editado, valores, confirmado, ediciones)
    if (resultado.estado === 'pregunta') {
      setAviso({ modo: 'guardar', resumen: resultado.resumen })
    } else if (resultado.estado !== 'fallo') {
      alTerminar()
    }
    return resultado.estado === 'guardado' || resultado.estado === 'sin_cambios'
  }

  async function pedirEliminar() {
    if (campo === null) {
      return
    }
    const conteo = await ediciones.vistaPrevia(campo.id)
    if (conteo.ok) {
      setAviso({ modo: 'eliminar', resumen: resumenDeEliminacion(campo, conteo.data) })
    }
  }

  async function confirmarEliminar() {
    if (campo === null) {
      return
    }
    const resultado = await ediciones.eliminar(campo)
    if (resultado.ok) {
      alTerminar()
    } else {
      setAviso(null)
    }
  }

  return {
    valores: { ...valores, clave },
    cambiar,
    aviso,
    errores,
    enviar: () => (campo === null ? crear() : guardar(campo)),
    pedirEliminar,
    confirmarEliminar,
  }
}
