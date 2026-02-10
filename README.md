# BBRC Digital

Versao digital da **Bateria Breve de Rastreio Cognitivo (BBRC)**, instrumento de rastreio cognitivo desenvolvido por Nitrini et al. (1994) e recomendado pela Academia Brasileira de Neurologia.

## O que e

Uma aplicacao web (arquivo unico `index.html`) que aplica a BBRC completa usando:

- **Voz sintetica** para dar as instrucoes de cada etapa
- **Reconhecimento de voz** (Web Speech API) para capturar as respostas do paciente
- **Pontuacao automatica** comparando a transcricao com as figuras-alvo e lista de animais
- **Canvas de desenho** para o Teste do Relogio com analise heuristica

## Etapas do teste

O fluxo segue o protocolo clinico padronizado:

| Etapa | O que acontece | Pontuacao |
|-------|---------------|-----------|
| 1. Nomeacao | Paciente nomeia 10 figuras mostradas | 0-10 |
| 2. Memoria Incidental | Figuras escondidas, paciente evoca de memoria | 0-10 |
| 3. Memoria Imediata | Exposicao 30s + evocacao | 0-10 |
| 4. Aprendizado | Exposicao 30s + evocacao | 0-10 |
| 5. Fluencia Verbal | Dizer nomes de animais por 1 minuto | contagem |
| 6. Teste do Relogio | Desenhar relogio marcando 11h10 | 0-5 (Shulman) |
| 7. Memoria Tardia | Evocar figuras apos ~5min de interferencia | 0-10 |
| 8. Reconhecimento | Identificar 10 figuras originais entre 20 | 0-10 |
| 9. Relatorio | Exibe resultados com pontos de corte | - |

## Como funciona o codigo

Tudo esta em `index.html` usando React 18 + Babel (transpilacao no browser) + Tailwind CSS (CDN).

### Estrutura principal

- **Constantes**: listas de figuras-alvo, sinonimos aceitos, ~200 animais, fases do teste, instrucoes de voz, criterios de Shulman
- **`normalize()`**: remove acentos e caracteres especiais para comparacao de texto
- **`matchTargetFigures()`**: compara a transcricao com as 10 figuras-alvo (aceita sinonimos como jabuti=tartaruga)
- **`matchAnimals()`**: conta animais unicos na transcricao da fluencia verbal
- **`speakText()`**: TTS via SpeechSynthesis, fala a instrucao uma unica vez por etapa
- **`analyzeClockDrawing()`**: analisa o canvas do relogio por heuristica (circularidade, distribuicao de quadrantes, presenca de ponteiros)
- **`useSpeechRecognition()`**: hook React que gerencia o microfone com auto-restart e cleanup

### Componentes por fase

Cada fase do teste e um componente isolado:

- `WelcomePhase` — tela inicial
- `NamingPhase` — mostra imagem + mic
- `RecallPhase` — figuras escondidas + mic (reutilizado para Incidental, Imediata, Aprendizado, Tardia)
- `ExposurePhase` — mostra imagem com timer de 30s (reutilizado para Imediata e Aprendizado)
- `FluencyPhase` — timer de 1 minuto + contagem de animais em tempo real
- `ClockPhase` — canvas de desenho + analise + selecao de pontuacao Shulman
- `RecognitionPhase` — mostra 20 figuras + mic
- `ReportPhase` — resultados com pontos de corte ABN 2022

### Fluxo de dados

1. O `App` controla a fase atual (`phase`) e os escores (`scores`)
2. Ao avancar de fase, `scoreAndAdvance()` para o mic, pontua a transcricao e limpa para a proxima fase
3. Cada componente de fase fala sua instrucao no `useEffect` de montagem e ativa o mic somente apos a instrucao terminar
4. O hook `useSpeechRecognition` e compartilhado por todas as fases

## Arquivos

| Arquivo | Descricao |
|---------|-----------|
| `index.html` | Aplicacao completa (React + logica + UI) |
| `bbrc_estimulos.jpg` | Prancha com 10 figuras-estimulo |
| `bbrc_reconhecimento.jpg` | Prancha com 20 figuras (10 originais + 10 distratoras) |

## Como usar

1. Abrir `index.html` em um navegador moderno (Chrome ou Edge recomendados)
2. Permitir acesso ao microfone quando solicitado
3. Seguir as instrucoes de voz em cada etapa
4. No final, o relatorio pode ser impresso ou salvo como PDF

## Requisitos

- Navegador com suporte a Web Speech API (Chrome, Edge)
- Microfone funcional
- Alto-falantes ou fones para ouvir as instrucoes

## Referencias

- Nitrini R et al. Arq Neuropsiquiatr, 1994
- Smid J et al. Dement Neuropsychol, 2022 (Consenso ABN)
