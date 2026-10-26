import { NOTA } from './clases'
import type { Nota } from './estado'
import { IconoDeXCell, ID_DEL_AVISO, ID_DEL_CANDADO } from './simbolos-de-xcell'

type Props = { id: string; nota: Nota }

// El motivo del candado o el aviso de un error, siempre escrito (nunca sólo un color o un icono) y partido, no cortado.
export function NotaDeXCell({ id, nota }: Props) {
  return (
    <p id={id} className={NOTA} {...(nota.esError ? { role: 'alert' } : {})}>
      <IconoDeXCell id={nota.esError ? ID_DEL_AVISO : ID_DEL_CANDADO} />
      {nota.texto}
    </p>
  )
}
