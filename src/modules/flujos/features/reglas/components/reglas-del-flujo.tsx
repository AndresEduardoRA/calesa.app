'use client'

import { reglaEncendida, reglasParaMostrar } from '../../../entities/reglas/catalogo'
import type { AmbitoDeFlujo } from '../../../entities/flujo'
import type { EscrituraDeReglas } from '../hooks/use-escritura-de-reglas'
import { useReglasDelFlujo } from '../hooks/use-reglas-del-flujo'
import { FilaDeRegla } from './fila-de-regla'

type Props = {
  flujoId: string
  claveDelFlujo: string
  ambito: AmbitoDeFlujo
  reglas: readonly { regla: string; activa: boolean }[]
  sinPermiso: boolean
  escritura: EscrituraDeReglas
}

// Las reglas del flujo, una fila cada una, con su interruptor.
export function ReglasDelFlujo({
  flujoId,
  claveDelFlujo,
  ambito,
  reglas,
  sinPermiso,
  escritura,
}: Props) {
  const { enUso, cambiar } = useReglasDelFlujo(flujoId, escritura)
  return (
    <section aria-labelledby="titulo-de-reglas" className="grid gap-3">
      <h2
        id="titulo-de-reglas"
        className="text-(length:--text-lg) font-semibold text-(--color-ink)"
      >
        Reglas del flujo
      </h2>
      <ul className="grid gap-2">
        {reglasParaMostrar(ambito, reglas).map((regla) => (
          <FilaDeRegla
            key={regla.clave}
            regla={regla}
            encendida={reglaEncendida(reglas, regla.clave)}
            deshabilitada={sinPermiso || escritura.enCurso}
            impacto={enUso[regla.clave]}
            claveDelFlujo={claveDelFlujo}
            alCambiar={(activa) => void cambiar(regla, activa)}
          />
        ))}
      </ul>
    </section>
  )
}
