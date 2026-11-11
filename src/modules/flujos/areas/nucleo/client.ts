// La API de cliente del NÚCLEO de `flujos` (5.02): sólo tipos de `entities/`. Sale por el `client.ts` de la raíz. Nada de servidor.
export type { FaseResumen } from '../../entities/fase'
export type {
  AmbitoDeFlujo,
  FaseParaConfigurar,
  FlujoConfigurable,
  FlujoParaConfigurar,
  RequisitoParaConfigurar,
  TransicionParaConfigurar,
} from '../../entities/flujo'
