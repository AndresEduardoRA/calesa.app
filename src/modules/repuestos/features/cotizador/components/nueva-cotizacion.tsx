'use client'

import type { Route } from 'next'
import Link from 'next/link'
import { RUTAS } from '@/shared/lib/rutas'
import { Button, buttonVariants } from '@/shared/ui/button'
import { CampoSeleccion } from '@/shared/ui/campo-seleccion'
import { useRegional } from '@/shared/ui/regional'
import { useNuevaCotizacion } from '../hooks/use-nueva-cotizacion'

export type MonedaParaCotizar = { codigo: string; nombre: string }

type Props = {
  proyectoId: string
  // Las monedas activas que ya leyó la página.
  monedas: readonly MonedaParaCotizar[]
  cerrado: boolean
  // Lo calcula el servidor con `puede(…, 'repuestos.configurar')`: sólo entonces se ofrece ir a la configuración.
  puedeConfigurar: boolean
}

const ID_DEL_MOTIVO = 'cotizaciones-motivo-apagado'
const CONFIGURACION_DEL_COTIZADOR = `${RUTAS.configuracionDeRepuestos}?seccion=cotizador`

// Lo que apaga el botón antes de preguntarle a la base (que decide igual, D33).
function motivoParaNoCrear(cerrado: boolean, monedas: readonly MonedaParaCotizar[]) {
  if (cerrado) return 'El proyecto está cerrado: reábrelo para cotizar.'
  if (monedas.length === 0) return 'No hay monedas activas.'
  return null
}

// El rechazo de la base, con el enlace a la configuración si falta y quien mira puede publicarla (D34).
function RechazoAlCrear({
  mensaje,
  conEnlace,
}: {
  mensaje: string | undefined
  conEnlace: boolean
}) {
  if (!mensaje) return null
  return (
    <div role="alert" className="grid justify-items-start gap-2">
      <p className="text-(length:--text-sm) text-(--color-peligro-ink)">{mensaje}</p>
      {conEnlace ? (
        <Link
          href={CONFIGURACION_DEL_COTIZADOR as Route}
          className={buttonVariants({ variant: 'outline', size: 'sm' })}
        >
          Ir a la configuración del cotizador
        </Link>
      ) : null}
    </div>
  )
}

function monedaInicial(monedas: readonly MonedaParaCotizar[], monedaBase: string) {
  return monedas.some((m) => m.codigo === monedaBase) ? monedaBase : (monedas[0]?.codigo ?? '')
}

// La barra de «Nueva cotización» (8.12-3, C10, D31): la moneda (sólo si hay más de una activa; por omisión la base de la empresa) y el botón, en la misma
// línea, sin modal. Un rechazo se dice abajo; si falta la configuración del cotizador y quien mira puede publicarla, con el enlace (D34).
export function NuevaCotizacion({ proyectoId, monedas, cerrado, puedeConfigurar }: Props) {
  const { monedaBase } = useRegional()
  const nueva = useNuevaCotizacion({
    proyectoId,
    monedaInicial: monedaInicial(monedas, monedaBase),
  })
  const motivo = motivoParaNoCrear(cerrado, monedas)
  const conSelector = monedas.length > 1
  const sinConfiguracion = nueva.porCampo['config']
  const deLaMoneda = nueva.porCampo['moneda']
  const mensaje = nueva.aviso ?? sinConfiguracion ?? (conSelector ? undefined : deLaMoneda)
  const apagado = motivo !== null || nueva.enCurso
  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap items-end gap-x-3 gap-y-2">
        {conSelector ? (
          <div className="w-full max-w-60">
            <CampoSeleccion
              nombre="cotizacion-moneda"
              etiqueta="Moneda"
              opciones={monedas.map((m) => ({
                valor: m.codigo,
                etiqueta: `${m.codigo} · ${m.nombre}`,
              }))}
              value={nueva.moneda}
              onChange={(evento) => {
                nueva.elegirMoneda(evento.target.value)
              }}
              disabled={apagado}
              error={deLaMoneda}
            />
          </div>
        ) : null}
        <Button
          disabled={apagado}
          aria-describedby={motivo ? ID_DEL_MOTIVO : undefined}
          onClick={() => void nueva.crear()}
        >
          Nueva cotización
        </Button>
      </div>
      {motivo ? (
        <p id={ID_DEL_MOTIVO} className="text-(length:--text-sm) text-(--color-ink-soft)">
          {motivo}
        </p>
      ) : null}
      <RechazoAlCrear
        mensaje={mensaje}
        conEnlace={sinConfiguracion !== undefined && puedeConfigurar}
      />
    </div>
  )
}
