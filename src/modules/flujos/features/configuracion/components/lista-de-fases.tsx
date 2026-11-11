'use client'

import { cn } from 'cn'
import { AvisoDeTope } from '@/shared/ui/aviso-de-tope'
import { EstadoVacio } from '@/shared/ui/estados'
import {
  AbrirResumen,
  CeldaPegada,
  CabeceraPegada,
  FilaDeLista,
  TablaDeLista,
  TarjetaDeLista,
  UnaSolaVista,
} from '@/shared/ui/lista'
import { TableBody, TableHeader, TableRow } from '@/shared/ui/table'
import {
  TOPE_DE_FASES,
  type FaseParaConfigurar,
  type FlujoParaConfigurar,
} from '../../../entities/flujo'
import type { HuecosDelFlujo } from './huecos'
import { MarcasDeLaFase, NombreConColor } from './marcas-de-la-fase'

type Props = {
  flujo: FlujoParaConfigurar
  // Abre el inspector de una fase (`?fase=`).
  alAbrir: (faseId: string) => void
  // El nombre del flujo como lo dice la pestaña («Subasta USA»): nunca un texto fijo.
  nombreDelFlujo: string
  huecos: HuecosDelFlujo
}

type PropsDeVista = {
  flujo: FlujoParaConfigurar
  huecos: HuecosDelFlujo
  alAbrir: (faseId: string) => void
}

function Nombre({ fase }: { fase: FaseParaConfigurar }) {
  return (
    <AbrirResumen
      nombre={fase.nombre}
      className={cn('max-w-72 min-w-0', !fase.activa && 'opacity-70')}
    >
      <NombreConColor fase={fase} />
    </AbrirResumen>
  )
}

// Las marcas, los huecos de salidas y el «⋯» de la fila: lo que llena cada paso. Sin hueco, nada.
function Extras({
  flujo,
  fase,
  huecos,
}: Omit<PropsDeVista, 'alAbrir'> & { fase: FaseParaConfigurar }) {
  const Salidas = huecos.salidasDeFila
  return (
    <>
      <MarcasDeLaFase fase={fase} />
      {Salidas ? <Salidas flujo={flujo} fase={fase} /> : null}
    </>
  )
}

function Tabla({ flujo, huecos, alAbrir }: PropsDeVista) {
  const Acciones = huecos.accionesDeFila
  return (
    <TablaDeLista className="@container">
      <TableHeader>
        <TableRow>
          <CabeceraPegada lado="nombre">Fase</CabeceraPegada>
          {Acciones ? (
            <CabeceraPegada lado="acciones">
              <span className="sr-only">Acciones</span>
            </CabeceraPegada>
          ) : null}
        </TableRow>
      </TableHeader>
      <TableBody>
        {flujo.fases.map((fase) => (
          <FilaDeLista
            key={fase.id}
            alAbrir={() => {
              alAbrir(fase.id)
            }}
          >
            <CeldaPegada lado="nombre">
              <span className="flex min-w-0 flex-wrap items-center gap-2">
                <Nombre fase={fase} />
                <Extras flujo={flujo} fase={fase} huecos={huecos} />
              </span>
            </CeldaPegada>
            {Acciones ? (
              <CeldaPegada lado="acciones">
                <Acciones flujo={flujo} fase={fase} />
              </CeldaPegada>
            ) : null}
          </FilaDeLista>
        ))}
      </TableBody>
    </TablaDeLista>
  )
}

function Tarjetas({ flujo, huecos, alAbrir }: PropsDeVista) {
  const Acciones = huecos.accionesDeFila
  return (
    <ul className="grid grid-cols-[minmax(0,1fr)] gap-2">
      {flujo.fases.map((fase) => (
        <TarjetaDeLista
          key={fase.id}
          alAbrir={() => {
            alAbrir(fase.id)
          }}
          acciones={Acciones ? <Acciones flujo={flujo} fase={fase} /> : undefined}
        >
          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
            <Nombre fase={fase} />
            <Extras flujo={flujo} fase={fase} huecos={huecos} />
          </div>
        </TarjetaDeLista>
      ))}
    </ul>
  )
}

// Las fases del flujo, en el orden de la base, sólo para mirar (5.02): el nombre con su color, «Inicial», «Final» y «Jubilada». Un clic en la fila o Enter en
// el nombre abre el inspector de la fase. Los huecos de abajo los llenan 5.04 (acciones) y 5.06 (salidas).
export function ListaDeFases({ flujo, nombreDelFlujo, huecos, alAbrir }: Props) {
  const AccionesDeLaLista = huecos.accionesDeLaLista
  return (
    <section aria-labelledby="titulo-de-fases" className="grid gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="grid gap-0.5">
          <h2
            id="titulo-de-fases"
            className="text-(length:--text-lg) font-semibold text-(--color-ink)"
          >
            Fases
          </h2>
          <p className="text-(length:--text-sm) text-(--color-ink-soft)">
            En el orden del flujo. Por ahora sólo se pueden mirar.
          </p>
        </div>
        {AccionesDeLaLista ? <AccionesDeLaLista flujo={flujo} /> : null}
      </div>
      {flujo.fases.length === 0 ? (
        <EstadoVacio compacto titulo={`El flujo de ${nombreDelFlujo} todavía no tiene fases.`} />
      ) : (
        <UnaSolaVista
          tabla={() => <Tabla flujo={flujo} huecos={huecos} alAbrir={alAbrir} />}
          tarjetas={() => <Tarjetas flujo={flujo} huecos={huecos} alAbrir={alAbrir} />}
        />
      )}
      {flujo.truncado.fases ? (
        <AvisoDeTope texto={`Mostrando las primeras ${String(TOPE_DE_FASES)} fases.`} />
      ) : null}
    </section>
  )
}
