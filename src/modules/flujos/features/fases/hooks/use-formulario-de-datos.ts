'use client'

import { useState } from 'react'
import { avisar, avisarExito } from '@/shared/ui/toasts'
import { useReintentoAlVolver } from '@/shared/ui/use-reintento-al-volver'
import {
  MENSAJE_NADA_QUE_GUARDAR_DE_FASE,
  cambiosParaGuardar,
} from '../../../entities/fases/formulario-de-fase'
import {
  contextoDelFlujo,
  esCampoDeFase,
  validarFase,
  type ErroresDeFase,
} from '../../../entities/fases/reglas-de-fase'
import type { FaseParaConfigurar, FlujoParaConfigurar } from '../../../entities/flujo'
import { useVersionDelFlujo } from '../../configuracion/hooks/use-version-del-flujo'
import { useEscrituraDeFases } from './use-escritura-de-fases'
import { usePedidosDeFases } from './use-pedidos-de-fases'
import { useValoresDeFase } from './use-valores-de-fase'

type Args = { flujo: FlujoParaConfigurar; fase: FaseParaConfigurar }

// El estado del formulario de «Datos» de una fase en el inspector: 17 campos, así que con borrador en `sessionStorage` (uno por fase). `enviar` valida
// con el espejo de la base (`validarFase`), manda sólo lo que cambió (`cambiosParaGuardar`) y deja el motivo junto a cada campo; el foco va al primer
// error en el orden en que se ven. Un conflicto lo dice el aviso del flujo (con «Recargar») y lo escrito queda; sin conexión, sale solo al volver.
// Tras guardar, la página trae la fase y la versión nuevas y quien monta el formulario lo reinicia con una `key`.
export function useFormularioDeDatos({ flujo, fase }: Args) {
  const { conflicto } = useVersionDelFlujo()
  const escritura = useEscrituraDeFases()
  const pedir = usePedidosDeFases(flujo)
  const campos = useValoresDeFase(fase)
  const { valores } = campos
  const [pendiente, setPendiente] = useState<{ desde: number } | null>(null)

  async function enviar(): Promise<boolean> {
    if (conflicto !== null) {
      return false
    }
    const validado = validarFase(valores, contextoDelFlujo(flujo))
    if (!validado.ok) {
      campos.mostrarErrores(validado.errores)
      return false
    }
    const cambios = cambiosParaGuardar(fase, validado.datos)
    if (cambios === null) {
      avisar(MENSAJE_NADA_QUE_GUARDAR_DE_FASE)
      return false
    }
    const envio = await escritura.mandar(() => pedir.guardar(fase.id, cambios))
    if (envio === null) {
      return false
    }
    if (envio.ok) {
      setPendiente(null)
      campos.guardado()
      avisarExito(`Fase «${validado.datos.nombre}» guardada.`)
      return true
    }
    if ('sinRed' in envio) {
      setPendiente((antes) => antes ?? { desde: Date.now() })
      return false
    }
    setPendiente(null)
    const delCampo = Object.entries(envio.porCampo ?? {}).filter(([campo]) => esCampoDeFase(campo))
    if (envio.error.codigo !== 'conflicto' && delCampo.length > 0) {
      campos.mostrarErrores(Object.fromEntries(delCampo) as ErroresDeFase)
      return false
    }
    escritura.rechazar(envio)
    return false
  }

  const enLinea = useReintentoAlVolver(pendiente, () => enviar())

  return {
    valores,
    errores: campos.errores,
    conError: campos.conError,
    enCurso: escritura.enCurso,
    enLinea,
    esperandoConexion: pendiente !== null,
    hayCambios: campos.hayCambios,
    escribir: campos.escribir,
    enviar,
    reintentar: () => {
      void enviar()
    },
    descartar: campos.descartar,
  }
}

export type FormularioDeDatos = ReturnType<typeof useFormularioDeDatos>
