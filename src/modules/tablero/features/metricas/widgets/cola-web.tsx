import {
  NOMBRES_DE_ESTADO_DEL_TURNO,
  textoDeConteo,
  textoDeMinutos,
  textoDeTasa,
} from '../../../entities/cifras'
import { nombreDePersona, notaDeTope, TOPE_DE_PERSONAS } from '../../../entities/graficas'
import type { EstadoDelTurno } from '../../../entities/metricas'
import { CifraDelWidget, ErrorDeLectura } from '../components/cifra-del-widget'
import { Ranking } from '../graficas/ranking'
import { TablaEquivalente } from '../graficas/tabla-equivalente'
import { ASIGNADOS_Y_CONTACTADOS } from '../graficas/tipos'
import { VacioDeGrafica } from '../graficas/vacio-de-grafica'
import { leerColaWeb } from '../lectura'
import type { CuerpoDeWidget } from './tipos'

const ESTADOS = Object.keys(NOMBRES_DE_ESTADO_DEL_TURNO) as EstadoDelTurno[]

// Los turnos web del período (por cuándo se asignaron): cuántos, la tasa de contacto y la mediana hasta «Contacté» sin los
// directos, la cuenta por estado y el ranking por persona. Sin token, UTM, lead ni WhatsApp.
export const CuerpoDeColaWeb: CuerpoDeWidget = async ({ ventana }) => {
  const lectura = await leerColaWeb(ventana.desde, ventana.hasta)
  if (!lectura.ok) {
    return <ErrorDeLectura error={lectura.error} />
  }
  const cola = lectura.data
  if (cola.total === 0) {
    return <VacioDeGrafica sustantivo="turnos de la web" puedeCrear={false} />
  }
  const filas = cola.por_persona.map((p) => ({
    id: p.usuario_id,
    nombre: nombreDePersona(p.nombre),
    a: p.asignadas,
    b: p.contactadas,
  }))
  const nota = notaDeTope(cola.por_persona_hay_mas, TOPE_DE_PERSONAS, 'persona')
  const [asignados, contactados] = ASIGNADOS_Y_CONTACTADOS
  return (
    <div className="@container grid gap-3">
      <div className="grid grid-cols-[minmax(0,1fr)] @md:grid-cols-3">
        <CifraDelWidget titulo="Turnos" valor={textoDeConteo(cola.total)} />
        <CifraDelWidget
          titulo="Tasa de contacto"
          valor={textoDeTasa(cola.tasa)}
          nota="Contactados / asignados, sin los directos"
        />
        <CifraDelWidget
          titulo="Mediana hasta Contacté"
          valor={textoDeMinutos(cola.mediana_minutos)}
        />
      </div>
      <ul
        aria-label="Turnos por estado"
        className="flex flex-wrap gap-x-4 gap-y-1 px-4 text-(length:--text-sm) text-(--color-ink-soft)"
      >
        {ESTADOS.map((estado) => (
          <li key={estado} className="min-w-0">
            {NOMBRES_DE_ESTADO_DEL_TURNO[estado]}: {textoDeConteo(cola.por_estado[estado])}
          </li>
        ))}
      </ul>
      {filas.length > 0 ? (
        <div className="grid gap-3 px-4 pb-4">
          <Ranking titulo="Turnos por persona" filas={filas} series={ASIGNADOS_Y_CONTACTADOS} />
          {nota ? <p className="text-(length:--text-sm) text-(--color-ink-soft)">{nota}</p> : null}
          <TablaEquivalente
            titulo="Turnos por persona"
            primera="Persona"
            columnas={[asignados.nombre, contactados.nombre]}
            filas={filas.map((f) => ({ clave: f.id, etiqueta: f.nombre, a: f.a, b: f.b }))}
          />
        </div>
      ) : null}
    </div>
  )
}
