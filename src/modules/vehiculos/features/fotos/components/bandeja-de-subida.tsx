import { Aviso } from '@/shared/ui/aviso'
import { Button } from '@/shared/ui/button'
import { avisoDeTope } from '../../../entities/seleccion-de-fotos'
import { etiquetaDeSubir, type ConteoDeBandeja, type ItemVisto } from '../bandeja'
import { ItemDeBandeja } from './item-de-bandeja'
import { ProgresoDeSubida } from './progreso-de-subida'

type Props = {
  vistos: readonly ItemVisto[]
  conteo: ConteoDeBandeja
  // Cuántas fotos tiene ya el vehículo.
  tiene: number
  progreso: { hechas: number; total: number } | null
  alSubir: () => void
  alQuitar: (clave: string) => void
  alVaciar: () => void
}

// Lo elegido, antes de subir: qué entra, qué no y por qué. Nada tocó Storage hasta que la
// persona confirma; después, lo que falló sigue acá para reintentarlo.
export function BandejaDeSubida(props: Props) {
  const { vistos, conteo, tiene, progreso, alSubir, alQuitar, alVaciar } = props
  const ocupado = progreso !== null
  const etiqueta = etiquetaDeSubir(conteo)
  const entran = conteo.listas + conteo.fallidas + conteo.subiendo
  const tope = avisoDeTope({ tiene, elegidas: conteo.candidatas, entran })
  return (
    <section
      aria-label="Fotos por subir"
      className="grid gap-3 rounded-(--radius-card) border border-(--color-line) bg-(--color-surface) p-3"
    >
      {tope ? <Aviso tono="aviso">{tope}</Aviso> : null}
      <ul className="divide-y divide-(--color-line)">
        {vistos.map((item) => (
          <ItemDeBandeja
            key={item.clave}
            item={item}
            ocupado={ocupado}
            alQuitar={() => {
              alQuitar(item.clave)
            }}
          />
        ))}
      </ul>
      {progreso ? <ProgresoDeSubida hechas={progreso.hechas} total={progreso.total} /> : null}
      <div className="flex flex-wrap justify-end gap-2">
        <Button
          type="button"
          variant="ghost"
          className="h-11 md:h-8"
          disabled={ocupado}
          onClick={alVaciar}
        >
          Descartar
        </Button>
        {etiqueta ? (
          <Button
            type="button"
            className="h-11 md:h-8"
            // Mientras alguna se está leyendo no se sabe todavía cuáles entran.
            disabled={ocupado || conteo.preparando > 0}
            onClick={alSubir}
          >
            {etiqueta}
          </Button>
        ) : null}
      </div>
    </section>
  )
}
