"""Monta a página publicada (Artifact) a partir do build do Angular: CSS e JS embutidos,
dados em cmed-data.js ao lado. Rode depois de `npm run build` dentro de app/."""
import glob, os, re

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIST = os.path.join(RAIZ, 'app', 'dist', 'app', 'browser')
SAIDA = os.path.join(RAIZ, 'publicar')

css = open(glob.glob(os.path.join(DIST, 'styles-*.css'))[0], encoding='utf-8').read()
js = open(glob.glob(os.path.join(DIST, 'main-*.js'))[0], encoding='utf-8').read()
js = re.sub(r'</(script)', r'<\/\1', js, flags=re.I)

pagina = f'''<title>PreçoMed</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@500;600&family=Public+Sans:wght@400;500;600;700;800&display=swap">
<style>{css}</style>
<app-root></app-root>
<script src="cmed-data.js"></script>
<script type="module">{js}</script>
'''
os.makedirs(SAIDA, exist_ok=True)
open(os.path.join(SAIDA, 'precomed.html'), 'w', encoding='utf-8').write(pagina)
print('ok', len(pagina))
