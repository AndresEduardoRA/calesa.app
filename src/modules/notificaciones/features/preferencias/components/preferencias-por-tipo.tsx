'use client'

import { useAction } from 'next-safe-action/hooks'
import { useState } from 'react'
import { conRed, resultadoDeAccion } from '@/shared/lib/formularios'
import { Interruptor } from '@/shared/ui/interruptor'
import { avisarError } from '@/shared/ui/toasts'
import { AVISO_DE_PREFERENCIAS } from '../../../entities/motivos'
import { estaEncendido, type ApagadosDePush } from '../../../entities/preferencia-de-push'
import { TIPOS_DE_NOTIFICACION } from '../../../entities/tipos'
import { guardarPreferenciaDePush } from '../actions/guardar-preferencia-de-push'

type Props = {
  apagadosIniciales: ApagadosDePush
  // Sin `notificaciones.push` quedan a la vista, deshabilitados, con el motivo.
  motivoSiNoPuede: string | null
}

const TIPOS = Object.entries(TIPOS_DE_NOTIFICACION)

// Un interruptor de push por tipo del catálogo. Cambia al instante y, si la base no lo guarda, vuelve atrás con un aviso.
// Lo que aquí se apaga sólo detiene el push: la campana sigue mostrándolo todo.
export function PreferenciasPorTipo({ apagadosIniciales, motivoSiNoPuede }: Props) {
  const [apagados, setApagados] = useState<ApagadosDePush>(apagadosIniciales)
  const [guardando, setGuardando] = useState<ReadonlySet<string>>(new Set())
  const { executeAsync } = useAction(guardarPreferenciaDePush)

  const cambiar = async (tipo: string, encendido: boolean) => {
    const antes = apagados
    setApagados(encendido ? omitir(antes, tipo) : { ...antes, [tipo]: false })
    setGuardando((actual) => new Set(actual).add(tipo))
    const resultado = resultadoDeAccion(await conRed(executeAsync({ tipo, encendido })))
    if (!resultado.ok) {
      setApagados(antes)
      avisarError(resultado.error)
    }
    setGuardando((actual) => {
      const resto = new Set(actual)
      resto.delete(tipo)
      return resto
    })
  }

  return (
    <section aria-labelledby="avisos-por-tipo" className="grid gap-3">
      <div className="grid gap-0.5">
        <h3 id="avisos-por-tipo" className="text-(length:--text-sm) font-medium text-(--color-ink)">
          Avisos por tipo
        </h3>
        <p className="text-(length:--text-sm) text-(--color-ink-faint)">{AVISO_DE_PREFERENCIAS}</p>
      </div>
      {TIPOS.map(([tipo, { etiqueta, descripcion }]) => (
        <Interruptor
          key={tipo}
          titulo={etiqueta}
          ayuda={motivoSiNoPuede ?? descripcion}
          valor={estaEncendido(apagados, tipo)}
          alCambiar={(encendido) => void cambiar(tipo, encendido)}
          deshabilitado={motivoSiNoPuede !== null || guardando.has(tipo)}
        />
      ))}
    </section>
  )
}

function omitir(apagados: ApagadosDePush, tipo: string): ApagadosDePush {
  return Object.fromEntries(
    Object.entries(apagados).filter(([clave]) => clave !== tipo),
  ) as ApagadosDePush
}
