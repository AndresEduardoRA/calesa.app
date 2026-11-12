'use client'

import { useRef, useState, type RefObject } from 'react'
import { enviarAccion } from '@/shared/lib/enviar-accion'
import { enfocarPrimerError } from '@/shared/lib/formularios'
import { avisarExito } from '@/shared/ui/toasts'
import { useConflictoHastaLaVersion } from '@/shared/ui/use-conflicto-hasta-la-version'
import {
  cambiosDelGrupo,
  esperadasDelGrupo,
  textoDelRechazoDelGrupo,
  valoresComunes,
} from '../../../entities/transporte/edicion-del-grupo'
import type { GrupoLeido } from '../../../entities/transporte/grupos'
import {
  validarTransporte,
  type CampoDeTransporte,
  type ErroresDeTransporte,
  type ValoresDeTransporte,
} from '../../../entities/transporte/transporte'
import { aplicarAlGrupo } from '../actions/aplicar-al-grupo'
import { resultadoDelEnvio } from './resultado-del-envio'
import { useBorradorDeTransporte } from './use-borrador-de-transporte'

const MENSAJE_DE_VALIDACION = 'Revisa los datos del transporte.'
const SIN_APLICAR = 'No se cambió ninguna unidad.'

type Args = {
  grupo: GrupoLeido
  formulario: RefObject<HTMLFormElement | null>
  // Se aplicó: la clave que devuelve la base (nueva si cambió el contenedor o el booking del tipo).
  alAplicar: (clave: string) => void
}

// El formulario de «Editar grupo» (6.08-4). «Varios» sale de las unidades **vistas** (D38). Se manda sólo lo tocado, con las versiones que vio el resumen: la base es todo o nada. Un `PT409` queda
// en `conflicto` hasta que llega la versión nueva (`router.refresh()` desde «Recargar») y lo escrito sigue; un rechazo con campo va junto a él y arriba dice que no se cambió ninguna.
export function useFormularioDelGrupo({ grupo, formulario, alAplicar }: Args) {
  const comunes = valoresComunes(grupo.unidades)
  const esperadas = esperadasDelGrupo(grupo.unidades)
  const version = Object.entries(esperadas)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([id, v]) => `${id}@${v}`)
    .join('|')
  const { borrador, tocar, soltarYa } = useBorradorDeTransporte(version)
  const [errores, setErrores] = useState<ErroresDeTransporte>({})
  const [error, setError] = useState<string | null>(null)
  const [enCurso, setEnCurso] = useState(false)
  const [conflicto, setConflicto] = useConflictoHastaLaVersion(version)
  const ocupado = useRef(false)

  const valores: ValoresDeTransporte = { ...comunes.valores, ...borrador }
  const cambios = cambiosDelGrupo(comunes, valores)

  function escribir(campo: CampoDeTransporte, valor: string) {
    tocar(campo, valor)
    setErrores((antes) => {
      const resto = { ...antes }
      delete resto[campo]
      return resto
    })
  }

  async function enviar(pedido: NonNullable<typeof cambios>) {
    ocupado.current = true
    setEnCurso(true)
    setError(null)
    setErrores({})
    const envio = await enviarAccion(
      aplicarAlGrupo({ tipo: grupo.tipo, clave: grupo.clave, esperadas, cambios: pedido }),
      MENSAJE_DE_VALIDACION,
    )
    const resultado = resultadoDelEnvio(envio)
    setEnCurso(false)
    ocupado.current = false
    if (resultado.tipo === 'ok' && envio.ok) {
      soltarYa()
      avisarExito(
        envio.data.sinCambios
          ? 'No había nada que cambiar.'
          : `Se aplicó a las ${grupo.unidades.length} unidades.`,
      )
      alAplicar(envio.data.clave)
    } else if (resultado.tipo === 'conflicto') {
      setConflicto(textoDelRechazoDelGrupo(resultado.mensaje))
    } else if (resultado.tipo === 'error') {
      setErrores(resultado.porCampo ?? {})
      setError(resultado.porCampo ? SIN_APLICAR : textoDelRechazoDelGrupo(resultado.mensaje))
      enfocarPrimerError(formulario.current)
    }
  }

  function guardar() {
    if (ocupado.current || cambios === null) {
      return
    }
    const locales = validarTransporte(comunes.valores, valores)
    if (Object.keys(locales).length > 0) {
      setErrores(locales)
      setError(null)
      enfocarPrimerError(formulario.current)
      return
    }
    void enviar(cambios)
  }

  return {
    comunes,
    valores,
    errores,
    error,
    enCurso,
    conflicto,
    hayCambios: cambios !== null,
    escribir,
    guardar,
    descartar: soltarYa,
  }
}
