import { telefonoDeFicha } from '../../../entities/ficha'

// Un número de la ficha: enlace de llamada para la cartera, texto para quien lo ve enmascarado. La
// base ya entregó cada número como corresponde.
export function NumeroDeTelefono({
  numero,
  codigoDePais,
  llamable,
}: {
  numero: string
  codigoDePais: string | null
  llamable: boolean
}) {
  const texto = telefonoDeFicha(numero, codigoDePais)
  if (!llamable || numero === '') {
    return <span className="tabular-nums">{texto}</span>
  }
  return (
    <a
      href={`tel:+${numero}`}
      className="text-(--color-primario-ink) tabular-nums underline-offset-2 hover:underline"
    >
      {texto}
    </a>
  )
}
