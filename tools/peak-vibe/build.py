# Собирает index.html: вставляет движок thinking-orbs 0.3.2 (MIT, esbuild IIFE) и иконку мага.
import pathlib, re
d = pathlib.Path(__file__).parent
s = (d / 'src.html').read_text()
wiz = re.sub(r'<svg width="69" height="65"', '<svg', (d / 'wizard.svg').read_text())
s = s.replace('<!--WIZARD-->', wiz).replace('/*ORBS*/', (d / 'orbs.engine.js').read_text())
(d / 'index.html').write_text(s)
print('index.html', len(s))
