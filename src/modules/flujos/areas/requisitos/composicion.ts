// Composición del área `requisitos` de `flujos` en el servidor (5.02, la llena el 5.08): une las interfaces de `entities/requisitos/` con su
// implementación de `infra/requisitos/`. Sale por la `composicion.ts` de la raíz.
import 'server-only'
import type {
  LectorDeOpcionesDeRequisitos,
  RepositorioDeRequisitos,
} from '../../entities/requisitos/repositorios'
import { leerOpcionesDeRequisitos as leerOpciones } from '../../infra/requisitos/opciones'
import { requisitosSupabase } from '../../infra/requisitos/escribir'

// Los tipos de documento que un requisito nombra, de un flujo (los de toda la empresa y los suyos).
export const leerOpcionesDeRequisitos: LectorDeOpcionesDeRequisitos = leerOpciones

export const repositorioDeRequisitos: RepositorioDeRequisitos = requisitosSupabase
