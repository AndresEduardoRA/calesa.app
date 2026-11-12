'use client'

import { Button } from '@/shared/ui/button'
import {
  SIN_NAVIERAS,
  SIN_PUERTOS,
  type CatalogoDeTransporte,
  type OfertaDeTransporte as Oferta,
} from '../../../entities/reglas/oferta'
import type { EscrituraDeReglas } from '../hooks/use-escritura-de-reglas'
import { useOfertaDeTransporte } from '../hooks/use-oferta-de-transporte'
import { GrupoDeOferta } from './grupo-de-oferta'

const BOTON = 'h-11 md:h-8'

type Props = {
  flujoId: string
  oferta: Oferta
  catalogo: CatalogoDeTransporte
  sinPermiso: boolean
  escritura: EscrituraDeReglas
}

// La oferta de transporte del flujo (sólo con «Transporte» encendida): qué puertos y navieras se ofrecen al cargar el transporte. Sin marcar ninguno, se
// ofrecen todos. Se guarda entera con la versión del flujo. Quien la monta le pone `key` con la firma de lo guardado.
export function OfertaDeTransporte({ flujoId, oferta, catalogo, sinPermiso, escritura }: Props) {
  const { borrador, hayCambio, marcar, ofrecerTodos, guardar } = useOfertaDeTransporte(
    flujoId,
    oferta,
    escritura,
  )
  const apagado = sinPermiso || escritura.enCurso
  return (
    <section aria-labelledby="titulo-de-oferta" className="grid gap-3">
      <div className="grid gap-0.5">
        <h2
          id="titulo-de-oferta"
          className="text-(length:--text-lg) font-semibold text-(--color-ink)"
        >
          Oferta de transporte
        </h2>
        <p className="text-(length:--text-sm) text-(--color-ink-soft)">
          Qué puertos y navieras se ofrecen al cargar el transporte de este flujo. Sin marcar
          ninguno, se ofrecen todos.
        </p>
      </div>
      <div className="grid gap-4 rounded-(--radius-card) border border-(--color-line) bg-(--color-surface) p-4 md:grid-cols-3">
        <GrupoDeOferta
          titulo="Puertos de origen"
          catalogo={catalogo.puertos}
          hayMas={catalogo.hayMasPuertos}
          guardados={oferta.puertosOrigen}
          marcados={borrador.puertosOrigen}
          sinCatalogo={SIN_PUERTOS}
          deshabilitado={apagado}
          alMarcar={(id, marcada) => marcar('puertosOrigen', id, marcada)}
        />
        <GrupoDeOferta
          titulo="Puertos de destino"
          catalogo={catalogo.puertos}
          hayMas={catalogo.hayMasPuertos}
          guardados={oferta.puertosDestino}
          marcados={borrador.puertosDestino}
          sinCatalogo={SIN_PUERTOS}
          deshabilitado={apagado}
          alMarcar={(id, marcada) => marcar('puertosDestino', id, marcada)}
        />
        <GrupoDeOferta
          titulo="Navieras"
          catalogo={catalogo.navieras}
          hayMas={catalogo.hayMasNavieras}
          guardados={oferta.navieras}
          marcados={borrador.navieras}
          sinCatalogo={SIN_NAVIERAS}
          deshabilitado={apagado}
          alMarcar={(id, marcada) => marcar('navieras', id, marcada)}
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button className={BOTON} disabled={apagado || !hayCambio} onClick={() => void guardar()}>
          Guardar oferta
        </Button>
        <Button className={BOTON} variant="outline" disabled={apagado} onClick={ofrecerTodos}>
          Ofrecer todos
        </Button>
      </div>
    </section>
  )
}
