'use client'

import { useEffect, useId, useState } from 'react'
import { Button } from '@/shared/ui/button'
import { Campo } from '@/shared/ui/campo'
import { CampoSeleccion } from '@/shared/ui/campo-seleccion'
import type { Grupo } from '../../../../entities/formula'
import type {
  CambiosDelGrupo,
  CampoDelGrupo,
  ErrorDelGrupo,
  OpcionDeBucket,
} from '../../../../entities/formula/grupos'
import type { EstadoDeLosTonos } from '../../hooks/use-tonos'

type Props = {
  grupo: Grupo
  // Los ids de sus filas al abrir.
  miembros: readonly string[]
  errores: readonly ErrorDelGrupo[]
  tonos: EstadoDeLosTonos
  buckets: readonly OpcionDeBucket[]
  // El diseño de la versión leída tiene modos de tipo de cambio: la hoja usa los del modo.
  conModos: boolean
  alAplicar: (cambios: CambiosDelGrupo, tonos: ReadonlySet<string>) => void
  alCancelar: () => void
  alReintentarTonos: () => void
}

const ORDEN: CampoDelGrupo[] = ['etiqueta', 'plazo', 'tono', 'bucket', 'miembros']

function opcionesDeTono(tonos: EstadoDeLosTonos, actual: string) {
  if (tonos.tipo === 'leyendo') return [{ valor: actual, etiqueta: 'Cargando los tonos…' }]
  if (tonos.tipo === 'error') return [{ valor: actual, etiqueta: actual }]
  const opciones = tonos.tonos.map((t) => ({ valor: t.clave, etiqueta: t.nombre }))
  // Un tono que ya no está en el catálogo se ve por su clave y no deja aplicar hasta elegir otro.
  return tonos.claves.has(actual) ? opciones : [{ valor: actual, etiqueta: actual }, ...opciones]
}

function EstadoDeLosTonosDelFormulario({
  tonos,
  alReintentar,
}: {
  tonos: EstadoDeLosTonos
  alReintentar: () => void
}) {
  if (tonos.tipo === 'listo') return null
  if (tonos.tipo === 'leyendo') {
    return (
      <p className="text-(length:--text-sm) text-(--color-ink-soft)">
        Esperando los tonos de la empresa.
      </p>
    )
  }
  return (
    <div className="flex flex-wrap items-center gap-2 text-(length:--text-sm) text-(--color-peligro-ink)">
      <p role="alert">No se pudieron leer los tonos de la empresa.</p>
      <Button
        type="button"
        variant="outline"
        className="min-h-11 md:min-h-9"
        onClick={alReintentar}
      >
        Reintentar
      </Button>
    </div>
  )
}

function SelectoresDelGrupo(p: {
  uid: string
  tono: string
  bucket: string
  tonos: EstadoDeLosTonos
  buckets: readonly OpcionDeBucket[]
  conModos: boolean
  deError: (campo: CampoDelGrupo) => string | undefined
  alCambiarTono: (tono: string) => void
  alCambiarBucket: (bucket: string) => void
}) {
  return (
    <>
      <CampoSeleccion
        nombre={`${p.uid}-tono`}
        etiqueta="Tono"
        opciones={opcionesDeTono(p.tonos, p.tono)}
        value={p.tono}
        disabled={p.tonos.tipo !== 'listo'}
        error={p.deError('tono')}
        ayuda="La tarjeta usa el tono que elija su plantilla, si elige uno."
        onChange={(evento) => {
          p.alCambiarTono(evento.target.value)
        }}
      />
      <CampoSeleccion
        nombre={`${p.uid}-bucket`}
        etiqueta="Tipo de cambio"
        opciones={p.buckets.map((b) => ({
          valor: b.bucket,
          etiqueta: `${b.bucket} · ${b.etiqueta}${b.clave === null ? '' : ` (${b.clave})`}`,
        }))}
        value={p.bucket}
        error={p.deError('bucket')}
        ayuda={
          p.conModos ? 'En la hoja, cada modo elige el tipo de cambio de cada bucket.' : undefined
        }
        onChange={(evento) => {
          p.alCambiarBucket(evento.target.value)
        }}
      />
    </>
  )
}

