# peak-vibe

Копия экрана силы Withrandir (свайп вверх после выбора цвета) для отработки момента пика (сила 95–100) до переноса в Swift.

- `src.html` — исходник: токены и формулы из `DesignTokens.swift`, `Orb.swift`, `Stage.swift`, `Pillow.swift`.
- `orbs.engine.js` — движок `thinking-orbs@0.3.2` (MIT, Jakub Antalik) одним IIFE; тот же, что портирован в `Vendor/ThinkingOrbsKit`.
- `wizard.svg` — иконка мага из `Design/Wizard.svg`.
- `python3 build.py` собирает `index.html`.
- `out/` — видео: сравнение «сейчас / новый пик» и новый пик отдельно.

Параметры: `?mode=now|peak`, `?c=red|blue|…`, `?demo=1` — автосвайп, `?rec=1` — только телефон.
Новые величины собраны в объекте `PEAK` — это будущий `DesignTokens.Peak`.
