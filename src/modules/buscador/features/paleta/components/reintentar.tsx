import { Button } from '@/shared/ui/button'

// Un botón real, fuera de las filas: el Enter de una fila no lo dispara. 44 px en el celular.
export function Reintentar({ alReintentar }: { alReintentar: () => void }) {
  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      className="mt-2 min-h-11 md:min-h-8"
      onClick={alReintentar}
    >
      Reintentar
    </Button>
  )
}
