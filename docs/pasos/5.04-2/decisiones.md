## 2026-11-11 — 5.04-2: la lista de fases

Las decisiones D1 a D17 del plan (`.piloto/planes/5.04.md`) siguen en pie; esta parte cumple D1, D3, D4, D5, D13, D14 y D16. Lo que cambió o se precisó:

- **Sin segunda planificación.** El plan del 5.04 ya traía `Precondiciones` y `Conducta` de las tres partes; la 5.04-2 salió de ahí, sin otra pasada del planificador.
- **El estado de cada escritura vive en su componente.** `accionesDeFila` y `accionesDeLaLista` son huecos separados que sólo comparten la URL: cada uno lleva su
  `useListaDeFases()` (una escritura a la vez por componente) y el foco tras mover lo guarda la fila (`useFocoTrasMover` con la firma del orden).
- **D4 afinada · una jubilada no abre «Jubilar o eliminar» por URL:** `motivoParaNoQuitarFase` dice «Esa fase ya está jubilada: reactívala si la quieres usar.» y la URL se
  limpia; en el «⋯» una jubilada sólo ofrece Editar y Reactivar.
- **Conflicto (`PT409`):** va al aviso de arriba del flujo (`avisarConflicto`); en el modal de «Nueva fase», al aviso del propio modal con «Recargar», que se va cuando llega
  la versión nueva. Lo escrito queda.
- **Crear con un corte de red:** igual que el 5.09, lo escrito queda y sale solo al volver la conexión con el mismo id de intento. Si el servidor ya la había creado, la
  base contesta «Esa fase ya existe.» y la persona ve la lista releída (queda anotado: la base no es idempotente por id).
- **Reactivar** no ofrece «Deshacer» (C5): avisa «Fase «X» reactivada.»; si una regla del flujo lo impide, el `23514` se dice tal cual.
- **El e2e nuevo ya existe** (`e2e/configuracion-flujos-fases.spec.ts`, parte 1 del recorrido): la 5.04-3 lo completa con el inspector, el portal y la jubilación con historial.
