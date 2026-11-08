import { formatearFechaHora } from '@/shared/lib/fechas'
import type { PropsDelEditor } from '../../../entities/plantilla/props-del-editor'

type Props = Pick<PropsDelEditor, 'origen' | 'de' | 'esperada' | 'publicada'>

function DeDondeNace({ de, esperada, publicada }: Omit<Props, 'origen'>) {
  if (de === 'borrador' && esperada !== null)
    return <>Sobre el borrador guardado el {formatearFechaHora(esperada)}.</>
  if (de === 'publicada')
    return <>Sin borrador: parte de la versión {publicada?.version} publicada.</>
  return <>Sin borrador ni publicada: parte de los grupos de la fórmula.</>
}

// «Tarjeta de <Origen>», de dónde nace lo que se edita y, si hay, la publicada con su nota.
export function EncabezadoDelEditor({ origen, de, esperada, publicada }: Props) {
  return (
    <div className="grid gap-0.5">
      <h3 className="font-semibold text-(--color-ink)">Tarjeta de {origen.nombre}</h3>
      <p className="text-(length:--text-sm) text-(--color-ink-soft)">
        <DeDondeNace de={de} esperada={esperada} publicada={publicada} />
      </p>
      {publicada === null ? null : (
        <p className="text-(length:--text-sm) text-(--color-ink-soft)">
          Publicada: versión {publicada.version}
          {publicada.publicadoEn ? `, ${formatearFechaHora(publicada.publicadoEn)}` : ''}.
          {publicada.nota ? ` ${publicada.nota}` : ''}
        </p>
      )}
    </div>
  )
}
