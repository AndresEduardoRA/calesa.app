'use client'

import { Aviso } from '@/shared/ui/aviso'
import { Button } from '@/shared/ui/button'
import { useCambiosSinGuardar } from '@/shared/ui/cambios-del-panel'
import { EstadoError } from '@/shared/ui/estados'
import type { PropsDelAjuste } from '../../../hoja/components/huecos'
import { useAjusteDeTipoCambio } from '../../hooks/use-ajuste-de-tipo-cambio'
import { BloqueDeTipoCambio } from './bloque-de-tipo-cambio'
import { EsqueletoDelValor } from './esqueleto-del-valor'
import { TipoDeCambioEnLaEmpresa } from './tipo-de-cambio-en-la-empresa'

type Props = Omit<PropsDelAjuste, 'celda'> & { nodo: string }

const LETRERO = 'Cargando el tipo de cambio'

// El ⚙ de un tipo de cambio en la hoja nueva (4.20-3d): lee la fila que nombra el nodo y, si está activa, la cambia para toda la empresa. Mientras lee la primera vez,
// sólo el esqueleto (el nombre del formulario llega con la lectura). Sin fila, o desactivada (la hoja no usa un tipo de cambio inactivo), dice dónde se cambia. Cerrar con
// algo tipeado pregunta: una sola llamada a `useCambiosSinGuardar` (un panel es de constantes o de un tipo de cambio, nunca de los dos).
export function TipoCambioDelAjuste({ nodo, hoja, cerrar }: Props) {
  const ajuste = useAjusteDeTipoCambio({ nodo, hoja, cerrar })
  useCambiosSinGuardar(ajuste.hayCambios, undefined, { preguntaAlCerrar: true })
  const { lectura, tipoCambio, aviso } = ajuste
  if (lectura.tipo === 'error') {
    return (
      <div role="alert">
        <EstadoError titulo="No se pudo leer el tipo de cambio." alReintentar={ajuste.reintentar} />
      </div>
    )
  }
  if (lectura.tipo === 'sin_tipo') {
    return (
      <div className="grid gap-3">
        <p className="text-(length:--text-sm) text-(--color-ink-soft)">
          No encontramos el tipo de cambio de esta celda.
        </p>
        <TipoDeCambioEnLaEmpresa />
      </div>
    )
  }
  if (tipoCambio === null) {
    return <EsqueletoDelValor letrero={LETRERO} />
  }
  if (lectura.tipo === 'listo' && !tipoCambio.activo) {
    return (
      <TipoDeCambioEnLaEmpresa
        texto={`${tipoCambio.nombre} está desactivado: se activa en Configuración › Empresa › Monedas.`}
      />
    )
  }
  return (
    <div className="grid gap-6">
      {aviso ? (
        <Aviso tono="peligro">
          <p>{aviso.mensaje}</p>
          {aviso.volverALeer ? (
            <Button
              variant="outline"
              className="mt-2 min-h-11 md:min-h-8"
              onClick={ajuste.volverALeer}
            >
              Volver a leer
            </Button>
          ) : null}
        </Aviso>
      ) : null}
      <BloqueDeTipoCambio
        tipoCambio={tipoCambio}
        texto={ajuste.texto}
        avisoDelCampo={ajuste.avisoDelCampo}
        releyendo={lectura.tipo === 'leyendo'}
        enCurso={ajuste.enCurso}
        bloqueado={aviso?.volverALeer === true}
        alEscribir={ajuste.escribir}
        alEnviar={() => {
          void ajuste.enviar()
        }}
      />
    </div>
  )
}
