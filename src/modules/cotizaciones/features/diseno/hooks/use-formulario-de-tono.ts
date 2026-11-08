'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { useReintentoAlVolver } from '@/shared/ui/use-reintento-al-volver'
import { hayCambiosEnElTono } from '../../../entities/diseno/panel-de-tonos'
import {
  cambiosDeUnTono,
  coloresDeUnTonoNuevo,
  validarTono,
  type ColorDeUnTema,
  type ColoresDeUnTono,
  type TemaDeUnTono,
  type Tono,
} from '../../../entities/diseno/tonos'
import { useRespuestaDeTono } from './use-respuesta-de-tono'
import type { Tonos } from './use-tonos'

type Args = {
  tonos: Tonos
  // Nulo = «Nuevo tono».
  original: Tono | null
  alCerrar: () => void
  // Cerrado (se descartó o se fue con «atrás»), lo que esperaba la red no sale.
  abierto: boolean
}

const sinMotivo = (errores: Record<string, string>, ...claves: string[]) =>
  Object.fromEntries(Object.entries(errores).filter(([clave]) => !claves.includes(clave)))

// El estado del modal de un tono: el nombre, los seis colores tal cual se escriben, el motivo junto a cada campo y el envío. El id del intento nace al abrir y se
// conserva en cada reintento. «Guardar» no se apaga por el AA: al enviar, `validarTono()` pone el motivo junto al campo y nada sale; lo que la base rechaza vuelve
// igual. Un conflicto espera la versión nueva (la trae «Recargar») y **conserva lo escrito**; sin conexión, lo escrito queda y sale solo al volver.
export function useFormularioDeTono({ tonos, original, alCerrar, abierto }: Args) {
  const router = useRouter()
  const [intento] = useState(() => crypto.randomUUID())
  const [nombre, setNombre] = useState(original?.nombre ?? '')
  const [colores, setColores] = useState<ColoresDeUnTono>(
    () => original?.colores ?? coloresDeUnTonoNuevo(),
  )
  const [recargando, recargarPagina] = useTransition()
  const respuesta = useRespuestaDeTono(original, alCerrar)
  const { setErrores } = respuesta

  async function enviar(): Promise<boolean> {
    if (respuesta.conflicto !== null) return false
    const validado = validarTono({
      nombre,
      colores,
      tonos: tonos.lista.tonos,
      tope: tonos.lista.tope,
      original,
    })
    if (!validado.ok) {
      setErrores(validado.motivos)
      return false
    }
    respuesta.setAviso(null)
    if (!original)
      return respuesta.aplicar(await tonos.crear(intento, validado.nombre, validado.colores))
    const cambios = cambiosDeUnTono(original, validado)
    // Sin cambio no hay nada que guardar: se cierra.
    if (cambios.nombre === undefined && cambios.colores === undefined) {
      alCerrar()
      return true
    }
    return respuesta.aplicar(await tonos.guardar(original, cambios))
  }

  const enLinea = useReintentoAlVolver(abierto ? respuesta.pendiente : null, () => enviar())

  return {
    nombre,
    colores,
    errores: respuesta.errores,
    aviso: respuesta.aviso,
    conflicto: respuesta.conflicto,
    enCurso: tonos.enCurso,
    enLinea,
    esperandoConexion: respuesta.pendiente !== null,
    // Cerrar ahora perdería lo escrito: el modal pregunta antes.
    hayCambios: hayCambiosEnElTono(original, nombre, colores),
    recargando,
    escribirNombre: (valor: string) => {
      setNombre(valor)
      setErrores((antes) => sinMotivo(antes, 'nombre'))
    },
    // Escribir un color limpia su motivo y el del AA de su tema (puede haber dejado de valer).
    escribirColor: (tema: TemaDeUnTono, color: ColorDeUnTema, valor: string) => {
      setColores((antes) => ({ ...antes, [tema]: { ...antes[tema], [color]: valor } }))
      setErrores((antes) => sinMotivo(antes, `${tema}.${color}`, tema))
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
