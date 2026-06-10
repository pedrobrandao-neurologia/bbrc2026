# BBRC Digital — Autoaplicável

Versao digital **autoaplicavel** da **Bateria Breve de Rastreio Cognitivo (BBRC)**, instrumento de rastreio cognitivo desenvolvido por Nitrini et al. (1994) e recomendado pela Academia Brasileira de Neurologia. Funciona em **celular, tablet ou computador**, sem necessidade de examinador.

## O que e

Uma aplicacao web (arquivo unico `index.html`) que aplica a BBRC completa usando apenas tecnologias **gratuitas e nativas do navegador**:

- **Voz sintetica** (Web Speech API / SpeechSynthesis) para todas as instrucoes
- **Reconhecimento de voz** (Web Speech API / SpeechRecognition) para capturar as respostas
- **Pontuacao automatica de TODAS as tarefas**, incluindo o Teste do Relogio (analise geometrica dos tracos)
- **Auto-avanco**: o teste avanca sozinho por deteccao de silencio ou pelo comando de voz **"terminei"**
- **Fallback por digitacao** quando o navegador nao tem reconhecimento de voz (ex.: alguns Safari/Firefox)

## Etapas do teste

| Etapa | O que acontece | Pontuacao automatica |
|-------|---------------|-----------|
| Preparacao | Escolaridade/idade + teste guiado de som e microfone | - |
| 1. Nomeacao | Nomear 10 figuras em voz alta | 0-10 (sinonimos + fuzzy matching) |
| 2. Memoria Incidental | Evocar as figuras sem ver | 0-10 |
| 3. Memoria Imediata | Exposicao 30s + evocacao | 0-10 |
| 4. Aprendizado | Exposicao 30s + evocacao | 0-10 |
| 5. Fluencia Verbal | Nomes de animais em 1 minuto | contagem (variantes da mesma especie contam 1x) |
| 6. Teste do Relogio | Desenhar relogio marcando 11h10 | 0-5 (Shulman, analise geometrica dos tracos) |
| Pausa | Garante >= 5 min de interferencia desde o aprendizado | - |
| 7. Memoria Tardia | Evocacao tardia | 0-10 |
| 8. Reconhecimento | Identificar as 10 figuras originais entre 20 | 0-10 (**acertos − falsos positivos**, usando os 10 distratores da prancha) |
| 9. Relatorio | Resultados com pontos de corte, desenho do relogio, transcricoes e exportacao | - |

## Boas praticas de testagem cognitiva digital incorporadas

- **Verificacao previa de hardware**: teste guiado de alto-falante e microfone antes de comecar
- **Padronizacao de tempos**: 30s de exposicao, 60s de fluencia, ate 3 min para o relogio, janelas maximas de resposta por etapa
- **Intervalo de interferencia minimo de 5 minutos** entre o aprendizado e a memoria tardia (pausa automatica se as tarefas de interferencia forem rapidas)
- **Auto-avanco por silencio** com aviso visual + **lembrete falado** se o participante nao responder
- **Tolerancia a erros do reconhecimento de voz**: normalizacao de acentos, sinonimos (ex.: jabuti = tartaruga) e distancia de Levenshtein
- **Pontuacao corrigida do reconhecimento**: acertos menos falsos positivos (os 10 distratores da prancha sao conhecidos pelo app)
- **Registro do processo**: transcricoes integrais, intrusoes, perseveracoes, duracao de cada etapa e imagem do desenho do relogio no relatorio (revisao clinica posterior)
- **Tela sempre ligada** durante o teste (Wake Lock API) e aviso ao tentar fechar a pagina
- **Acessibilidade**: botoes grandes, botao "Repetir instrucao" em todas as etapas, `aria-live` na transcricao
- **Privacidade**: nenhum dado sai do aparelho; resultados ficam no `localStorage` e podem ser exportados em JSON

## Como funciona o codigo

Tudo esta em `index.html` usando React 18 + Babel (transpilacao no browser) + Tailwind CSS (CDN).

### Logica de pontuacao

- **`normalize()` / `levenshtein()` / `fuzzyMatch()`**: comparacao tolerante a acentos e erros de transcricao
- **`matchTargetFigures()`**: compara a transcricao com as 10 figuras-alvo (sinonimos + fuzzy) e registra intrusoes
- **`scoreRecognition()`**: acertos − falsos positivos (distratores: caminhao, ferro, manga, folha, chaleira, bicicleta, banana, navio, porco, paleto)
- **`matchAnimals()`**: conta animais unicos; variantes da mesma especie (boi/vaca/touro) contam uma vez; registra perseveracoes
- **`analyzeClockStrokes()`**: pontua o relogio (Shulman 0-5) analisando os tracos: ajuste de circulo por minimos quadrados, cobertura angular, deteccao de ponteiros (tracos retos partindo do centro, angulos de 11h10), contagem e distribuicao dos numeros pelos quadrantes

### Fluxo autoaplicavel

- **`useSpeechRecognition()`**: microfone com auto-restart, transcricao parcial (interim) e correcao do bug de duplicacao (usa `resultIndex`)
- **`useAutoAdvance()`**: avanca a etapa apos silencio (com resposta) ou tempo maximo; fala um lembrete se nao houver resposta
- **Comando de voz "terminei"** encerra qualquer etapa de resposta falada
- **`speakText()`**: TTS em pedacos (evita corte de falas longas no Chrome) com timeout de seguranca
- **`useWakeLock()`**: impede que a tela apague durante o teste

## Arquivos

| Arquivo | Descricao |
|---------|-----------|
| `index.html` | Aplicacao completa (React + logica + UI) |
| `bbrc_estimulos.jpg` | Prancha com 10 figuras-estimulo |
| `bbrc_reconhecimento.jpg` | Prancha com 20 figuras (10 originais + 10 distratoras) |

## Como usar

1. Publicar os arquivos em um servidor **HTTPS** (ex.: GitHub Pages, gratuito) — o reconhecimento de voz exige contexto seguro
2. Abrir no **Google Chrome** ou **Microsoft Edge** (celular, tablet ou computador)
3. Seguir a preparacao guiada (escolaridade, teste de som e de microfone)
4. Realizar o teste respondendo em voz alta; dizer **"terminei"** ao fim de cada resposta
5. No final, imprimir/salvar PDF ou baixar os dados em JSON

> Em navegadores sem reconhecimento de voz, o teste oferece automaticamente um campo para **digitar** as respostas.

## Requisitos

- Navegador com Web Speech API (Chrome ou Edge recomendados; para voz)
- Microfone e alto-falantes/fones
- Conexao com a internet (o reconhecimento de voz do Chrome usa servico online gratuito do navegador)

## Avisos

Este e um instrumento de **rastreio** com pontuacao automatizada (reconhecimento de voz e analise computacional do desenho), sujeita a imprecisoes. Resultados abaixo dos pontos de corte indicam necessidade de avaliacao presencial. O resultado **nao constitui diagnostico**.

## Referencias

- Nitrini R et al. Arq Neuropsiquiatr, 1994
- Shulman KI. Int J Geriatr Psychiatry, 2000 (Teste do Relogio)
- Smid J et al. Dement Neuropsychol, 2022 (Consenso ABN)
