'use client'

import { useRouter } from 'next/navigation'
import { Aviso } from '@/shared/ui/aviso'
import { AvisoDeConflicto } from '@/shared/ui/aviso-de-conflicto'
import { Button } from '@/shared/ui/button'
import { Campo } from '@/shared/ui/campo'
import { EstadoVacio } from '@/shared/ui/estados/estado-vacio'
import type { ConfiguracionDelCotizador } from '../../../entities/cotizador/filas-de-configuracion'
import { useFormulaVigente } from '../hooks/use-formula-vigente'

type Props = { vigente: ConfiguracionDelCotizador | null }

// El bloque «Fórmula» de Configuración › Repuestos › «Cotizador» (8.12-2, C8): la configuración vigente, editable, y «Publicar cambios», que agrega una
// nueva. Quien lo monta le da `key` = id de la vigente. Las cotizaciones que ya existen guardan su snapshot y no cambian.
export function FormulaVigente({ vigente }: Props) {
  const f = useFormulaVigente(vigente)
  const router = useRouter()
  return (
    <form
      className="grid gap-4"
      noValidate
      onSubmit={(evento) => {
        evento.preventDefault()
        void f.publicar()
      }}
    >
      {vigente ? null : (
        <EstadoVacio
          compacto
          titulo="Todavía no hay configuración: publícala para poder cotizar repuestos."
        />
      )}
      {f.aviso?.codigo === 'conflicto' ? (
        <AvisoDeConflicto
          mensaje={f.aviso.mensaje}
          alRecargar={() => {
            router.refresh()
          }}
        />
      ) : f.aviso ? (
        <Aviso tono="peligro">{f.aviso.mensaje}</Aviso>
      ) : null}
      <fieldset className="grid gap-4 md:grid-cols-3" disabled={f.enCurso}>
        <Campo
          nombre="cotizador-factor"
          etiqueta="Factor de importado"
          inputMode="decimal"
          autoComplete="off"
          value={f.valores.factor}
          onChange={(evento) => {
            f.escribir({ factor: evento.target.value })
          }}
          error={f.errores['factor']}
          ayuda="El costo importado se multiplica por este factor."
        />
        <Campo
          nombre="cotizador-recargo"
          etiqueta="Recargo local (%)"
          inputMode="decimal"
          autoComplete="off"
          value={f.valores.recargo}
          onChange={(evento) => {
            f.escribir({ recargo: evento.target.value })
          }}
          error={f.errores['recargo']}
          ayuda="Lo que se suma a una pieza comprada en el país."
        />
        <Campo
          nombre="cotizador-redondeo"
          etiqueta="Redondeo"
          inputMode="decimal"
          autoComplete="off"
          value={f.valores.redondeo}
          onChange={(evento) => {
            f.escribir({ redondeo: evento.target.value })
          }}
          error={f.errores['redondeo']}
          ayuda="El precio por unidad se redondea al múltiplo más cercano de este monto."
        />
      </fieldset>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" className="h-11 md:h-9" disabled={f.sinCambios || f.enCurso}>
          {f.enCurso ? 'Publicando…' : 'Publicar cambios'}
        </Button>
        <p className="text-(length:--text-sm) text-(--color-ink-muted)">
          Las cotizaciones que ya existen no cambian.
        </p>
      </div>
    </form>
  )
}
