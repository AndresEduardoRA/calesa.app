# Paso 8.14-2 — El cierre de la Fase 8 (parte 2 de 2): el Nivel 3 y los docs de cierre

Fecha: 2026-11-13 (`TZ=America/La_Paz date +%F`). Sin compuertas ni preguntas abiertas. El plan: `.piloto/planes/8.14-2.md`.

- **D1** El Nivel 3 corre sobre la rama unida a `main` al empezar (`3179fc8e`, con el 9.06), antes de los docs: los docs no cambian lo que prueba el
  e2e y así el completo no espera a que se escriban.
- **D2** Una unión de `main` que entre después del Nivel 3 no repite el completo aunque traiga código: lo prueba el CI del PR, y la bitácora da los dos
  SHA (como el 7.14-2).
- **D3** El hueco D9 del 8.14-1 nace como **8-14a** en «Los decide la persona»: decide qué ve un rol, y un cierre no cambia permisos. Recomendado: dejarlo
  (quien atiende la web crea el lead).
- **D4** Lo que no corre en el completo (unidad, `db:probar`) va en la tabla de criterios con el resultado de su última corrida y dónde, no como «verde
  del Nivel 3».
- **D5** `db:probar` y `db:lint` locales sólo si un `fix` toca `supabase/`: la rama no cambió la base y el CI del PR los corre sobre la unión con el 9.06.
- **D6** El D4 del 8.05-1 (vincular una solicitud ya contactada pide una RPC) no tenía nombre de abierto: se llama **8-05a**, con el mismo molde que los
  8-13x (paso de origen y letra), para poder citarlo desde ESTADO y la ficha de `web`.
- **D7** Van a «Los decide la persona» los abiertos que piden migración, `security definer`, permisos o dinero (8-05a, 8-13a, 8-13c a 8-13f y 8-14a); 8-13b
  (un formulario con una RPC que ya existe) y la IP real tras la reescritura (espera al sitio) quedan como abiertos de la fase con su lugar, y la
  seguridad de 8.10-1 y de los pagos de repuestos, en «Pulido para la Fase 9», como pidieron sus pasos.
- **D8** La contradicción 5 (`ruta = '/notificaciones'`) se da por cerrada: la pantalla existe desde el 7.02, `notificaciones/entities/tipos.ts` lista
  `turno_web` y ninguna migración de noviembre cambió esa `ruta`.
- **D9** En «Riesgos y huecos» sólo se marca «Resuelto» lo que un doc de paso o un archivo comprueba; el Realtime, las escrituras directas, el volumen y
  «sin determinar» quedan como estaban.
