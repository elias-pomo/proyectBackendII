# Box Club Tucumán · Sistema de diseño

Fuente de verdad del front. Los tokens viven en `public/css/style.css` (`:root`).

## Marca
- Nombre: **BOX CLUB** (CLUB en rojo) con **TUCUMÁN** abajo, espaciado ancho.
- Monograma: **BC** en bloque rojo (`public/img/favicon.svg`).
- Personalidad: club de deportes de contacto, premium y sobrio. Negro de base, rojo como acento.

## Color

| Token | Hex | Uso |
|---|---|---|
| `--ring` | `#0B0B0B` | Fondo de página |
| `--carbon` | `#121110` | Paneles, diálogos, secciones alternas |
| `--lona-oscura` | `#161514` | Placeholders de foto |
| `--grafito` / `--linea` | `#242322` / `#2C2A28` | Bordes y separadores |
| `--hueso` | `#F2EFEA` | Texto principal |
| `--texto-2` | `#B8B2AA` | Texto de lectura secundario |
| `--lona` | `#8D8880` | Labels y metadatos |
| `--rojo` | `#D7191F` | Fondo de la acción principal (texto blanco, 5:1) |
| `--rojo-sangre` | `#9E1015` | Hover de la acción principal |
| `--rojo-vivo` | `#FF3B41` | Texto rojo chico sobre negro (≈5.7:1) |

Reglas:
- `--rojo` como texto solo en títulos grandes (≥ 24px). Para texto chico, `--rojo-vivo`.
- Un solo botón rojo por vista. Lo demás va en `btn-ghost` o `btn-text`.
- Las disciplinas no tienen color propio: se distinguen por su nombre.

## Tipografía (Google Fonts)

| Rol | Familia | Uso |
|---|---|---|
| Display | Anton | Títulos de página y horarios (`.display-*`, `.class-time`) |
| Condensada | Barlow Condensed 500–700 | Títulos de tarjetas, labels, navegación, botones (mayúsculas con tracking) |
| Lectura | Barlow 300–500 | Párrafos y datos (16px base, 300 para texto largo) |

## Componentes
- **Botón principal `.btn`:** rojo con corte diagonal (`--cut`). Variantes `.btn-lg` y `.btn-block`.
- **Secundarios:** `.btn-ghost` (contorno) y `.btn-text` (solo texto).
- **Etiquetas:** `.eyebrow` (línea roja + label) para abrir secciones y `.label` para metadatos.
- **Campos:** `.field`, con solo línea inferior. El foco pone la línea en rojo.
- **Cartelera:** `.day`, `.day-head` y `.class-row` (hora | título | cupo | acción).
- **Cupo:** `.meter` (barra de 2px) y `.seats` (un bloque por lugar).
- **Estados:** `.tag`, `.tag-red` (confirmada/publicada), `.tag-draft`, `.tag-off`, `.tag-solid` (admin).
- **Feedback:** `.alert` (línea izquierda), toasts (`showToast`), `<dialog class="dialog">` para confirmar acciones destructivas.
- **Vacío y carga:** `.empty` (título + acción) y `.skeleton`.

## Movimiento
- Entrada `rise` de 420ms, con escalonado de 40ms en listas (`.stagger`).
- Hover de 160ms. Al presionar, `scale(0.98)`.
- Todo se desactiva con `prefers-reduced-motion`.

## Accesibilidad
- Foco visible: `outline` de 2px en `--rojo-vivo`.
- Botones y enlaces de al menos 44px de alto. Los inputs usan 16px para que iOS no haga zoom.
- Los datos de usuarios se insertan siempre con `textContent` (`el()` en `public/js/utils.js`).
