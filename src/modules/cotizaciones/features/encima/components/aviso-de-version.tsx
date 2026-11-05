'use client'

import type { Route } from 'next'
import Link from 'next/link'
import { Button } from '@/shared/ui/button'
import { avisoDeVersion } from '../../../entities/aviso-de-version'
import type { HojaDeUnaGuardada } from '../../../entities/hoja-de-una-guardada'
import { textoDeEncima, type ResultadoDeEncima } from '../../../entities/resultado-de-encima'
import { rutaDeLaCotizacion } from '../../../entities/ruta-de-la-hoja'
import { useCotizarEncima } from '../hooks/use-cotizar-encima'

const CON_CAMBIOS =
  'Guarda o descarta tus cambios antes de cotizar encima: la versión nueva lleva lo guardado.'

type Props = {
  hoja: HojaDeUnaGuardada
  // Lo tipeado y sin guardar, o un guardado pendiente: la versión nueva lleva lo guardado, así que esperan (P1 a).
  hayCambios: boolean
}

// El aviso de una guardada que usa otra versión de la fórmula que la de hoy o ya venció (4.15-3b, P7), con «Cotizar encima» si la base dice que quien mira puede
// (`puede_cotizar_encima`: no hay otra versión nueva y tiene con qué). El aviso lo ve todo el que abre la página; el botón, sólo quien puede. Sin nada que decir, no dibuja nada.
export function AvisoDeVersion({ hoja, hayCambios }: Props) {
  const lineas = avisoDeVersion(hoja)
  const encima = useCotizarEncima({ anterior: hoja.cotizacion.id })
  if (lineas.length === 0) {
    return null
  }
  return (
    <div
      role="status"
      data-aviso-de-version=""
      className="grid min-w-0 gap-2 rounded-(--radius-md) border border-(--color-border) bg-(--color-surface) p-3 text-(length:--text-sm) [overflow-wrap:anywhere] text-(--color-ink)"
    >
      {lineas.map((linea) => (
        <p key={linea}>{linea}</p>
      ))}
      {hoja.cadena.puedeCotizarEncima ? (
        <div className="grid justify-items-start gap-2">
          <Button
            type="button"
            variant="outline"
            className="min-h-11 md:min-h-9"
            aria-disabled={hayCambios || encima.enviando ? true : undefined}
            onClick={() => {
              if (!hayCambios) {
                void encima.cotizar()
              }
            }}
          >
            {encima.enviando ? 'Cotizando…' : 'Cotizar encima'}
          </Button>
          {hayCambios ? <p className="text-(--color-ink-soft)">{CON_CAMBIOS}</p> : null}
          <Respuesta
            resultado={encima.resultado}
            hayCambios={hayCambios}
            alReintentar={() => void encima.cotizar()}
            alRecargar={encima.recargar}
          />
        </div>
      ) : null}
    </div>
  )
}

// Lo que dijo la base cuando no entró, con su salida: abrir la nueva que ya hay, reintentar o recargar la página.
function Respuesta({
  resultado,
  hayCambios,
  alReintentar,
  alRecargar,
}: {
  resultado: ResultadoDeEncima | null
  hayCambios: boolean
  alReintentar: () => void
  alRecargar: () => void
}) {
  const texto = resultado === null ? null : textoDeEncima(resultado)
  if (resultado === null || texto === null) {
    return null
  }
  return (
    <div role="alert" className="grid justify-items-start gap-2">
      <p>{texto}</p>
      {resultado.tipo === 'ya_tiene' && resultado.id !== null ? (
        <Link
          href={rutaDeLaCotizacion(resultado.id) as Route}
          className="underline underline-offset-2"
        >
          Abrir la versión nueva
        </Link>
      ) : null}
      {resultado.tipo === 'reintentar' || resultado.tipo === 'perdida' ? (
        <Button
          type="button"
          variant="outline"
          className="min-h-11 md:min-h-9"
          aria-disabled={hayCambios ? true : undefined}
          onClick={() => {
            if (!hayCambios) {
              alReintentar()
            }
          }}
        >
          Reintentar
        </Button>
      ) : null}
      {resultado.tipo === 'recargar' ||
      resultado.tipo === 'sin_acceso' ||
      resultado.tipo === 'otro' ? (
        <Button
          type="button"
          variant="outline"
          className="min-h-11 md:min-h-9"
          onClick={alRecargar}
        >
          Recargar
        </Button>
      ) : null}
    </div>
  )
}
