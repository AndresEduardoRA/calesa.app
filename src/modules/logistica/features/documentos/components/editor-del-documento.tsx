'use client'

import { useState } from 'react'
import { Aviso } from '@/shared/ui/aviso'
import { AvisoDeConflicto } from '@/shared/ui/aviso-de-conflicto'
import { Button } from '@/shared/ui/button'
import { Campo } from '@/shared/ui/campo'
import { camposDeFechasDelTipo, TOPE_DE_LA_NOTA } from '../../../entities/documentos/admision'
import type { DocumentoDeLaUnidad, TipoDeDocumento } from '../../../entities/documentos/documento'
import { cambiosDeLaEdicion, quePuedeHacer } from '../../../entities/documentos/revision'
import { useEditarElDocumento } from '../hooks/use-editar-el-documento'
import type { ContextoDeLaFila } from './contexto-de-la-fila'

type Props = {
  documento: DocumentoDeLaUnidad
  tipo: TipoDeDocumento | null
  contexto: ContextoDeLaFila
}
type Valores = { emitidoEl: string; venceEl: string; nota: string }

const valoresDe = (d: DocumentoDeLaUnidad): Valores => ({
  emitidoEl: d.emitidoEl ?? '',
  venceEl: d.venceEl ?? '',
  nota: d.nota ?? '',
})

function BotonEditar({ documento, tipo, contexto, alAbrir }: Props & { alAbrir: () => void }) {
  const puede = quePuedeHacer(documento, tipo, contexto.claves).editar
  const motivo = puede.tipo === 'apagada' ? puede.motivo : null
  const idMotivo = `editar-${documento.id}-motivo`
  return (
    <div className="grid gap-1">
      <div>
        <Button
          variant="outline"
          className="min-h-11 md:min-h-9"
          disabled={puede.tipo !== 'habilitada'}
          aria-describedby={motivo ? idMotivo : undefined}
          onClick={alAbrir}
        >
          Editar
        </Button>
      </div>
      {motivo ? (
        <p id={idMotivo} className="text-(length:--text-sm) text-(--color-ink-soft)">
          {motivo}
        </p>
      ) : null}
    </div>
  )
}

function CamposDeFechas({
  prefijo,
  tipo,
  valores,
  escribir,
  porCampo,
  enCurso,
}: {
  prefijo: string
  tipo: TipoDeDocumento | null
  valores: Valores
  escribir: (parte: Partial<Valores>) => void
  porCampo: Record<string, string>
  enCurso: boolean
}) {
  const fechas = camposDeFechasDelTipo(tipo)
  if (!fechas.emitido && fechas.vence === 'oculto') return null
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {fechas.emitido ? (
        <Campo
          nombre={`${prefijo}-emitido`}
          etiqueta="Emitido el"
          type="date"
          value={valores.emitidoEl}
          onChange={(e) => {
            escribir({ emitidoEl: e.target.value })
          }}
          error={porCampo['emitidoEl']}
          disabled={enCurso}
        />
      ) : null}
      {fechas.vence !== 'oculto' ? (
        <Campo
          nombre={`${prefijo}-vence`}
          etiqueta={fechas.vence === 'obligatorio' ? 'Vence el' : 'Vence el (opcional)'}
          type="date"
          value={valores.venceEl}
          onChange={(e) => {
            escribir({ venceEl: e.target.value })
          }}
          error={porCampo['venceEl']}
          disabled={enCurso}
        />
      ) : null}
    </div>
  )
}

function FormularioDeEdicion({
  documento,
  tipo,
  contexto,
  alCerrar,
}: Props & { alCerrar: () => void }) {
  const { editar, enCurso, error, porCampo, conflicto } = useEditarElDocumento(
    contexto.unidadId,
    documento,
  )
  const [valores, setValores] = useState<Valores>(() => valoresDe(documento))
  const cambios = cambiosDeLaEdicion(valoresDe(documento), valores)
  const prefijo = `editar-${documento.id}`

  async function guardar() {
    if (cambios === null) return
    if (await editar(cambios, 'Documento actualizado.')) alCerrar()
  }

  return (
    <div className="grid gap-2" data-editor-del-documento>
      <CamposDeFechas
        prefijo={prefijo}
        tipo={tipo}
        valores={valores}
        escribir={(parte) => {
          setValores({ ...valores, ...parte })
        }}
        porCampo={porCampo}
        enCurso={enCurso}
      />
      <Campo
        nombre={`${prefijo}-nota`}
        etiqueta="Nota (opcional)"
        autoComplete="off"
        maxLength={TOPE_DE_LA_NOTA}
        value={valores.nota}
        onChange={(e) => {
          setValores({ ...valores, nota: e.target.value })
        }}
        error={porCampo['nota']}
        disabled={enCurso}
      />
      {conflicto ? (
        <AvisoDeConflicto
          mensaje={conflicto}
          alRecargar={contexto.releer}
          detalle="No se guardó nada. Recargar trae la versión nueva y conserva lo que escribiste."
        />
      ) : null}
      {error ? (
        <Aviso tono="peligro">
          <p>{error}</p>
        </Aviso>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button
          className="min-h-11 md:min-h-9"
          disabled={cambios === null || enCurso}
          onClick={() => void guardar()}
        >
          Guardar
        </Button>
        <Button
          variant="outline"
          className="min-h-11 md:min-h-9"
          disabled={enCurso}
          onClick={alCerrar}
        >
          Cancelar
        </Button>
      </div>
    </div>
  )
}

// «Editar» las fechas y la nota de un documento (D24): un formulario dentro de la fila, sin panel. «Guardar» manda sólo lo que cambió y está apagado si nada cambió. Si la base rechaza un
// campo, lo dice junto a él. Un `PT409` se dice aquí y conserva lo escrito.
export function EditorDelDocumento(props: Props) {
  const [abierto, setAbierto] = useState(false)
  return abierto ? (
    <FormularioDeEdicion
      {...props}
      alCerrar={() => {
        setAbierto(false)
      }}
    />
  ) : (
    <BotonEditar
      {...props}
      alAbrir={() => {
        setAbierto(true)
      }}
    />
  )
}
