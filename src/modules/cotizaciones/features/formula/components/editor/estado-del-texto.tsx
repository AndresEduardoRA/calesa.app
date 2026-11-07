'use client'

import type { MotivoDeNoManda } from '../../../../entities/formula/texto-vigente'
import type { CambioEnLaFila, TextoDeLaFila } from '../../hooks/use-editor-de-la-formula.soporte'
import { ValorDeConstante } from './valor-de-constante'

type Props = { texto: Exclude<TextoDeLaFila, { modo: 'campos' }> }

const MOTIVOS: Record<Exclude<MotivoDeNoManda, 'valor_no_escribible'>, string> = {
  no_compila: 'ya no compila con la fórmula de ahora.',
  otra_estructura: 'ya no dice lo que la fila calcula.',
}

function Cambio({ cambio }: { cambio: CambioEnLaFila }) {
  return (
    <>
      Con ⚙ se cambió <ValorDeConstante valor={cambio.enElTexto} formato={cambio.formato} /> por{' '}
      <ValorDeConstante valor={cambio.guardado} formato={cambio.formato} />: el texto ya dice el
      valor nuevo.
    </>
  )
}

// El texto de una fila cerrada (C4, 4-5): al día, reescrito tras un ⚙ (sólo se muestra: guardarlo así es del 4.21-3b) o «ya no manda».
export function EstadoDelTexto({ texto }: Props) {
  if (texto.modo === 'solo_lectura') {
    return null
  }
  return (
    <div className="grid min-w-0 gap-1">
      <code className="break-all whitespace-pre-wrap text-(--color-ink)">{texto.texto}</code>
      {texto.modo === 'reescrito'
        ? texto.cambios.map((cambio) => (
            <p key={cambio.id} className="text-(--color-ink-soft)">
              <Cambio cambio={cambio} />
            </p>
          ))
        : null}
      {texto.modo === 'no_manda' ? (
        <p className="rounded-(--radius-md) bg-(--color-aviso-soft) p-2 text-(--color-aviso-ink)">
          El texto ya no manda:{' '}
          {texto.motivo === 'valor_no_escribible'
            ? texto.cambios.map((cambio, i) => (
                <span key={cambio.id}>
                  {i > 0 ? '; ' : null}con ⚙ quedó{' '}
                  <ValorDeConstante valor={cambio.guardado} formato={cambio.formato} />, que el
                  texto no puede escribir
                </span>
              ))
            : MOTIVOS[texto.motivo]}
          {texto.motivo === 'valor_no_escribible' ? '.' : null}
        </p>
      ) : null}
    </div>
  )
}
