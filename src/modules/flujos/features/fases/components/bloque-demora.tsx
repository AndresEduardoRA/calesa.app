'use client'

import { Bloque } from '@/shared/ui/bloque'
import { Campo } from '@/shared/ui/campo'
import { ID_DE_CAMPO_DE_FASE } from '../../../entities/fases/bloques-de-fase'
import { HORAS_MAXIMAS_DE_ALERTA } from '../../../entities/fases/reglas-de-fase'
import type { PropsDeBloque } from './props-de-bloque'

// «Alerta por demora»: cuántos días puede estar una unidad en la fase antes de avisar. Vacío hereda el valor de la empresa (D8); 0 apaga la alerta.
export function BloqueDemora({
  valores,
  errores,
  escribir,
  deshabilitado,
  conError,
}: PropsDeBloque) {
  return (
    <Bloque titulo="Alerta por demora" plegado forzarAbierto={conError}>
      <Campo
        nombre={ID_DE_CAMPO_DE_FASE.demora_dias}
        etiqueta="Demora (días)"
        inputMode="numeric"
        autoComplete="off"
        disabled={deshabilitado}
        value={valores.demoraDias}
        onChange={(evento) => {
          escribir({ demoraDias: evento.target.value }, 'demora_dias')
        }}
        error={errores.demora_dias}
        ayuda="Vacío usa la demora de la empresa. 0 apaga la alerta."
      />
      <Campo
        nombre={ID_DE_CAMPO_DE_FASE.alerta_cada_horas}
        etiqueta="Repetir la alerta cada (horas)"
        inputMode="numeric"
        autoComplete="off"
        disabled={deshabilitado}
        value={valores.alertaCadaHoras}
        onChange={(evento) => {
          escribir({ alertaCadaHoras: evento.target.value }, 'alerta_cada_horas')
        }}
        error={errores.alerta_cada_horas}
        ayuda={`De 1 a ${String(HORAS_MAXIMAS_DE_ALERTA)}. Vacío repite cada 72 horas.`}
      />
    </Bloque>
  )
}
