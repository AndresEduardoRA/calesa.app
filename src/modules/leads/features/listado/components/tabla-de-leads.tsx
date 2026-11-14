'use client'

import {
  AbrirResumen,
  CabeceraPegada,
  CeldaPegada,
  FilaDeLista,
  TablaDeLista,
} from '@/shared/ui/lista'
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table'
import { tipoDelCatalogo } from '../../../entities/catalogos'
import type { OrigenConEstado } from '../../../entities/ficha'
import { camposDeTabla } from '../../../entities/listado'
import type { FilaDeLead } from '../../../entities/listado'
import { BotonDeOportunidad } from './boton-de-oportunidad'
import { MenuDeLead } from '../../marcas/components/menu-de-lead'
import { BadgeDeTipo } from './badge-de-tipo'
import { CeldaDeCampo } from './celda-de-campo'
import { NombreDeFila } from './nombre-de-fila'
import { telefonoDeLista } from './telefono-de-lista'
import { OrigenDelLead } from './origen-del-lead'
import { accionesDelMenu, type DatosDeLaLista, origenDelCatalogo, type ParaMarcar } from './tipos'
import {
  RecordatorioDeFila,
  UltimoSeguimientoDeFila,
  useContextoDeUltimoContacto,
  type DatosDeUltimoContacto,
} from './ultimo-contacto'

// «+ Oportunidad» y el «⋯» de la fila, juntos a la derecha.
function AccionesDeLaFila({ lead, marcar }: { lead: FilaDeLead; marcar: ParaMarcar }) {
  return (
    <div className="flex items-center justify-end gap-1">
      <BotonDeOportunidad lead={lead} marcar={marcar} conTexto />
      <MenuDeLead
        leadId={lead.id}
        nombre={lead.nombre}
        marcas={lead.marcas}
        etiquetas={marcar.etiquetas}
        alGestionar={marcar.alGestionar}
        puedeEnviar={marcar.eliminables.includes(lead.id)}
        acciones={accionesDelMenu(marcar, lead)}
      />
    </div>
  )
}

type Props = DatosDeLaLista & {
  leads: readonly FilaDeLead[]
  alAbrir: (id: string) => void
  // El lead abierto en el drawer, para marcarlo.
  abierto: string | null
  marcar: ParaMarcar
  ultimoContacto: DatosDeUltimoContacto
}

const VACIO = <span className="text-(--color-ink-faint)">—</span>

function OrigenDeLaFila({ origen }: { origen: OrigenConEstado | null }) {
  return origen ? (
    <OrigenDelLead nombre={origen.nombre} icono={origen.icono ?? null} enLista />
  ) : (
    VACIO
  )
}

function EncabezadoDeLaTabla({ columnas }: { columnas: ReturnType<typeof camposDeTabla> }) {
  return (
    <TableHeader>
      <TableRow>
        <CabeceraPegada lado="nombre">Nombre</CabeceraPegada>
        <TableHead>Teléfono</TableHead>
        <TableHead>Tipo</TableHead>
        <TableHead>Origen del lead</TableHead>
        <TableHead>Último seguimiento</TableHead>
        <TableHead>Recordatorio</TableHead>
        {columnas.map((campo) => (
          <TableHead key={campo.clave}>{campo.etiqueta}</TableHead>
        ))}
        <CabeceraPegada lado="acciones">
          <span className="sr-only">Acciones</span>
        </CabeceraPegada>
      </TableRow>
    </TableHeader>
  )
}

// Los leads en escritorio, con el patrón de lista (`@/shared/ui/lista`): nombre (con las marcas de quien mira), teléfono, tipo y
// origen, el último seguimiento y el próximo recordatorio (`ultimo-contacto.tsx`), una columna por cada campo «en la tabla» del layout y el «⋯». Un clic en cualquier parte de la fila abre el drawer
// rápido (`?lead=`), salvo el del «⋯» y el de un enlace de la fila. La tabla es tan ancha como lo pidan sus columnas (el nombre nunca
// se achica para que quepan) y se desplaza dentro de la tarjeta, con el nombre y el «⋯» a la vista.
export function TablaDeLeads(props: Props) {
  const {
    leads,
    campos,
    origenes,
    tipos,
    codigoDePais,
    etiquetas,
    alAbrir,
    abierto,
    marcar,
    numeroBuscado,
    ultimoContacto,
  } = props
  const contextoDe = useContextoDeUltimoContacto(ultimoContacto, marcar)
  const columnas = camposDeTabla(campos)
  return (
    <TablaDeLista>
      <EncabezadoDeLaTabla columnas={columnas} />
      <TableBody>
        {leads.map((lead) => (
          <FilaDeLista
            key={lead.id}
            abierta={abierto === lead.id}
            idDeVisto={lead.id}
            alAbrir={() => {
              alAbrir(lead.id)
            }}
          >
            <CeldaPegada lado="nombre">
              <NombreDeFila
                lead={lead}
                etiquetas={etiquetas}
                numeroBuscado={numeroBuscado}
                nombre={(clases) => (
                  <AbrirResumen nombre={lead.nombre} className={`max-w-72 ${clases}`}>
                    {lead.nombre}
                  </AbrirResumen>
                )}
              />
            </CeldaPegada>
            <TableCell className="whitespace-nowrap tabular-nums">
              {telefonoDeLista(lead.telefono, codigoDePais)}
            </TableCell>
            <TableCell>
              <BadgeDeTipo tipo={tipoDelCatalogo(tipos, lead.tipoLeadId)} enLista />
            </TableCell>
            <TableCell className="max-w-48 truncate">
              <OrigenDeLaFila origen={origenDelCatalogo(origenes, lead.origenId)} />
            </TableCell>
            <TableCell className="max-w-56">
              <UltimoSeguimientoDeFila lead={lead} contexto={contextoDe(lead)} />
            </TableCell>
            <TableCell className="max-w-48">
              <RecordatorioDeFila lead={lead} contexto={contextoDe(lead)} />
            </TableCell>
            {columnas.map((campo) => (
              <TableCell key={campo.clave} className="max-w-48 truncate">
                <CeldaDeCampo campo={campo} fila={lead} />
              </TableCell>
            ))}
            <CeldaPegada lado="acciones">
              <AccionesDeLaFila lead={lead} marcar={marcar} />
            </CeldaPegada>
          </FilaDeLista>
        ))}
      </TableBody>
    </TablaDeLista>
  )
}
