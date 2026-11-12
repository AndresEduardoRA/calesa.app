'use client'

import { Bloque } from '@/shared/ui/bloque'
import { avisoDeOtraInicial, otraFaseInicial } from '../../../entities/fases/reglas-de-fase'
import type { FaseParaConfigurar } from '../../../entities/flujo'
import { InterruptorConMotivo } from './interruptor-con-motivo'
import type { PropsDeBloque } from './props-de-bloque'

type Props = PropsDeBloque & { fase: FaseParaConfigurar; fases: readonly FaseParaConfigurar[] }

// «En el flujo»: dónde está la fase en el camino. Marcar «Es inicial» no desmarca la otra inicial: sólo se avisa (D6).
export function BloqueEnElFlujo({
  valores,
  errores,
  escribir,
  deshabilitado,
  conError,
  contexto,
  fase,
  fases,
}: Props) {
  const otraInicial = valores.esInicial ? otraFaseInicial(fases, fase.id) : null
  const comun = { deshabilitado }
  return (
    <Bloque titulo="En el flujo" plegado forzarAbierto={conError}>
      <InterruptorConMotivo
        {...comun}
        campo="es_inicial"
        titulo="Es inicial"
        ayuda="Donde puede nacer una unidad."
        valor={valores.esInicial}
        alCambiar={(esInicial) => {
          escribir({ esInicial }, 'es_inicial')
        }}
        error={errores.es_inicial}
        aviso={otraInicial === null ? null : avisoDeOtraInicial(otraInicial)}
      />
      <InterruptorConMotivo
        {...comun}
        campo="es_final"
        titulo="Es final"
        ayuda="Donde termina el camino."
        valor={valores.esFinal}
        alCambiar={(esFinal) => {
          escribir({ esFinal }, 'es_final')
        }}
        error={errores.es_final}
      />
      <InterruptorConMotivo
        {...comun}
        campo="nota_obligatoria"
        titulo="Pide nota al entrar"
        ayuda="Quien mueve una unidad a esta fase escribe una nota."
        valor={valores.notaObligatoria}
        alCambiar={(notaObligatoria) => {
          escribir({ notaObligatoria }, 'nota_obligatoria')
        }}
        error={errores.nota_obligatoria}
      />
      <InterruptorConMotivo
        {...comun}
        campo="es_logistica"
        titulo="Es logística"
        ayuda="La fase cuenta como parte del transporte."
        valor={valores.esLogistica}
        alCambiar={(esLogistica) => {
          escribir({ esLogistica }, 'es_logistica')
        }}
        regla={{ campo: 'es_logistica', contexto }}
        error={errores.es_logistica}
      />
    </Bloque>
  )
}
