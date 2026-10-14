'use client'

import Link from 'next/link'
import type { CampoDeLayout, OrigenResumen } from '@/modules/origenes/client'
import { NOMBRE_DE_PLATAFORMA, plataformasConocidas } from '@/shared/lib/apibara'
import { Aviso } from '@/shared/ui/aviso'
import { Bloque } from '@/shared/ui/bloque'
import { Button } from '@/shared/ui/button'
import { Label } from '@/shared/ui/label'
import { Textarea } from '@/shared/ui/textarea'
import { MAXIMO_DE_LINEAS, type DisponibilidadDeApibara } from '../../../entities/apibara'
import type { Fuentes } from '../../../entities/esquema'
import { fotosDeSubasta, type ResultadoDeFotos } from '../../../entities/subasta-fotos'
import type { FormularioDeVehiculo } from '../../alta/hooks/use-formulario-de-vehiculo'
import { useAltaPorSubasta } from '../hooks/use-alta-por-subasta'
import type { GuardadoDeLinea } from '../hooks/use-guardado-de-subasta'
import { ListaDeLineas } from './lista-de-lineas'
import { RUTA_DE_INTEGRACIONES } from './linea-de-subasta'

type Props = {
  origen: OrigenResumen
  // Los campos activos del layout.
  campos: readonly CampoDeLayout[]
  fuentes: Fuentes
  estado: FormularioDeVehiculo
  apibara: DisponibilidadDeApibara
  traerFotos: (pedido: {
    vehiculoId: string
    raw: unknown
    nombre?: string
  }) => Promise<ResultadoDeFotos>
  // Lo último que se dio de alta desde el formulario, y de qué línea venía.
  guardado: GuardadoDeLinea | null
}

// Lo que se avisa tras cargar una ficha: de dónde salió y cuántas fotos se traen al guardar.
function DatosTraidos({ raw, sinLlenar }: { raw: Record<string, unknown>; sinLlenar: string[] }) {
  const plataforma = String(raw['platform'] ?? '')
  const conocida = plataformasConocidas([plataforma])[0]
  const nombre = conocida ? NOMBRE_DE_PLATAFORMA[conocida] : 'apibara'
  const lote = raw['lot_number'] ? ` · lote ${String(raw['lot_number'])}` : ''
  const fotos = fotosDeSubasta(raw).length
  return (
    <Aviso tono="positivo">
      <p>
        Datos traídos de {nombre}
        {lote}. Revisa la ficha: es editable hasta que la guardes.
      </p>
      {fotos > 0 ? (
        <p>{fotos === 1 ? 'Se trae 1 foto' : `Se traen ${String(fotos)} fotos`} al guardar.</p>
      ) : null}
      {sinLlenar.length > 0 ? <p>No se pudo llenar: {sinLlenar.join(', ')}.</p> : null}
    </Aviso>
  )
}

function ApibaraApagada({ puedeConfigurar }: { puedeConfigurar: boolean }) {
  return (
    <Aviso>
      <p>
        apibara está apagada: carga el vehículo a mano.
        {puedeConfigurar ? (
          <>
            {' '}
            <Link
              href={RUTA_DE_INTEGRACIONES}
              className="text-(--color-primary) underline underline-offset-2"
            >
              Ir a Integraciones
            </Link>
          </>
        ) : null}
      </p>
    </Aviso>
  )
}

type PropsDelPegado = {
  texto: string
  alCambiar: (texto: string) => void
  ocupado: boolean
  consultando: boolean
  recortadas: number
  alConsultar: () => void
}

// Donde se pega lo que se quiere traer: uno por línea.
function PegadoDeSubasta({
  texto,
  alCambiar,
  ocupado,
  consultando,
  recortadas,
  alConsultar,
}: PropsDelPegado) {
  return (
    <>
      <div className="grid gap-1.5">
        <Label htmlFor="pegado-de-subasta">Enlaces, VIN o lotes</Label>
        <Textarea
          id="pegado-de-subasta"
          value={texto}
          rows={3}
          disabled={ocupado}
          aria-describedby="ayuda-de-pegado"
          onChange={(evento) => {
            alCambiar(evento.target.value)
          }}
        />
        <p id="ayuda-de-pegado" className="text-(length:--text-sm) text-(--color-ink-faint)">
          Uno por línea, hasta {MAXIMO_DE_LINEAS}.
        </p>
      </div>
      <div>
        <Button
          type="button"
          variant="outline"
          disabled={ocupado || texto.trim() === ''}
          onClick={alConsultar}
        >
          {consultando ? 'Consultando…' : 'Traer datos'}
        </Button>
      </div>
      {recortadas > 0 ? (
        <Aviso tono="aviso">
          Se consultaron las primeras {MAXIMO_DE_LINEAS}; quedaron fuera {recortadas}.
        </Aviso>
      ) : null}
    </>
  )
}

// El comienzo del alta en un origen de subasta: pegar un enlace de Copart o IAAI, un VIN o un lote
// (o varios, uno por línea) y que apibara llene la ficha. Nada se guarda hasta confirmarlo, y si
// apibara está apagada o falla, el formulario de abajo sigue siendo el de siempre.
export function AltaPorSubasta({
  origen,
  campos,
  fuentes,
  estado,
  apibara,
  traerFotos,
  guardado,
}: Props) {
  const alta = useAltaPorSubasta({
    origenId: origen.id,
    campos,
    fuentes,
    estado,
    traerFotos,
    guardado,
  })
  const { consulta, lote } = alta

  if (!apibara.activa) {
    return <ApibaraApagada puedeConfigurar={apibara.puedeConfigurar} />
  }
  return (
    <Bloque
      titulo="Traer de apibara"
      descripcion="Llena la ficha y las fotos desde Copart o IAAI. También puedes cargarla a mano."
    >
      <div className="grid gap-3">
        <PegadoDeSubasta
          texto={alta.texto}
          alCambiar={alta.setTexto}
          ocupado={alta.ocupado}
          consultando={consulta.consultando}
          recortadas={consulta.recortadas}
          alConsultar={() => void alta.consultar()}
        />
        <ListaDeLineas
          lineas={consulta.lineas}
          usada={estado.subasta?.clave ?? null}
          ocupado={alta.ocupado}
          puedeConfigurar={apibara.puedeConfigurar}
          guardando={lote.progreso}
          alUsar={alta.usar}
          alReintentar={(linea) => void alta.reintentar(linea)}
          alSeguirAMano={alta.seguirAMano}
          alGuardarListas={() => void lote.guardarListas(consulta.lineas)}
        />
        {estado.subasta && estado.subasta.clave === null ? (
          <DatosTraidos raw={estado.subasta.raw} sinLlenar={alta.sinLlenar} />
        ) : null}
      </div>
    </Bloque>
  )
}
