"""Gera a versão de arquivo único (artefato Claude) do Tumulto: python3 tools/build-artifact.py saida.html
As imagens (maps/*, chars/*) são publicadas ao lado como arquivos; aqui só o HTML + JS embutidos."""
import re, sys, os
R = os.path.join(os.path.dirname(__file__), '..', 'public')
src = open(os.path.join(R, 'index.html'), encoding='utf-8').read()
out = sys.argv[1] if len(sys.argv) > 1 else 'tumulto.html'
s = src
s = re.sub(r'<!doctype html>\s*<html[^>]*>\s*<head>\s*', '', s, flags=re.I)
s = re.sub(r'<meta charset="utf-8">\s*', '', s)
s = re.sub(r'<meta name="viewport"[^>]*>\s*', '', s)
s = s.replace('<title>Tumulto</title>', '<title>Tumulto</title>\n<meta name="claude:viewport-fit-sides" content="cover">', 1)
s = re.sub(r'</head>\s*<body>\s*', '', s)
s = re.sub(r'\s*</body>\s*</html>\s*$', '\n', s)
pat = re.compile(r'<script src="config.js"></script>\s*<script src="sim.js"></script>\s*<script src="maps/manifest.js"></script>\s*<script src="arena.js"></script>\s*<script src="game.js"></script>')
assert pat.search(s), 'scripts não encontrados'
js = lambda f: open(os.path.join(R, f), encoding='utf-8').read().replace('</script', '<\\/script')
inl = '<script>window.TUMULTO_BUILD="artifact";</script>\n' + ''.join('<script>\n%s\n</script>\n' % js(f) for f in ['sim.js', 'maps/manifest.js', 'arena.js', 'game.js'])
s = pat.sub(lambda m: inl, s)
open(out, 'w', encoding='utf-8').write(s)
print(out, len(s))
