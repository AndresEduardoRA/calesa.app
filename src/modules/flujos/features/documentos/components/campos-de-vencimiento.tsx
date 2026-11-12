'use client'

import { Campo } from '@/shared/ui/campo'
import { CampoSeleccion } from '@/shared/ui/campo-seleccion'
import {
  DIAS_MAXIMOS,
  MODOS_DE_VENCIMIENTO,
  TEXTO_DE_MODO,
  type ModoDeVencimiento,
} from '../../../entities/documentos/tipo-de-documento'
import type { BorradorDeTipo } from '../../../entities/documentos/formulario-de-tipo'

type Props = {
  valores: BorradorDeTipo
  errores: Record<string, string>
  alElegirModo: (modo: ModoDeVencimiento) => void
  alEscribir: (cambios: Partial<BorradorDeTipo>, campo: string) => void
}

const OPCIONES = MODOS_DE_VENCIMIENTO.map((modo) => ({
  valor: modo,
  etiqueta: TEXTO_DE_MODO[modo],
}))

function esModo(valor: string): valor is ModoDeVencimiento {
  return MODOS_DE_VENCIMIENTO.some((modo) => modo === valor)
}

// El vencimiento de un tipo: cómo vence y, según el modo, los días de vigencia (sólo «renovar») y de aviso (con vencimiento). Los días que el modo no
// usa no se dibujan: cambiar de modo los vacía (`borradorConModo`), así lo escrito no se queda oculto.
export function CamposDeVencimiento({ valores, errores, alElegirModo, alEscribir }: Props) {
  return (
    <>
      <CampoSeleccion
        nombre="modo_vencimiento"
        etiqueta="Vencimiento"
        opciones={OPCIONES}
        value={valores.modo}
        error={errores['modo_vencimiento']}
        onChange={(evento) => {
          if (esModo(evento.target.value)) {
            alElegirModo(evento.target.value)
          }
        }}
      />
      {valores.modo === 'renovar' ? (
        <Campo
          nombre="vigencia_dias"
          etiqueta="Días de vigencia"
          inputMode="numeric"
          autoComplete="off"
          value={valores.vigenciaDias}
          error={errores['vigencia_dias']}
          ayuda={`Cuántos días después de subido deja de valer, de 1 a ${String(DIAS_MAXIMOS)}.`}
          onChange={(evento) => {
            alEscribir({ vigenciaDias: evento.target.value }, 'vigencia_dias')
          }}
        />
      ) : null}
      {valores.modo === 'ninguno' ? null : (
        <Campo
          nombre="aviso_dias"
          etiqueta="Días de aviso (opcional)"
          inputMode="numeric"
          autoComplete="off"
          value={valores.avisoDias}
          error={errores['aviso_dias']}
          ayuda="Cuántos días antes de que venza se avisa. Vacío: no avisa."
          onChange={(evento) => {
            alEscribir({ avisoDias: evento.target.value }, 'aviso_dias')
          }}
        />
      )}
    </>
  )
}
