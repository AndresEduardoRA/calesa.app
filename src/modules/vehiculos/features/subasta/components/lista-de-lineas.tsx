import { Button } from '@/shared/ui/button'
import { resumirLineas, type Linea } from '../lineas'
import { LineaDeSubasta } from './linea-de-subasta'

type Props = {
  lineas: readonly Linea[]
  // La clave de la línea que está cargada en el formulario.
  usada: string | null
  ocupado: boolean
  puedeConfigurar: boolean
  // «Guardando 2 de 5…» mientras se guardan las listas.
  guardando: { hechas: number; total: number } | null
  alUsar: (linea: Linea) => void
  alReintentar: (linea: Linea) => void
  alSeguirAMano: (linea: Linea) => void
  alGuardarListas: () => void
}

function textoDelResumen(resumen: ReturnType<typeof resumirLineas>): string {
  const partes = [
    resumen.listas > 0 ? `${String(resumen.listas)} lista${resumen.listas === 1 ? '' : 's'}` : null,
    resumen.guardadas > 0
      ? `${String(resumen.guardadas)} guardada${resumen.guardadas === 1 ? '' : 's'}`
      : null,
    resumen.repetidas > 0
      ? `${String(resumen.repetidas)} ya ${resumen.repetidas === 1 ? 'estaba' : 'estaban'}`
      : null,
    resumen.fallidas + resumen.sinGuardar > 0
      ? `${String(resumen.fallidas + resumen.sinGuardar)} con problemas`
      : null,
  ]
  return partes.filter((parte) => parte !== null).join(' · ')
}

// El resultado por línea de lo pegado. Con más de una, además de revisar cada una se pueden guardar
// todas las listas de una vez.
export function ListaDeLineas({
  lineas,
  usada,
  ocupado,
  puedeConfigurar,
  guardando,
  alUsar,
  alReintentar,
  alSeguirAMano,
  alGuardarListas,
}: Props) {
  if (lineas.length === 0) {
    return null
  }
  const resumen = resumirLineas(lineas)
  return (
    <div className="grid gap-2">
      <ul aria-label="Resultado por línea" className="divide-y divide-(--color-line)">
        {lineas.map((linea) => (
          <LineaDeSubasta
            key={linea.clave}
            linea={linea}
            usada={usada === linea.clave}
            ocupado={ocupado}
            puedeConfigurar={puedeConfigurar}
            alUsar={() => {
              alUsar(linea)
            }}
            alReintentar={() => {
              alReintentar(linea)
            }}
            alSeguirAMano={() => {
              alSeguirAMano(linea)
            }}
          />
        ))}
      </ul>
      {lineas.length > 1 ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-(length:--text-sm) text-(--color-ink-soft)">
            {resumen.enCurso > 0
              ? `Consultando… quedan ${String(resumen.enCurso)}`
              : textoDelResumen(resumen)}
          </p>
          {resumen.listas > 1 ? (
            <Button type="button" variant="outline" disabled={ocupado} onClick={alGuardarListas}>
              {guardando
                ? `Guardando ${String(guardando.hechas + 1)} de ${String(guardando.total)}…`
                : `Guardar ${String(resumen.listas)} sin revisar`}
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
