'use client'

import { Aviso } from './aviso'
import { AvisoDeConflicto } from './aviso-de-conflicto'
import { Button } from './button'

type Props = {
  enLinea: boolean
  // Un guardado que no llegó al servidor y espera a que vuelva la conexión.
  esperandoConexion: boolean
  enCurso: boolean
  // «Rosa cambió esto hace 3 min.»
  conflicto: string | null
  // Un rechazo que no es de ningún campo.
  aviso: string | null
  // Dónde ver cómo quedó lo de la otra persona.
  hrefVer?: string
  alReintentar: () => void
  alRecargar: () => void
}

// Lo que pasa con el guardado, dicho arriba del formulario: sin conexión, esperando para
// reintentar, un conflicto con otra persona o un rechazo que no es de ningún campo.
export function AvisosDelFormulario({
  enLinea,
  esperandoConexion,
  enCurso,
  conflicto,
  aviso,
  hrefVer,
  alReintentar,
  alRecargar,
}: Props) {
  return (
    <>
      {enLinea ? null : (
        <Aviso tono="aviso">
          {esperandoConexion
            ? 'No hay conexión. Lo que escribiste sigue acá y se va a guardar solo cuando vuelva.'
            : 'No hay conexión. Puedes seguir escribiendo: se guarda cuando vuelva.'}
        </Aviso>
      )}
      {enLinea && esperandoConexion ? (
        <Aviso tono="aviso">
          <p>No pudimos llegar al servidor. Lo que escribiste sigue acá.</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-2 min-h-11 md:min-h-7"
            onClick={alReintentar}
            disabled={enCurso}
          >
            Reintentar
          </Button>
        </Aviso>
      ) : null}
      {conflicto ? (
        <AvisoDeConflicto mensaje={conflicto} hrefVer={hrefVer} alRecargar={alRecargar} />
      ) : null}
      {aviso ? <Aviso tono="peligro">{aviso}</Aviso> : null}
    </>
  )
}
