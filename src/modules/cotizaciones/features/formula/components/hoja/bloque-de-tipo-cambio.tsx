'use client'

import { Button } from '@/shared/ui/button'
import { Campo } from '@/shared/ui/campo'
import { useLive } from '@/shared/ui/live'
import { Monto } from '@/shared/ui/monto'
import {
  decimalesDeTipoCambio,
  type TipoCambioDelNodo,
} from '../../../../entities/formula/tipo-cambio'
import { EsqueletoDelValor } from './esqueleto-del-valor'
import { MARCAS_DE_GESTORES } from './marcas-de-gestores'

type Props = {
  tipoCambio: TipoCambioDelNodo
  texto: string
  avisoDelCampo: string | null
  // Se vuelve a leer la fila («Volver a leer»): el valor de hoy espera y el campo se apaga, con lo tipeado.
  releyendo: boolean
  enCurso: boolean
  // Lo leído ya no vale (otra persona lo cambió, o no se sabe si entró): primero «Volver a leer».
  bloqueado: boolean
  alEscribir: (texto: string) => void
  alEnviar: () => void
}

// El formulario del ⚙ de un tipo de cambio (4.20-3d): el valor de hoy por `<Monto>` («1 USD = Bs 11,68»), lo que afecta, «Valor nuevo» (con el Modo Live, contraseña sin
// gestores, como una constante: P4) y el botón. Enter envía. Sin «Aplicar también a esta cotización»: la hoja nueva se vuelve a abrir con el valor nuevo.
export function BloqueDeTipoCambio(props: Props) {
  const { tipoCambio, texto, avisoDelCampo, releyendo, enCurso, bloqueado, alEscribir, alEnviar } =
    props
  const { live } = useLive()
  const apagado = releyendo || enCurso
  return (
    <form
      aria-label={tipoCambio.nombre}
      className="grid gap-3"
      onSubmit={(evento) => {
        evento.preventDefault()
        alEnviar()
      }}
    >
      <p className="text-(length:--text-sm) text-(--color-ink)">
        Valor de hoy:{' '}
        {releyendo ? (
          <EsqueletoDelValor letrero="Cargando el tipo de cambio" />
        ) : (
          <>
            <span className="text-(--color-ink-faint)">1 {tipoCambio.monedaDe} = </span>
            <Monto
              valor={tipoCambio.valor}
              moneda={tipoCambio.monedaA}
              decimales={decimalesDeTipoCambio(tipoCambio.valor)}
            />
          </>
        )}
      </p>
      <p className="text-(length:--text-sm) text-(--color-ink-faint)">
        Afecta a toda la empresa: las cotizaciones nuevas de todos los orígenes lo usan desde ya;
        las guardadas conservan el suyo.
      </p>
      <Campo
        nombre={`valor-nuevo-${tipoCambio.clave}`}
        etiqueta="Valor nuevo"
        inputMode="decimal"
        autoComplete="off"
        type={live ? 'password' : 'text'}
        {...(live ? MARCAS_DE_GESTORES : {})}
        {...(avisoDelCampo ? { error: avisoDelCampo } : {})}
        spellCheck={false}
        value={texto}
        disabled={apagado}
        onChange={(evento) => {
          alEscribir(evento.target.value)
        }}
      />
      <Button
        type="submit"
        disabled={apagado || bloqueado}
        className="min-h-11 justify-self-start md:min-h-8"
      >
        {enCurso ? 'Cambiando…' : 'Cambiar el tipo de cambio'}
      </Button>
    </form>
  )
}
