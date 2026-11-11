'use client'

import { useRouter } from 'next/navigation'
import { useMemo, useState, useTransition } from 'react'
import { useBorradorDeEstado } from '@/shared/ui/use-borrador-de-estado'
import { useReintentoAlVolver } from '@/shared/ui/use-reintento-al-volver'
import {
  BORRADOR_DE_TIPO_NUEVO,
  borradorDeTipo,
  cambiosParaGuardar,
  datosParaCrear,
  validarTipo,
} from '../../../entities/documentos/formulario-de-tipo'
import type { ClaveDeGrupo, TipoDeDocumento } from '../../../entities/documentos/tipo-de-documento'
import { claveDelBorrador } from '../../../entities/documentos/vista-de-grupo'
import { useRespuestaDeTipo } from './use-respuesta-de-tipo'
import { useValoresDeTipo } from './use-valores-de-tipo'
import type { TiposDeDocumento } from './use-tipos-de-documento'

type Args = {
  tipos: TiposDeDocumento
  // Nulo = «Nuevo tipo».
  original: TipoDeDocumento | null
  grupo: ClaveDeGrupo
  // El flujo del grupo (nulo = toda la empresa): donde nace un tipo nuevo.
  flujoId: string | null
  alCerrar: () => void
  // Cerrado (se descartó o se fue con «atrás»), lo que esperaba la red no sale ni se escribe borrador.
  abierto: boolean
}

// El estado del modal de un tipo de documento: el borrador del formulario (en `sessionStorage`, uno por grupo y tipo: son más de 6 campos), el motivo
// junto a cada campo y el envío. El id del intento nace al abrir y se conserva en cada reintento. Un conflicto espera la versión nueva (la trae
// «Recargar»); sin conexión, lo escrito queda y sale solo al volver. Un envío a la vez lo cuida `useTiposDeDocumento`.
export function useFormularioDeTipo({ tipos, original, grupo, flujoId, alCerrar, abierto }: Args) {
  const router = useRouter()
  const [intento] = useState(() => crypto.randomUUID())
  const inicial = useMemo(
    () => (original ? borradorDeTipo(original) : BORRADOR_DE_TIPO_NUEVO),
    [original],
  )
  const [recargando, recargarPagina] = useTransition()
  const respuesta = useRespuestaDeTipo(original, alCerrar)
  const { setErrores } = respuesta
  const campos = useValoresDeTipo(inicial, setErrores)
  const { valores } = campos
  const borrador = useBorradorDeEstado({
    activo: abierto,
    clave: claveDelBorrador(grupo, original?.id ?? null),
    valores,
    guardado: inicial,
    alReponer: campos.reponer,
  })

  async function enviar(): Promise<boolean> {
    if (respuesta.conflicto !== null) {
      return false
    }
    const validado = validarTipo(valores)
    if (!validado.ok) {
      setErrores(validado.errores)
      return false
    }
    respuesta.setAviso(null)
    const { datos } = validado
    const hecho = await (original ? guardar(original, datos) : crear(datos))
    if (hecho) {
      borrador.limpiar()
    }
    return hecho
  }

  async function crear(datos: Parameters<typeof datosParaCrear>[0]) {
    return respuesta.aplicar(await tipos.crear(intento, flujoId, datosParaCrear(datos)))
  }

  async function guardar(tipo: TipoDeDocumento, datos: Parameters<typeof datosParaCrear>[0]) {
    const cambios = cambiosParaGuardar(tipo, datos)
    // Sin cambio no hay nada que guardar: se cierra.
    if (cambios === null) {
      alCerrar()
      return true
    }
    return respuesta.aplicar(await tipos.guardar(tipo, cambios))
  }

  const enLinea = useReintentoAlVolver(abierto ? respuesta.pendiente : null, () => enviar())

  return {
    valores,
    errores: respuesta.errores,
    aviso: respuesta.aviso,
    conflicto: respuesta.conflicto,
    enCurso: tipos.enCurso,
    enLinea,
    esperandoConexion: respuesta.pendiente !== null,
    // Cerrar ahora perdería lo escrito: el modal pregunta antes.
    hayCambios: JSON.stringify(valores) !== JSON.stringify(inicial),
    recargando,
    escribir: campos.escribir,
    elegirModo: campos.elegirModo,
    alternarFormato: campos.alternarFormato,
    enviar,
    reintentar: () => {
      void enviar()
    },
    // La versión nueva llega con la página; lo escrito se conserva.
    recargar: () => {
      recargarPagina(() => {
        router.refresh()
      })
    },
    descartarBorrador: borrador.limpiar,
  }
}
