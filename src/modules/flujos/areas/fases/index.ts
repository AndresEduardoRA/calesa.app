// La API de servidor del área `fases` de `flujos` (5.02, la llena el 5.04). Sale por el `index.ts` de la raíz.
// Las lecturas de las fases son del núcleo (`leerFlujoParaConfigurar`); el área sólo escribe, por las actions de `features/fases/actions/`, que usan
// `composicion.ts`. Nada de este área sale hoy por aquí: ningún otro módulo la necesita.
export {}
