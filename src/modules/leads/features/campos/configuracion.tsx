import type { Route } from 'next'
import Link from 'next/link'
import {
  TIPOS_DE_CAMPO_DE_LEAD,
  claveDeCampo,
  tipoEntre,
  type ImpactoDeCampo,
} from '@/shared/lib/campos'
import { RUTAS } from '@/shared/lib/rutas'
import { CampoSeleccion } from '@/shared/ui/campo-seleccion'
import type {
  BanderaDeCampo,
  ConfiguracionDeCampos,
  ContextoDelHueco,
  TextosDelEditor,
  ValoresDeCampo,
} from '@/shared/ui/campos'
import {
  cambiosRespectoDe,
  necesitaVistaPrevia,
  type CambiosDeCampoDeLead,
} from '../../entities/cambios-de-campo'
import {
  AVISO_DE_PRIVACIDAD,
  CLAVES_RESERVADAS_DE_LEAD,
  DATOS_DE_LA_EMPRESA,
  INSIGNIA_DE_PRIVACIDAD,
  soloCarteraPorTipo,
  type CampoDeLead,
  type DatoDeLaEmpresa,
  type DatosDeLaEmpresa,
} from '../../entities/campo'
import { resumenDeEliminacion, resumenDeImpacto } from '../../entities/impacto'
import { MOTIVO_SIN_PERMISO_LEADS } from '../../entities/motivos'
import type { esquemaCrearCampo } from './schemas/campos'
import type { z } from 'zod'

type NuevoCampo = z.input<typeof esquemaCrearCampo>

const EMPRESA = 'valorDefectoEmpresa'

const TEXTOS: TextosDelEditor = {
  titulo: 'Campos de los leads',
  vacioTitulo: 'Los leads no tienen campos activos',
  vacioDescripcion:
    'Un lead sólo llevará su nombre, su teléfono, su tipo y su origen. Agrega los datos que tu equipo necesita.',
  motivoSinPermiso: MOTIVO_SIN_PERMISO_LEADS,
  panelNuevo: 'Campo nuevo',
  panelDescripcionNuevo: 'Un dato propio de tus leads: prospectos y clientes llevan los mismos.',
  panelDescripcionExistente: 'Cómo se ve y se usa este dato en los leads, y quién lo recibe.',
  claveDuplicada: 'Ya hay un campo con un nombre parecido en los leads.',
  borrador: 'lead-campo',
}

const BANDERAS: readonly BanderaDeCampo[] = [
  {
    clave: 'requerido',
    etiqueta: 'Requerido',
    ayuda:
      'El lead no se guarda sin este dato y el alta rápida lo pide: cada dato obligatorio la hace más lenta.',
    enFila: false,
  },
  {
    clave: 'enTabla',
    etiqueta: 'En la tabla',
    ayuda: 'Es una columna del listado de leads.',
    enFila: true,
  },
  {
    clave: 'filtrable',
    etiqueta: 'Filtrable',
    ayuda: 'Entra al panel de filtros del listado.',
    enFila: true,
  },
  {
    clave: 'soloCartera',
    etiqueta: 'Solo la cartera',
    ayuda:
      'Sólo lo recibe quien tiene el lead en su cartera, como el teléfono. Quien ve el lead sin tenerlo no lo ve, ni en pantalla ni al filtrar.',
    enFila: true,
  },
]

function valoresIniciales(campo: CampoDeLead | null): ValoresDeCampo {
  if (campo === null) {
    return {
      etiqueta: '',
      clave: '',
      tipo: 'texto',
      opciones: [],
      grupo: '',
      activo: true,
      valorDefecto: null,
      banderas: { requerido: false, enTabla: false, filtrable: false, soloCartera: false },
      textos: { [EMPRESA]: '' },
    }
  }
  return {
    etiqueta: campo.etiqueta,
    clave: campo.clave,
    tipo: campo.tipo,
    opciones: campo.opciones,
    grupo: campo.grupo ?? '',
    activo: campo.activo,
    valorDefecto: campo.valorDefecto,
    banderas: {
      requerido: campo.requerido,
      enTabla: campo.enTabla,
      filtrable: campo.filtrable,
      soloCartera: campo.soloCartera,
    },
    textos: { [EMPRESA]: campo.valorDefectoEmpresa ?? '' },
  }
}

const vacioANulo = (texto: string) => (texto.trim() === '' ? null : texto.trim())

// El dato de la empresa elegido, o null. Sólo vale en un campo de texto.
function datoDeLaEmpresa(valores: ValoresDeCampo): DatoDeLaEmpresa | null {
  const elegido = valores.textos[EMPRESA]
  return valores.tipo === 'texto'
    ? (DATOS_DE_LA_EMPRESA.find((dato) => dato === elegido) ?? null)
    : null
}

// Lo que la persona dejó en el formulario, medido contra lo guardado: sólo viaja lo que cambió.
// Con el dato de la empresa elegido no hay valor fijo: son excluyentes.
function cambiosDe(campo: CampoDeLead, valores: ValoresDeCampo): CambiosDeCampoDeLead {
  const { banderas } = valores
  const empresa = datoDeLaEmpresa(valores)
  return cambiosRespectoDe(campo, {
    etiqueta: valores.etiqueta.trim(),
    tipo: tipoEntre(TIPOS_DE_CAMPO_DE_LEAD, valores.tipo, 'texto'),
    opciones: valores.opciones,
    requerido: banderas['requerido'] ?? false,
    grupo: vacioANulo(valores.grupo),
    enTabla: banderas['enTabla'] ?? false,
    filtrable: banderas['filtrable'] ?? false,
    soloCartera: banderas['soloCartera'] ?? false,
    activo: valores.activo,
    valorDefecto: empresa === null ? valores.valorDefecto : null,
    valorDefectoEmpresa: empresa,
  })
}

