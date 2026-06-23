#!/usr/bin/env node
/*
  Build do BBRC Digital.

  Gera um index.html AUTOCONTIDO a partir de src/app.jsx:
  - Transpila o JSX para JavaScript puro (sem Babel em tempo de execucao)
  - Embute React e ReactDOM (vendor/) diretamente no HTML
  - Embute o CSS (src/styles.css)

  Resultado: a pagina funciona mesmo sem acesso a CDNs (unpkg/Babel),
  o que evita a tela em branco em redes/dispositivos que bloqueiam ou
  atrasam esses recursos. Tailwind continua via CDN (se falhar, a pagina
  apenas perde estilo — nao fica em branco).

  Uso:  npm install  &&  node build.js
*/
const fs = require('fs');
const path = require('path');
const babel = require('@babel/core');

const root = __dirname;
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

const jsx = read('src/app.jsx');
const css = read('src/styles.css');
const react = read('vendor/react.production.min.js');
const reactDom = read('vendor/react-dom.production.min.js');

const { code } = babel.transformSync(jsx, {
    presets: [['@babel/preset-react', { runtime: 'classic' }]],
    compact: false,
    comments: false,
});

// </script> dentro do codigo quebraria o bloco; escapa por seguranca.
const safe = (s) => s.replace(/<\/script>/gi, '<\\/script>');

const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="theme-color" content="#1d4ed8">
    <title>BBRC Digital — Autoaplicável</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
${css.trim()}
    </style>
</head>
<body>
    <div id="root"></div>
    <noscript>
        <div style="max-width:560px;margin:40px auto;padding:24px;font-family:sans-serif;text-align:center;color:#334155">
            <h2>Ative o JavaScript</h2>
            <p>Esta aplicação precisa de JavaScript ativado para funcionar. Habilite o JavaScript no seu navegador e recarregue a página.</p>
        </div>
    </noscript>
    <script>${safe(react)}</script>
    <script>${safe(reactDom)}</script>
    <script>
/* Gerado por build.js a partir de src/app.jsx — não edite este bloco diretamente. */
${safe(code)}
    </script>
</body>
</html>
`;

fs.writeFileSync(path.join(root, 'index.html'), html);
console.log('index.html gerado (' + html.length + ' bytes).');