function BotonesDelGrupo(p: { listo: boolean; alAplicar: () => void; alCancelar: () => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      <Button
        type="button"
        className="min-h-11 md:min-h-9"
        disabled={!p.listo}
        onClick={p.alAplicar}
      >
        Aplicar
      </Button>
      <Button
        type="button"
        variant="outline"
        className="min-h-11 md:min-h-9"
        onClick={p.alCancelar}
      >
        Cancelar
      </Button>
    </div>
  )
}

// El formulario «Grupo <etiqueta>» de la sección «Grupos» (4.21-3c, C2 y C3): etiqueta, plazo de pago, tono y tipo de cambio, sin campo de id. «Aplicar» o Ctrl/Cmd+Enter
// aplican; «Cancelar» o Esc cierran sin cambiar nada; un error queda junto a su campo, con lo escrito y el foco en el primero. Sin el catálogo leído, «Aplicar» espera.
export function FormularioDelGrupo(props: Props) {
  const { grupo, miembros, errores, tonos, buckets, conModos, alCancelar } = props
  const uid = useId()
  const [etiqueta, setEtiqueta] = useState(grupo.etiqueta)
  const [plazo, setPlazo] = useState(grupo.plazo ?? '')
  const [tono, setTono] = useState(grupo.tono)
  const [bucket, setBucket] = useState(grupo.bucket)
  const campoId = (campo: CampoDelGrupo) => `${uid}-${campo}`
  const deError = (campo: CampoDelGrupo) => errores.find((e) => e.campo === campo)?.mensaje

  // Al abrir el foco va a la etiqueta; con errores nuevos, al primero.
  useEffect(() => {
    const primero = ORDEN.find((c) => errores.some((e) => e.campo === c)) ?? 'etiqueta'
    document.getElementById(`${uid}-${primero}`)?.focus()
  }, [uid, errores])

  const listo = tonos.tipo === 'listo'
  const aplicar = () => {
    if (tonos.tipo !== 'listo') return
    props.alAplicar({ etiqueta, plazo, tono, bucket, miembros }, tonos.claves)
  }

  return (
    <div
      role="group"
      aria-label={`Grupo ${grupo.etiqueta}`}
      className="grid min-w-0 gap-3 rounded-(--radius-md) border border-(--color-line) p-3"
      onKeyDown={(evento) => {
        if (evento.key === 'Escape') {
          evento.preventDefault()
          alCancelar()
        } else if (evento.key === 'Enter' && (evento.ctrlKey || evento.metaKey)) {
          evento.preventDefault()
          aplicar()
        }
      }}
    >
      <p className="font-semibold text-(--color-ink)">Grupo {grupo.etiqueta}</p>
      {deError('grupo') ? (
        <p role="alert" className="text-(length:--text-sm) text-(--color-peligro-ink)">
          {deError('grupo')}
        </p>
      ) : null}
      <Campo
        nombre={campoId('etiqueta')}
        etiqueta="Etiqueta"
        value={etiqueta}
        error={deError('etiqueta')}
        onChange={(evento) => {
          setEtiqueta(evento.target.value)
        }}
      />
      <Campo
        nombre={campoId('plazo')}
        etiqueta="Plazo de pago"
        placeholder="2 días"
        value={plazo}
        error={deError('plazo')}
        ayuda="Opcional."
        onChange={(evento) => {
          setPlazo(evento.target.value)
        }}
      />
      <SelectoresDelGrupo
        uid={uid}
        tono={tono}
        bucket={bucket}
        tonos={tonos}
        buckets={buckets}
        conModos={conModos}
        deError={deError}
        alCambiarTono={setTono}
        alCambiarBucket={setBucket}
      />
      <EstadoDeLosTonosDelFormulario tonos={tonos} alReintentar={props.alReintentarTonos} />
      <BotonesDelGrupo listo={listo} alAplicar={aplicar} alCancelar={alCancelar} />
    </div>
  )
}
