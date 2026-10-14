import { Aviso } from '@/shared/ui/aviso'

// Con «todos» y un filtro sobre un dato «solo la cartera»: el resultado es sólo lo que está en la
// cartera de quien mira, porque de los demás el dato no llega. Sin esto parecería que se filtró
// entre todos.
export function AvisoDePrivados({ etiquetas }: { etiquetas: readonly string[] }) {
  if (etiquetas.length === 0) {
    return null
  }
  const nombres = etiquetas.map((etiqueta) => `«${etiqueta}»`).join(', ')
  return (
    <Aviso>
      {etiquetas.length === 1
        ? `El filtro ${nombres} solo busca en tus leads: de los demás no recibes ese dato.`
        : `Los filtros ${nombres} solo buscan en tus leads: de los demás no recibes esos datos.`}
    </Aviso>
  )
}
