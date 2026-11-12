import type { Route } from 'next'
import Link from 'next/link'
import { Aviso } from '@/shared/ui/aviso'
import { hrefDeFase, textoDelImpacto, type ImpactoDeRegla } from '../../../entities/reglas/impacto'

type Props = {
  nombreDeLaRegla: string
  impacto: ImpactoDeRegla
  claveDelFlujo: string
}

// Lo que impide apagar una regla: la frase y un enlace por fase (o por la fase de cada requisito de espera) a su inspector.
export function AvisoDeUso({ nombreDeLaRegla, impacto, claveDelFlujo }: Props) {
  const deRequisitos = impacto.requisitos.map((q) => ({ id: q.faseId, nombre: q.faseNombre }))
  const destinos = [...new Map([...impacto.fases, ...deRequisitos].map((f) => [f.id, f])).values()]
  return (
    <Aviso tono="aviso" className="mt-2">
      <p>{textoDelImpacto(nombreDeLaRegla, impacto)}</p>
      <ul className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
        {destinos.map((f) => (
          <li key={f.id}>
            <Link
              href={hrefDeFase(claveDelFlujo, f.id) as Route}
              className="inline-flex min-h-11 items-center underline underline-offset-2 md:min-h-0"
            >
              {f.nombre}
            </Link>
          </li>
        ))}
      </ul>
    </Aviso>
  )
}
