import { errorDeCampo } from '@/shared/lib/formularios'
import { Bloque } from '@/shared/ui/bloque'
import { Campo } from '@/shared/ui/campo'
import { CampoSeleccion } from '@/shared/ui/campo-seleccion'
import type { AjustesEmpresa } from '../../../entities/ajustes-empresa'
import { MOTIVO_MONEDA_BASE_CON_DATOS } from '../../../entities/motivos'
import { LOCALES_SUGERIDOS } from '../../../entities/regional'
import type { Moneda } from '../../../entities/tipos-cambio'
import type { ErroresDeAjustes } from './campos-de-empresa'

type Props = {
  ajustes: AjustesEmpresa
  // Las monedas activas: entre ellas se elige la base.
  monedas: readonly Moneda[]
  // Las zonas horarias que conoce el servidor, para sugerir mientras se tipea.
  zonas: readonly string[]
  conDatosCargados: boolean
  errores: ErroresDeAjustes
}

export function BloqueRegion({ ajustes, monedas, zonas, conDatosCargados, errores }: Props) {
  return (
    <Bloque titulo="Región" descripcion="Cómo se escriben los números, las fechas y los montos.">
      <div className="grid items-start gap-4 sm:grid-cols-2">
        <Campo
          nombre="pais"
          etiqueta="País"
          autoComplete="country-name"
          maxLength={80}
          defaultValue={ajustes.pais}
          error={errorDeCampo(errores, 'pais')}
        />
        <Campo
          nombre="locale"
          etiqueta="Formato regional"
          list="locales-sugeridos"
          autoComplete="off"
          spellCheck={false}
          defaultValue={ajustes.locale}
          ayuda="Idioma y país, como es-BO: decide el separador de miles y el orden de la fecha."
          error={errorDeCampo(errores, 'locale')}
        />
        <datalist id="locales-sugeridos">
          {LOCALES_SUGERIDOS.map((locale) => (
            <option key={locale} value={locale} />
          ))}
        </datalist>
      </div>
      <Campo
        nombre="zonaHoraria"
        etiqueta="Zona horaria"
        list="zonas-horarias"
        autoComplete="off"
        spellCheck={false}
        defaultValue={ajustes.zonaHoraria}
        ayuda="Las fechas y las horas de toda la app se muestran en esta zona."
        error={errorDeCampo(errores, 'zonaHoraria')}
      />
      <datalist id="zonas-horarias">
        {zonas.map((zona) => (
          <option key={zona} value={zona} />
        ))}
      </datalist>
      <CampoSeleccion
        nombre="monedaBase"
        etiqueta="Moneda base"
        defaultValue={ajustes.monedaBase}
        disabled={conDatosCargados}
        opciones={monedas.map((moneda) => ({
          valor: moneda.codigo,
          etiqueta: `${moneda.codigo} · ${moneda.nombre}`,
        }))}
        ayuda={
          conDatosCargados
            ? MOTIVO_MONEDA_BASE_CON_DATOS
            : 'La moneda en la que se guardan los montos. Elígela antes de cargar datos: después no se cambia.'
        }
        error={errorDeCampo(errores, 'monedaBase')}
      />
    </Bloque>
  )
}
