'use client'

import { useState } from 'react'
import { useConflictoHastaLaVersion } from '@/shared/ui/use-conflicto-hasta-la-version'
import { useReintentoAlVolver } from '@/shared/ui/use-reintento-al-volver'
import { avisarExito } from '@/shared/ui/toasts'
import {
  VALORES_DE_FASE_NUEVA,
  datosParaCrear,
  type ValoresDeFaseNueva,
} from '../../../entities/fases/formulario-de-fase'
import { erroresDeFaseNueva, errorDeEnvio } from '../../../entities/fases/formulario-de-fase'
import { useVersionDelFlujo } from '../../configuracion/hooks/use-version-del-flujo'
import type { ListaDeFasesEnPantalla } from './use-lista-de-fases'

type Errores = Record<string, string>

type Args = {
  lista: ListaDeFasesEnPantalla
  alCerrar: () => void
  // Cerrado (se descartó o se fue con «atrás»), lo que esperaba la red no sale.
  abierto: boolean
}

// El estado del modal de «Nueva fase»: nombre, color y tipo (son 3 campos: sin borrador). El id del intento nace al abrir (el modal se monta con una
// `key` por apertura) y se conserva en cada reintento. Un conflicto espera la versión nueva (la trae «Recargar»); sin conexión, lo escrito queda y sale
// solo al volver. Repetir el id da «Esa fase ya existe.» (la base no lo trata como el mismo pedido): ante un corte, se relee la lista antes de reintentar.
export function useFormularioDeNuevaFase({ lista, alCerrar, abierto }: Args) {
  const { version, recargar, recargando } = useVersionDelFlujo()
  const [intento] = useState(() => crypto.randomUUID())
  const [valores, setValores] = useState<ValoresDeFaseNueva>(VALORES_DE_FASE_NUEVA)
  const [errores, setErrores] = useState<Errores>({})
  const [aviso, setAviso] = useState<string | null>(null)
  const [pendiente, setPendiente] = useState<{ desde: number } | null>(null)
  const [conflicto, setConflicto] = useConflictoHastaLaVersion(version)

  function escribir(cambios: Partial<ValoresDeFaseNueva>, campo: string) {
    setValores((antes) => ({ ...antes, ...cambios }))
    setErrores((antes) => Object.fromEntries(Object.entries(antes).filter(([c]) => c !== campo)))
  }

  async function enviar(): Promise<boolean> {
    if (conflicto !== null) {
      return false
    }
    const nombre = valores.nombre.trim()
    const locales = erroresDeFaseNueva(valores)
    if (Object.keys(locales).length > 0) {
      setErrores(locales)
      return false
    }
    setAviso(null)
    const envio = await lista.crear(intento, datosParaCrear(valores))
    if (envio === null) {
      return false
    }
    if (envio.ok) {
      setPendiente(null)
      avisarExito(`Fase «${nombre}» creada.`)
      alCerrar()
      return true
    }
    if ('sinRed' in envio) {
      setPendiente((antes) => antes ?? { desde: Date.now() })
      return false
    }
    setPendiente(null)
    if (envio.error.codigo === 'conflicto') {
      setConflicto(envio.error.mensaje)
      return false
    }
    const dicho = errorDeEnvio(envio.porCampo, envio.error.mensaje)
    setErrores(dicho.errores)
    setAviso(dicho.aviso)
    return false
  }

  const enLinea = useReintentoAlVolver(abierto ? pendiente : null, () => enviar())

  return {
    valores,
    errores,
    aviso,
    conflicto,
    enCurso: lista.enCurso,
    enLinea,
    esperandoConexion: pendiente !== null,
    // Cerrar ahora perdería lo escrito: el modal pregunta antes.
    hayCambios: JSON.stringify(valores) !== JSON.stringify(VALORES_DE_FASE_NUEVA),
    recargando,
    escribir,
    enviar,
    reintentar: () => {
      void enviar()
    },
    recargar,
  }
}
