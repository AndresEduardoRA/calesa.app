## 2026-11-12 · Decisiones del arreglo del CI del 8.12

- **D57 · El rojo se arregla en la app, no en la prueba:** una barra fija «Sin conexión» que no se va al volver la red tapa la pantalla a cualquiera que pierda la
  red un momento; esperar en el spec a que llegue el código del chat escondería eso. Es la primera mitad de 7-5, tal como la anotó el 7.14-1.
- **D58 · `useVueltaDeLaRed` a `src/shared/ui`:** lo usan dos módulos (campana y chat) y uno no importa adentro del otro. El archivo de `notificaciones` queda
  como reexportación porque un carril no borra lo del núcleo; el carril A puede borrarlo y apuntar la campana a `shared`.
