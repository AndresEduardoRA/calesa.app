import type { Metadata } from 'next'
import { connection } from 'next/server'
import { Suspense } from 'react'
import { leerAjustes } from '@/modules/empresa'
import { puede, requerirSesion } from '@/modules/equipo'
import { leerDatosDeImportacion, leerImportacionesRecientes } from '@/modules/leads'
import { AsistenteDeImportacion, ImportacionesRecientes } from '@/modules/leads/pantallas/importar'
import { datosO } from '@/shared/lib/errores'
import { ZONA_POR_DEFECTO } from '@/shared/lib/fechas'
import { EstadoSinPermiso } from '@/shared/ui/estados'
import { EsqueletoFormulario, EsqueletoTabla } from '@/shared/ui/esqueletos'

export const metadata: Metadata = { title: 'Importar leads' }

// Importar leads desde un CSV: subir el archivo, emparejar las columnas con las del layout, ver cada
// fila y entrar las válidas. Quien importa queda de dueña de lo que crea: exige `leads.crear` (la base
// lo vuelve a exigir en cada lote). Debajo, «Tus importaciones recientes» con su «Deshacer» (24 h): se
// ve aunque ya no tengas `leads.crear`, porque deshacer lo propio sólo pide haberlo importado.
export default function PaginaImportarLeads() {
  return (
    <div className="grid gap-6">
      <h1 className="text-(length:--text-xl) font-semibold">Importar leads</h1>
      <Suspense fallback={<EsqueletoFormulario bloques={1} campos={3} />}>
        <Importar />
      </Suspense>
      <Suspense fallback={<EsqueletoTabla filas={2} columnas={3} />}>
        <Recientes />
      </Suspense>
    </div>
  )
}

async function Importar() {
  await connection()
  const sesion = await requerirSesion()
  if (!puede(sesion.permisos, 'leads.crear')) {
    return (
      <EstadoSinPermiso descripcion="No tienes permiso para importar leads. Pídeselo a quien administra los roles." />
    )
  }
  const [datos, ajustes] = await Promise.all([leerDatosDeImportacion(), leerAjustes()])
  const listo = datosO(datos)
  return (
    <AsistenteDeImportacion
      campos={listo.campos}
      contexto={listo.contexto}
      zona={ajustes.ok ? ajustes.data.ajustes.zonaHoraria : ZONA_POR_DEFECTO}
    />
  )
}

async function Recientes() {
  await connection()
  await requerirSesion()
  const [recientes, ajustes] = await Promise.all([leerImportacionesRecientes(), leerAjustes()])
  return (
    <ImportacionesRecientes
      recientes={datosO(recientes)}
      // Contra este instante se cuenta lo que queda del plazo: el mismo en el servidor y al hidratar.
      ahora={new Date().toISOString()}
      zona={ajustes.ok ? ajustes.data.ajustes.zonaHoraria : ZONA_POR_DEFECTO}
    />
  )
}
