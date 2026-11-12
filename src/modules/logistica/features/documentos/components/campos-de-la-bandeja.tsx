'use client'

import { Campo } from '@/shared/ui/campo'
import { CampoSeleccion } from '@/shared/ui/campo-seleccion'
import {
  camposDeFechasDelTipo,
  formatosLegibles,
  TOPE_DE_LA_NOTA,
} from '../../../entities/documentos/admision'
import type { TipoDeDocumento } from '../../../entities/documentos/documento'
import type { ValoresDeLaBandeja } from '../hooks/use-bandeja'

type Props = {
  // Los tipos para elegir, con los que pide una fase primero.
  tipos: readonly TipoDeDocumento[]
  tipo: TipoDeDocumento | null
  valores: ValoresDeLaBandeja
  errores: Readonly<Record<string, string>>
  deshabilitado: boolean
  escribir: (cambios: Partial<ValoresDeLaBandeja>) => void
}

// El tipo, uno para todo lo de la bandeja: va primero porque de él depende lo que se puede elegir. Los formatos que admite salen del tipo, de la base.
export function CampoDelTipo({ tipos, tipo, valores, errores, deshabilitado, escribir }: Props) {
  return (
    <CampoSeleccion
      nombre="documento-tipo"
      etiqueta="Tipo de documento"
      opciones={[
        { valor: '', etiqueta: tipos.length === 0 ? 'Sin tipos de documento' : 'Elige el tipo' },
        ...tipos.map((t) => ({ valor: t.id, etiqueta: t.nombre })),
      ]}
      value={valores.tipoId}
      onChange={(evento) => {
        escribir({ tipoId: evento.target.value })
      }}
      ayuda={tipo ? `Admite ${formatosLegibles(tipo.formatos)}.` : undefined}
      error={errores['tipo']}
      disabled={deshabilitado}
    />
  )
}

// Según el modo de vencimiento del tipo, sus fechas: «Vence el» es obligatorio con `solicitar`, opcional con `renovar` (la base la calcula) y no se pregunta con `ninguno`; y una nota.
export function CamposDeFechasYNota({ tipo, valores, errores, deshabilitado, escribir }: Props) {
  const fechas = camposDeFechasDelTipo(tipo)
  return (
    <div className="grid gap-3">
      {fechas.emitido || fechas.vence !== 'oculto' ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {fechas.emitido ? (
            <Campo
              nombre="documento-emitido"
              etiqueta="Emitido el"
              type="date"
              value={valores.emitidoEl}
              onChange={(evento) => {
                escribir({ emitidoEl: evento.target.value })
              }}
              error={errores['emitidoEl']}
              disabled={deshabilitado}
            />
          ) : null}
          {fechas.vence !== 'oculto' ? (
            <Campo
              nombre="documento-vence"
              etiqueta={fechas.vence === 'obligatorio' ? 'Vence el' : 'Vence el (opcional)'}
              type="date"
              value={valores.venceEl}
              onChange={(evento) => {
                escribir({ venceEl: evento.target.value })
              }}
              ayuda={
                fechas.vence === 'opcional' && tipo?.vigenciaDias
                  ? `Si lo dejas vacío, vence ${tipo.vigenciaDias} días después de la emisión.`
                  : undefined
              }
              error={errores['venceEl']}
              disabled={deshabilitado}
            />
          ) : null}
        </div>
      ) : null}
      <Campo
        nombre="documento-nota"
        etiqueta="Nota (opcional)"
        autoComplete="off"
        maxLength={TOPE_DE_LA_NOTA}
        value={valores.nota}
        onChange={(evento) => {
          escribir({ nota: evento.target.value })
        }}
        error={errores['nota']}
        disabled={deshabilitado}
      />
    </div>
  )
}
