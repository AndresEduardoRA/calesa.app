import { errorDeCampo } from '@/shared/lib/formularios'
import { Campo } from '@/shared/ui/campo'
import type { Moneda } from '../../../entities/tipos-cambio'
import { Interruptor } from './interruptor'

type Errores = Partial<Record<'codigo' | 'nombre' | 'simbolo' | 'decimales', string[]>> | undefined

type Props = {
  // null = moneda nueva: se pide también el código.
  moneda: Moneda | null
  esBase: boolean
  errores: Errores
  activa: boolean
  alCambiarActiva: (activa: boolean) => void
}

// Los campos de una moneda. El código sólo se pide al crearla: después no cambia.
export function CamposMoneda({ moneda, esBase, errores, activa, alCambiarActiva }: Props) {
  return (
    <>
      {moneda ? null : (
        <Campo
          nombre="codigo"
          etiqueta="Código"
          autoComplete="off"
          spellCheck={false}
          maxLength={3}
          className="h-11 uppercase md:h-9"
          error={errorDeCampo(errores, 'codigo')}
          ayuda="El código internacional de tres letras: USD, BOB, CLP. No cambia después."
        />
      )}
      <Campo
        nombre="nombre"
        etiqueta="Nombre"
        autoComplete="off"
        maxLength={40}
        defaultValue={moneda?.nombre}
        error={errorDeCampo(errores, 'nombre')}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Campo
          nombre="simbolo"
          etiqueta="Símbolo"
          autoComplete="off"
          maxLength={6}
          defaultValue={moneda?.simbolo}
          error={errorDeCampo(errores, 'simbolo')}
        />
        <Campo
          nombre="decimales"
          etiqueta="Decimales"
          type="number"
          inputMode="numeric"
          min={0}
          max={4}
          defaultValue={moneda?.decimales ?? 2}
          error={errorDeCampo(errores, 'decimales')}
        />
      </div>
      {moneda ? (
        <Interruptor
          titulo="Activa"
          ayuda={
            esBase
              ? 'La moneda base no se desactiva.'
              : 'Inactiva no se ofrece para cargar montos ni tipos de cambio nuevos.'
          }
          valor={activa}
          alCambiar={alCambiarActiva}
          deshabilitado={esBase}
        />
      ) : null}
    </>
  )
}
