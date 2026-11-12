// Composición del área `requisitos` de `flujos` en el servidor (5.02, la llena el 5.08): une las interfaces de `entities/requisitos/` con su
// implementación de `infra/requisitos/`. Sale por la `composicion.ts` de la raíz.
import 'server-only'
import type {
  LectorDeFueraDeRegla,
  LectorDeImpactoDeRequisito,
  LectorDeOpcionesDeRequisitos,
  RepositorioDeRequisitos,
} from '../../entities/requisitos/repositorios'
import { leerFueraDeRegla as leerFuera } from '../../infra/requisitos/fuera-de-regla'
import { leerImpactoDeRequisito as leerImpacto } from '../../infra/requisitos/impacto'
import { leerOpcionesDeRequisitos as leerOpciones } from '../../infra/requisitos/opciones'
import { requisitosSupabase } from '../../infra/requisitos/escribir'

// Los tipos de documento que un requisito nombra, de un flujo (los de toda la empresa y los suyos).
export const leerOpcionesDeRequisitos: LectorDeOpcionesDeRequisitos = leerOpciones

// Cuántas unidades quedarían fuera de regla al volver bloqueante un requisito, y cuáles lo están hoy en un flujo.
export const leerImpactoDeRequisito: LectorDeImpactoDeRequisito = leerImpacto
export const leerFueraDeRegla: LectorDeFueraDeRegla = leerFuera

export const repositorioDeRequisitos: RepositorioDeRequisitos = requisitosSupabase
