'use client'

import { useEffect } from 'react'
import { Button } from '@/shared/ui/button'
import { Aviso } from '@/shared/ui/aviso'
import { useCambiosSinGuardar } from '@/shared/ui/cambios-del-panel'
import { EstadoError } from '@/shared/ui/estados'
import { nodosDelAjuste, type NodoDelAjuste } from '../../../../entities/formula/ajuste'
import type { CeldaDeHoja } from '../../../../entities/hoja'
import type { PropsDelAjuste } from '../../../hoja/components/huecos'
import { useAjusteDeConstante } from '../../hooks/use-ajuste-de-constante'
import { BloqueDeConstante } from './bloque-de-constante'
import { TipoCambioDelAjuste } from './tipo-cambio-del-ajuste'
import { TipoDeCambioEnLaEmpresa } from './tipo-de-cambio-en-la-empresa'

type Props = PropsDelAjuste & { origenId: string }

const PREFIJO_DEL_AJUSTE = 'Cambiar el valor por defecto de '

// El ⚙ de esa celda, para devolverle el foco: el panel se desmonta al cerrar (la URL ya no nombra la celda) y el `<Drawer>` no alcanza a devolverlo.
const botonDelAjuste = (celda: CeldaDeHoja) =>
  [
    ...document.querySelectorAll<HTMLElement>(`[data-nodo="${CSS.escape(celda.nodo)}"] button`),
  ].find((boton) => boton.getAttribute('aria-label')?.startsWith(PREFIJO_DEL_AJUSTE))

const EN_UNA_GUARDADA = 'Esta cotización conserva el tipo de cambio con que se guardó.'

// Lo de adentro del panel del ⚙ (4.20-3b): un bloque por constante o, para un tipo de cambio, su formulario en la hoja nueva y, en una guardada, dónde se cambia y que
// ella conserva el suyo (P1 del 4.20-3d). Al desmontarse, el foco vuelve al ⚙ de su celda.
export function CuerpoDelAjuste({ celda, cerrar, hoja, origenId }: Props) {
  const nodos = nodosDelAjuste(celda)
  const constantes = nodos.filter((n) => n.tipo === 'constante')
  const tipoDeCambio = nodos.find((n) => n.tipo === 'tipo_cambio')
  useEffect(
    () => () => {
      window.setTimeout(() => {
        botonDelAjuste(celda)?.focus()
      }, 0)
    },
    [celda],
  )
  return (
    <div className="grid gap-6">
      {constantes.length > 0 ? (
        <ConstantesDelAjuste nodos={constantes} cerrar={cerrar} hoja={hoja} origenId={origenId} />
      ) : null}
      {tipoDeCambio === undefined ? null : hoja.de.tipo === 'abierta' ? (
        <TipoCambioDelAjuste nodo={tipoDeCambio.nodo} hoja={hoja} cerrar={cerrar} />
      ) : (
        <TipoDeCambioEnLaEmpresa nota={EN_UNA_GUARDADA} />
      )}
    </div>
  )
}

type PropsDeLasConstantes = Omit<Props, 'celda'> & { nodos: readonly NodoDelAjuste[] }

// Las constantes del ⚙: una sola llamada a `useCambiosSinGuardar` para todo el panel (dos se pisarían). Lo tipeado no tiene borrador: cerrar con algo escrito pregunta.
function ConstantesDelAjuste({ nodos, cerrar, hoja, origenId }: PropsDeLasConstantes) {
  const ajuste = useAjusteDeConstante({ origenId, nodos, hoja, cerrar })
  useCambiosSinGuardar(ajuste.hayCambios, undefined, { preguntaAlCerrar: true })
  const { lectura, aviso } = ajuste
  if (lectura.tipo === 'error') {
    return (
      <div role="alert">
        <EstadoError titulo={lectura.mensaje} alReintentar={ajuste.reintentar} />
      </div>
    )
  }
  if (lectura.tipo === 'sin_constante') {
    return <p className="text-(length:--text-sm) text-(--color-ink-soft)">{lectura.mensaje}</p>
  }
  return (
    <div className="grid gap-6">
      {ajuste.otraVersion ? <Aviso tono="aviso">{ajuste.otraVersion}</Aviso> : null}
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
      {ajuste.bloques.map((bloque) => (
        <BloqueDeConstante
          key={bloque.nodo}
          bloque={bloque}
          conNombre={ajuste.bloques.length > 1}
          leyendo={lectura.tipo === 'leyendo'}
          enCurso={ajuste.enCurso}
          bloqueado={aviso?.volverALeer === true}
          alEscribir={(texto) => {
            ajuste.escribir(bloque.nodo, texto)
          }}
          alMarcar={(valor) => {
            ajuste.marcar(bloque.nodo, valor)
          }}
          alEnviar={() => {
            void ajuste.enviar(bloque.nodo)
          }}
        />
      ))}
    </div>
  )
}