const NOMBRE_DEL_DATO: Record<DatoDeLaEmpresa, string> = { ciudad: 'La ciudad', pais: 'El país' }

type PropsDelHueco = { contexto: ContextoDelHueco; empresa: DatosDeLaEmpresa }

// «La de la empresa»: en vez de un valor fijo, el formulario de alta trae la ciudad o el país de
// Configuración › Empresa. Sigue a la empresa si cambia.
function HuecoDeLaEmpresa({ contexto, empresa }: PropsDelHueco) {
  const { valores, cambiarTexto, deshabilitado } = contexto
  if (valores.tipo !== 'texto') {
    return null
  }
  const elegido = datoDeLaEmpresa(valores)
  const sinCargar = elegido !== null && !empresa[elegido]?.trim()
  return (
    <div className="grid gap-1.5">
      <CampoSeleccion
        nombre={EMPRESA}
        etiqueta="Valor de la empresa"
        opciones={[
          { valor: '', etiqueta: 'Ninguno' },
          ...DATOS_DE_LA_EMPRESA.map((dato) => ({
            valor: dato,
            etiqueta: `${NOMBRE_DEL_DATO[dato]} de la empresa${empresa[dato]?.trim() ? ` (${empresa[dato]})` : ''}`,
          })),
        ]}
        value={valores.textos[EMPRESA] ?? ''}
        onChange={(evento) => {
          cambiarTexto(EMPRESA, evento.target.value)
        }}
        ayuda="Lo que trae puesto el alta en vez de un valor fijo. Elegirlo quita el valor por defecto."
        disabled={deshabilitado}
      />
      {sinCargar ? (
        <p className="text-(length:--text-sm) text-(--color-ink-faint)">
          La empresa todavía no lo tiene cargado: el alta saldrá vacía hasta que lo cargues en{' '}
          <Link href={RUTAS.empresa as Route} className="underline">
            Configuración › Empresa
          </Link>
          .
        </p>
      ) : null}
    </div>
  )
}

// Un cambio de privacidad que la base todavía aplica por lotes (9h): se dice en el panel, junto a «Solo la cartera».
function AvisoDePrivacidad({ campo }: { campo: CampoDeLead | undefined }) {
  if (campo?.privacidadPendiente == null) {
    return null
  }
  return (
    <p role="status" className="text-(length:--text-sm) text-(--color-ink-soft)">
      <span className="font-medium">{INSIGNIA_DE_PRIVACIDAD[campo.privacidadPendiente]}.</span>{' '}
      {AVISO_DE_PRIVACIDAD[campo.privacidadPendiente]}
    </p>
  )
}

type Contexto = { campos: readonly CampoDeLead[]; empresa: DatosDeLaEmpresa }

// Cómo el editor compartido arma, guarda y dice el layout de campos de los leads.
export function configuracionDeLeads({
  campos,
  empresa,
}: Contexto): ConfiguracionDeCampos<CampoDeLead, CambiosDeCampoDeLead, NuevoCampo> {
  return {
    textos: TEXTOS,
    banderas: BANDERAS,
    tipos: TIPOS_DE_CAMPO_DE_LEAD,
    textosLibres: [EMPRESA],
    valoresIniciales,
    claveDe: (etiqueta, existentes) =>
      claveDeCampo(etiqueta, existentes, CLAVES_RESERVADAS_DE_LEAD, {
        prefijo: 'c_',
        vacio: 'campo',
      }),
    paraCrear: (valores) => {
      const tipo = tipoEntre(TIPOS_DE_CAMPO_DE_LEAD, valores.tipo, 'texto')
      const dato = datoDeLaEmpresa(valores)
      return {
        clave: valores.clave,
        etiqueta: valores.etiqueta,
        tipo,
        opciones: valores.opciones,
        requerido: valores.banderas['requerido'] ?? false,
        grupo: valores.grupo,
        enTabla: valores.banderas['enTabla'] ?? false,
        filtrable: valores.banderas['filtrable'] ?? false,
        // Un tipo sensible nace privado aunque la persona no toque el interruptor.
        soloCartera: (valores.banderas['soloCartera'] ?? false) || soloCarteraPorTipo(tipo),
        valorDefecto: dato === null ? valores.valorDefecto : null,
        valorDefectoEmpresa: dato,
      }
    },
    cambiosDe,
    conBandera: (clave, valor) => ({ [clave]: valor }),
    necesitaVistaPrevia,
    resumenDeImpacto: (campo, cambios, impacto: ImpactoDeCampo) =>
      resumenDeImpacto(
        campo,
        cambios,
        impacto,
        campos.filter((otro) => otro.activo && otro.requerido && otro.id !== campo.id).length,
      ),
    resumenDeEliminacion,
    hueco: (contexto) => (
      <>
        <AvisoDePrivacidad campo={campos.find((campo) => campo.clave === contexto.valores.clave)} />
        <HuecoDeLaEmpresa contexto={contexto} empresa={empresa} />
      </>
    ),
    insignias: (campo) =>
      campo.privacidadPendiente === null ? [] : [INSIGNIA_DE_PRIVACIDAD[campo.privacidadPendiente]],
  }
}
