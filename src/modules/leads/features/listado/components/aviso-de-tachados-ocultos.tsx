'use client'

import { parseAsString, useQueryStates } from 'nuqs'
import { conteoEnFrase, type ConteoAcotado } from '@/shared/lib/conteo'
import { CLAVE_DE_CURSOR } from '@/shared/lib/filtros'
import { Button } from '@/shared/ui/button'
import { useRegional } from '@/shared/ui/regional'
import { FILTRO_TACHADOS } from '../../../entities/filtros-de-marcas'

// Llevar el listado a «Mostrarlos también»: vuelve a la primera página con los tachados adentro.
export function useMostrarTachados() {
  const [, setParametros] = useQueryStates(
    { [FILTRO_TACHADOS]: parseAsString, [CLAVE_DE_CURSOR]: parseAsString },
    { shallow: false },
  )
  return () => {
    void setParametros({ [FILTRO_TACHADOS]: 'incluir', [CLAVE_DE_CURSOR]: null })
  }
}

export const textoDeOcultos = (ocultos: ConteoAcotado, locale?: string) =>
  ocultos.n === 1 && !ocultos.hayMas
    ? '1 lead que coincide está oculto porque lo tachaste.'
    : `${conteoEnFrase(ocultos, { locale }).replace(/^./, (c) => c.toUpperCase())} leads que coinciden están ocultos porque los tachaste.`

// Una línea discreta arriba de la lista: cuántos de los que cumplen los filtros quedaron afuera por
// tachados (sólo los que quien mira ve), con «Mostrarlos». Mientras se busca no se ocultan, así que
// no aparece.
export function AvisoDeTachadosOcultos({ ocultos }: { ocultos: ConteoAcotado }) {
  const mostrar = useMostrarTachados()
  const { locale } = useRegional()
  if (ocultos.n === 0) {
    return null
  }
  return (
    <p
      role="status"
      className="flex flex-wrap items-center gap-x-2 text-(length:--text-sm) text-(--color-ink-soft)"
    >
      {textoDeOcultos(ocultos, locale)}
      <Button type="button" variant="link" className="h-11 px-0 md:h-auto" onClick={mostrar}>
        Mostrarlos
      </Button>
    </p>
  )
}
