import type { Desborde } from './use-desborde'

// La pista de que una barra sigue hacia un lado: un degradado hacia el color de la página en el borde, sólo donde queda algo
// escondido. No recibe el puntero (se puede tocar lo que hay debajo) ni lo lee el lector: la barra ya es una lista de enlaces.
// Va dentro de un contenedor `relative` que envuelve a la barra. `data-desborde` es para los e2e.
export function PistaDeDesborde({ izquierda, derecha }: Desborde) {
  const base =
    'pointer-events-none absolute inset-y-0 w-8 from-(--color-paper) to-transparent transition-opacity motion-reduce:transition-none'
  return (
    <>
      <span
        aria-hidden
        data-desborde="izquierda"
        data-visible={izquierda}
        className={`${base} left-0 bg-linear-to-r ${izquierda ? 'opacity-100' : 'opacity-0'}`}
      />
      <span
        aria-hidden
        data-desborde="derecha"
        data-visible={derecha}
        className={`${base} right-0 bg-linear-to-l ${derecha ? 'opacity-100' : 'opacity-0'}`}
      />
    </>
  )
}
