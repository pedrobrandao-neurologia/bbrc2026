        const { useState, useEffect, useRef, useCallback, useMemo } = React;

        /* ==========================================================
           BBRC Digital — Bateria Breve de Rastreio Cognitivo
           Versão autoaplicável (sem supervisão), para celular,
           tablet e computador.

           Recursos (todos gratuitos, nativos do navegador):
           - Síntese de voz (SpeechSynthesis) para todas as instruções
           - Reconhecimento de voz (SpeechRecognition) para as respostas
           - Pontuação automática de TODAS as tarefas, inclusive o
             Teste do Relógio (análise geométrica dos traços)
           - Auto-avanço por detecção de silêncio + comando de voz
             ("terminei") — não exige examinador
           - Fallback por digitação quando não há microfone
           - Intervalo de interferência mínimo de 5 min antes da
             memória tardia (fidelidade ao protocolo)
           - Exportação dos resultados (JSON) e impressão/PDF

           Protocolo:
           1. Nomeação            2. Memória Incidental
           3. Memória Imediata    4. Aprendizado
           5. Fluência Verbal     6. Teste do Relógio
           (pausa de interferência se necessário)
           7. Memória Tardia      8. Reconhecimento
           9. Relatório
        ========================================================== */

        const APP_VERSION = '2.0.0';
        const MIN_INTERFERENCE_MS = 5 * 60 * 1000; // intervalo mínimo aprendizado → memória tardia

        /* ===== CONSTANTES ===== */

        const TARGET_FIGURES = ["sapato","casa","pente","chave","aviao","balde","tartaruga","livro","colher","arvore"];

        // Sinônimos e variações aceitas para cada figura-alvo
        const FIGURE_SYNONYMS = {
            "sapato": ["sapato","sapatos","calcado","tenis","bota","mocassim","sapatinho"],
            "casa": ["casa","casinha","lar","moradia","residencia"],
            "pente": ["pente","pentinho","pentes"],
            "chave": ["chave","chavinha","chaves"],
            "aviao": ["aviao","aviaozinho","aeronave","avioes","jato"],
            "balde": ["balde","baldinho","baldes","bacia"],
            "tartaruga": ["tartaruga","tartaruguinha","jabuti","cagado"],
            "livro": ["livro","livrinho","caderno","livros"],
            "colher": ["colher","colherzinha","colheres","talher"],
            "arvore": ["arvore","arvorezinha","arvores"]
        };

        // Distratores da prancha de reconhecimento (10 figuras que NÃO
        // faziam parte do grupo original) — usados para detectar falsos
        // positivos: pontuação = acertos − falsos positivos
        const DISTRACTOR_SYNONYMS = {
            "caminhao": ["caminhao","caminhaozinho","caminhonete","carreta"],
            "ferro": ["ferro","ferrinho","ferro de passar"],
            "manga": ["manga","mangas"],
            "folha": ["folha","folhinha","folhas"],
            "chaleira": ["chaleira","bule","cafeteira"],
            "bicicleta": ["bicicleta","bike","bicicletinha"],
            "banana": ["banana","bananas","bananinha"],
            "navio": ["navio","barco","transatlantico","navios"],
            "porco": ["porco","porquinho","leitao","porca"],
            "paleto": ["paleto","casaco","terno","blazer","jaqueta"]
        };

        // Lista de animais em português (sem termos genéricos como
        // "bicho", "animal", "ave" — não pontuam em fluência verbal)
        const ANIMAL_LIST = [
            "cachorro","cao","cadela","gato","gatinho","bichano","cavalo","egua","potro","vaca","boi","touro",
            "bezerro","bezerra","novilha","elefante","leao","leoa","tigre","onca","macaco","girafa","jacare",
            "cobra","passaro","passarinho","galinha","galo","pinto","pintinho","pato","ganso","rato","ratazana",
            "camundongo","coelho","peixe","baleia","tubarao","golfinho","urso","lobo","raposa","porco","leitao",
            "ovelha","carneiro","cordeiro","cabra","bode","cabrito","zebra","rinoceronte","hipopotamo","aguia",
            "falcao","gaviao","papagaio","arara","tucano","pinguim","foca","lontra","tamandua","tatu","capivara",
            "anta","veado","cervo","bufalo","jumento","burro","mula","formiga","abelha","mosca","borboleta",
            "mosquito","barata","aranha","sapo","ra","perereca","lagarto","lagartixa","calango","tartaruga",
            "jabuti","cagado","pombo","pomba","coruja","periquito","canario","codorna","cisne","flamingo",
            "peru","grilo","camarao","lagosta","caranguejo","siri","polvo","lula","sardinha","salmao","gorila",
            "camelo","dromedario","preguica","iguana","camaleao","caracol","lesma","besouro","escorpiao",
            "pantera","leopardo","chita","guepardo","hiena","canguru","coala","ornitorrinco","castor","texugo",
            "doninha","furao","gamba","esquilo","hamster","chinchila","panda","lhama","alpaca","iaque","bisao",
            "alce","rena","antilope","gazela","gnu","javali","suricato","mangusto","lince","jaguatirica",
            "mico","sagui","orangotango","chimpanze","bonobo","gibao","mandril","babuino","lemure","corvo",
            "gaivota","pelicano","cegonha","garca","colibri","beija-flor","andorinha","pardal","sabia",
            "bem-te-vi","cardeal","rouxinol","pavao","avestruz","ema","urubu","condor","harpia","crocodilo",
            "salamandra","piton","jiboia","sucuri","cascavel","naja","coral","surucucu","perdiz","seriema",
            "piranha","bagre","tilapia","truta","atum","bacalhau","robalo","dourado","pacu","pintado",
            "surubim","lambari","traira","cavalo-marinho","agua-viva","estrela-do-mar","ourico","mexilhao",
            "ostra","centopeia","lacraia","louva-deus","cigarra","libelula","joaninha","vespa","marimbondo",
            "cupim","piolho","pulga","carrapato","minhoca","sanguessuga","lombriga","maritaca","calopsita",
            "cacatua","tuiuiu","quati","cutia","paca","ouriço-cacheiro","morcego","toupeira","hienas",
            "tartaruga-marinha","arraia","enguia","carpa","bagre","cachorro-do-mato","lobo-guara","mico-leao"
        ];

        // Variações da mesma espécie contam apenas UMA vez (regra padrão
        // de correção da fluência verbal)
        const CANONICAL_ANIMALS = {
            "cao": "cachorro", "cadela": "cachorro", "cachorrinho": "cachorro", "cachorra": "cachorro",
            "gatinho": "gato", "bichano": "gato", "gata": "gato",
            "egua": "cavalo", "potro": "cavalo",
            "boi": "vaca", "touro": "vaca", "bezerro": "vaca", "bezerra": "vaca", "novilha": "vaca",
            "galo": "galinha", "pinto": "galinha", "pintinho": "galinha",
            "carneiro": "ovelha", "cordeiro": "ovelha",
            "bode": "cabra", "cabrito": "cabra",
            "leitao": "porco", "porca": "porco",
            "leoa": "leao",
            "pomba": "pombo",
            "ratazana": "rato",
            "jabuti": "tartaruga", "cagado": "tartaruga", "tartaruga-marinha": "tartaruga",
            "perereca": "sapo", "ra": "sapo",
            "beija-flor": "colibri",
            "dromedario": "camelo"
        };

        // Palavras ignoradas na detecção de intrusões
        const STOPWORDS = new Set([
            "que","uma","um","de","do","da","dos","das","os","as","no","na","nos","nas","tem","the","e","ou",
            "com","por","para","esse","essa","este","esta","aquele","aquela","mais","foi","era","ser","ter",
            "sim","nao","ai","ah","hum","entao","tipo","assim","la","ca","bem","bom","depois","antes","agora",
            "muito","pouco","acho","lembro","tinha","havia","vi","eu","voce","ele","ela","nos","meu","minha",
            "uns","umas","tambem","so","ja","ainda","outra","outro","coisa","coisas","figura","figuras",
            "desenho","imagem","primeiro","segundo","deixa","ver","sei","quero","pode","vamos",
            "terminei","acabei","pronto","fim","proxima","etapa"
        ]);

        // Comandos de voz que encerram a resposta da etapa
        const FINISH_REGEX = /\b(terminei|acabei|ja terminei|ja acabei)\b/;

        const PHASES = {
            WELCOME: 'welcome',
            NAMING: 'naming',
            INCIDENTAL: 'incidental',
            IMMEDIATE_SHOW: 'immediate_show',
            IMMEDIATE_RECALL: 'immediate_recall',
            LEARNING_SHOW: 'learning_show',
            LEARNING_RECALL: 'learning_recall',
            FLUENCY: 'fluency',
            CLOCK: 'clock',
            REST: 'rest',
            DELAYED: 'delayed',
            RECOGNITION: 'recognition',
            REPORT: 'report'
        };

        const PHASE_ORDER = [
            PHASES.WELCOME, PHASES.NAMING, PHASES.INCIDENTAL,
            PHASES.IMMEDIATE_SHOW, PHASES.IMMEDIATE_RECALL,
            PHASES.LEARNING_SHOW, PHASES.LEARNING_RECALL,
            PHASES.FLUENCY, PHASES.CLOCK, PHASES.REST,
            PHASES.DELAYED, PHASES.RECOGNITION, PHASES.REPORT
        ];

        // Instruções faladas (redigidas para autoaplicação)
        const PHASE_INSTRUCTIONS = {
            [PHASES.WELCOME]: "Bem-vindo à Bateria Breve de Rastreio Cognitivo. Este teste é guiado por voz e dura cerca de quinze minutos. Fique em um local silencioso e siga as instruções na tela.",
            [PHASES.NAMING]: "Você está vendo dez figuras. Diga em voz alta o nome de cada figura, uma de cada vez. Quando tiver falado todas, diga: terminei.",
            [PHASES.INCIDENTAL]: "Agora, sem olhar, diga quais figuras você acabou de ver. Diga todas as que conseguir lembrar. Quando acabar, diga: terminei.",
            [PHASES.IMMEDIATE_SHOW]: "Olhe novamente as figuras e tente memorizá-las. Você terá trinta segundos.",
            [PHASES.IMMEDIATE_RECALL]: "Agora diga em voz alta quais figuras você lembra. Quando acabar, diga: terminei.",
            [PHASES.LEARNING_SHOW]: "Vou mostrar as figuras mais uma vez, por trinta segundos. Tente guardar todas na memória.",
            [PHASES.LEARNING_RECALL]: "Diga novamente quais figuras você lembra. Quando acabar, diga: terminei.",
            [PHASES.FLUENCY]: "Agora você terá um minuto para falar o maior número possível de nomes de animais. Qualquer animal vale. Quando estiver pronto, toque no botão começar.",
            [PHASES.CLOCK]: "Agora desenhe na tela, com o dedo ou com o mouse, um relógio grande e redondo. Coloque todos os números, e desenhe os ponteiros marcando onze horas e dez minutos. Quando terminar, toque no botão finalizar.",
            [PHASES.REST]: "Muito bem. Vamos fazer uma pequena pausa. Relaxe e aguarde, o teste continuará automaticamente.",
            [PHASES.DELAYED]: "Lá no início do teste eu mostrei algumas figuras. Diga todas as figuras que você conseguir lembrar. Quando acabar, diga: terminei.",
            [PHASES.RECOGNITION]: "Você está vendo vinte figuras, mas só dez delas faziam parte do primeiro grupo. Diga o nome apenas das figuras que você viu antes. Quando acabar, diga: terminei."
        };

        const PHASE_LABELS = {
            [PHASES.WELCOME]: 'Preparação',
            [PHASES.NAMING]: '1. Nomeação',
            [PHASES.INCIDENTAL]: '2. Memória Incidental',
            [PHASES.IMMEDIATE_SHOW]: '3. Memória Imediata',
            [PHASES.IMMEDIATE_RECALL]: '3. Memória Imediata',
            [PHASES.LEARNING_SHOW]: '4. Aprendizado',
            [PHASES.LEARNING_RECALL]: '4. Aprendizado',
            [PHASES.FLUENCY]: '5. Fluência Verbal',
            [PHASES.CLOCK]: '6. Teste do Relógio',
            [PHASES.REST]: 'Pausa',
            [PHASES.DELAYED]: '7. Memória Tardia',
            [PHASES.RECOGNITION]: '8. Reconhecimento',
            [PHASES.REPORT]: 'Relatório'
        };

        const SHULMAN_CRITERIA = [
            { score: 5, label: "Relógio perfeito" },
            { score: 4, label: "Mínimo erro visuoespacial" },
            { score: 3, label: "Representação inadequada de 11h10, sem alteração visuoespacial maior" },
            { score: 2, label: "Erro visuoespacial moderado" },
            { score: 1, label: "Grande desorganização visuoespacial" },
            { score: 0, label: "Incapacidade de representar um relógio" }
        ];

        /* ===== NORMALIZAÇÃO E COMPARAÇÃO DE TEXTO ===== */

        function normalize(text) {
            return String(text).toLowerCase()
                .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
                .replace(/[^\w\s-]/g, ' ')
                .replace(/\s+/g, ' ')
                .trim();
        }

        // Distância de Levenshtein — tolera erros do reconhecimento de voz
        function levenshtein(a, b) {
            if (a === b) return 0;
            const m = a.length, n = b.length;
            if (!m) return n;
            if (!n) return m;
            let prev = Array.from({ length: n + 1 }, (_, i) => i);
            for (let i = 1; i <= m; i++) {
                const cur = [i];
                for (let j = 1; j <= n; j++) {
                    cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
                }
                prev = cur;
            }
            return prev[n];
        }

        function fuzzyMatch(word, target) {
            if (word === target) return true;
            const len = target.length;
            if (len < 5 || word.length < 4) return false;
            const maxDist = len >= 7 ? 2 : 1;
            if (Math.abs(word.length - len) > maxDist) return false;
            return levenshtein(word, target) <= maxDist;
        }

        function buildTokens(text) {
            const words = normalize(text).split(' ').filter(Boolean);
            const tokens = [...words];
            for (let i = 0; i < words.length - 1; i++) {
                tokens.push(words[i] + ' ' + words[i + 1]);
                tokens.push(words[i] + '-' + words[i + 1]);
            }
            for (let i = 0; i < words.length - 2; i++) {
                tokens.push(words[i] + '-' + words[i + 1] + '-' + words[i + 2]);
            }
            return { words, tokens };
        }

        const FIGURE_MATCHERS = Object.entries(FIGURE_SYNONYMS).map(([fig, syns]) => [fig, syns.map(normalize)]);
        const DISTRACTOR_MATCHERS = Object.entries(DISTRACTOR_SYNONYMS).map(([fig, syns]) => [fig, syns.map(normalize)]);
        const ANIMAL_NAMES = [...new Set(ANIMAL_LIST.map(normalize))];
        const ANIMAL_SET = new Set(ANIMAL_NAMES);

        /* ===== PONTUAÇÃO AUTOMÁTICA: FIGURAS ===== */

        function matchAgainst(text, matchers) {
            const empty = { count: 0, found: [], intrusions: [] };
            if (!text || !text.trim()) return empty;
            const { words, tokens } = buildTokens(text);
            const found = new Set();
            const matchedWords = new Set();
            for (const token of tokens) {
                for (const [figure, synonyms] of matchers) {
                    if (synonyms.some(s => fuzzyMatch(token, s))) {
                        found.add(figure);
                        token.split(/[\s-]+/).forEach(w => matchedWords.add(w));
                        break;
                    }
                }
            }
            const intrusions = [...new Set(words.filter(w =>
                !matchedWords.has(w) && w.length > 2 && !STOPWORDS.has(w)
            ))];
            return { count: found.size, found: [...found], intrusions };
        }

        function matchTargetFigures(text) {
            return matchAgainst(text, FIGURE_MATCHERS);
        }

        // Reconhecimento: pontuação corrigida = acertos − falsos positivos
        function scoreRecognition(text) {
            const hits = matchAgainst(text, FIGURE_MATCHERS);
            const falseAlarms = matchAgainst(text, DISTRACTOR_MATCHERS);
            const score = Math.max(0, Math.min(10, hits.count - falseAlarms.count));
            return {
                score,
                hits: hits.count,
                falseAlarms: falseAlarms.count,
                found: hits.found,
                distractorsNamed: falseAlarms.found
            };
        }

        /* ===== PONTUAÇÃO AUTOMÁTICA: FLUÊNCIA VERBAL ===== */

        function matchAnimals(text) {
            const empty = { count: 0, found: [], perseverations: 0 };
            if (!text || !text.trim()) return empty;
            const { tokens } = buildTokens(text);
            const found = new Set();
            let rawMatches = 0;
            for (const token of tokens) {
                let name = null;
                if (ANIMAL_SET.has(token)) {
                    name = token;
                } else if (token.length >= 5 && !token.includes(' ')) {
                    name = ANIMAL_NAMES.find(a => fuzzyMatch(token, a)) || null;
                }
                if (name) {
                    rawMatches++;
                    found.add(CANONICAL_ANIMALS[name] || name);
                }
            }
            return {
                count: found.size,
                found: [...found],
                perseverations: Math.max(0, rawMatches - found.size)
            };
        }

        /* ===== VOZ SINTÉTICA (TTS — SpeechSynthesis, gratuito) ===== */

        let bestVoice = null;

        function loadVoices() {
            const voices = window.speechSynthesis ? window.speechSynthesis.getVoices() : [];
            if (!voices.length) return;
            const ptBR = voices.filter(v => v.lang && v.lang.replace('_', '-').startsWith('pt-BR'));
            const pt = voices.filter(v => v.lang && v.lang.startsWith('pt'));
            bestVoice = ptBR.find(v => /google/i.test(v.name)) ||
                        pt.find(v => /google/i.test(v.name)) ||
                        ptBR.find(v => /luciana|fernanda|francisca|premium|enhanced|natural|neural/i.test(v.name)) ||
                        ptBR[0] || pt[0] || null;
        }

        if (window.speechSynthesis) {
            loadVoices();
            window.speechSynthesis.onvoiceschanged = loadVoices;
        }

        let speakSession = 0;

        // Velocidade da fala sintética. 1.0 é o padrão do navegador; um valor
        // um pouco acima deixa as instruções mais ágeis (evita que o participante
        // se canse com a lentidão), sem prejudicar a inteligibilidade para idosos.
        const SPEECH_RATE = 1.1;

        // Fala um texto dividido em sentenças (evita o corte de falas longas no
        // Chrome) e com timeout de segurança caso onend não dispare.
        //
        // Robustez contra um bug conhecido do Chrome: um speak() disparado logo
        // após um cancel() é, às vezes, silenciosamente descartado — era o que
        // fazia a instrução "não falar" em algumas transições de etapa (ex.: as
        // evocações que vêm logo após a exposição das figuras). Por isso:
        //   1) há um pequeno atraso entre cancel() e o primeiro speak();
        //   2) chamamos resume() antes de cada speak() (o Chrome pode auto-pausar);
        //   3) um watchdog reenvia o trecho caso nada tenha começado a falar.
        function speakText(text) {
            return new Promise((resolve) => {
                const synth = window.speechSynthesis;
                if (!synth || !text) { resolve(); return; }
                synth.cancel();
                const session = ++speakSession;
                const chunks = (text.match(/[^.!?]+[.!?]*/g) || [text]).map(c => c.trim()).filter(Boolean);
                let idx = 0;
                let done = false;
                let retries = 0;
                const MAX_RETRIES = 4;
                const resumeIv = setInterval(() => { try { synth.resume(); } catch (e) {} }, 8000);
                const finish = () => {
                    if (done) return;
                    done = true;
                    clearInterval(resumeIv);
                    clearTimeout(safety);
                    resolve();
                };
                const safety = setTimeout(finish, Math.max(6000, text.length * 130));
                const speakChunk = () => {
                    if (session !== speakSession) { finish(); return; }
                    if (idx >= chunks.length) { finish(); return; }
                    const u = new SpeechSynthesisUtterance(chunks[idx++]);
                    u.lang = 'pt-BR';
                    if (bestVoice) u.voice = bestVoice;
                    u.rate = SPEECH_RATE;
                    u.pitch = 1.0;
                    u.volume = 1.0;
                    let advanced = false;
                    const advance = () => { if (advanced) return; advanced = true; speakChunk(); };
                    u.onend = advance;
                    u.onerror = advance;
                    try { synth.resume(); } catch (e) {}
                    synth.speak(u);
                    // Watchdog: se o speak() foi engolido (nada começou a falar),
                    // refaz este mesmo trecho — até MAX_RETRIES vezes no total.
                    setTimeout(() => {
                        if (advanced || session !== speakSession) return;
                        if (!synth.speaking && !synth.pending && retries < MAX_RETRIES) {
                            retries++;
                            u.onend = null; u.onerror = null; // neutraliza o utterance morto
                            advanced = true;
                            idx--;                            // refaz o mesmo trecho
                            try { synth.resume(); } catch (e) {}
                            speakChunk();
                        }
                    }, 500);
                };
                // Atraso entre cancel() e o primeiro speak() (contorna o bug do Chrome).
                setTimeout(speakChunk, 140);
            });
        }

        function stopSpeaking() {
            speakSession++;
            if (window.speechSynthesis) window.speechSynthesis.cancel();
        }

        /* ===== SINAL SONORO (WebAudio) ===== */

        let audioCtx = null;
        function playBeep(freq = 880, duration = 0.25) {
            try {
                audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
                const osc = audioCtx.createOscillator();
                const gain = audioCtx.createGain();
                osc.frequency.value = freq;
                osc.type = 'sine';
                gain.gain.setValueAtTime(0.25, audioCtx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
                osc.connect(gain).connect(audioCtx.destination);
                osc.start();
                osc.stop(audioCtx.currentTime + duration);
            } catch (e) {}
        }

        /* ===== ANÁLISE GEOMÉTRICA DO RELÓGIO (pontuação automática) ===== */

        // Ajuste de círculo por mínimos quadrados (método de Kasa)
        function fitCircle(pts) {
            const n = pts.length;
            if (n < 3) return null;
            let sx = 0, sy = 0;
            for (const p of pts) { sx += p.x; sy += p.y; }
            const mx = sx / n, my = sy / n;
            let suu = 0, suv = 0, svv = 0, suuu = 0, svvv = 0, suvv = 0, svuu = 0;
            for (const p of pts) {
                const u = p.x - mx, v = p.y - my;
                suu += u * u; suv += u * v; svv += v * v;
                suuu += u * u * u; svvv += v * v * v;
                suvv += u * v * v; svuu += v * u * u;
            }
            const det = suu * svv - suv * suv;
            if (Math.abs(det) < 1e-9) return null;
            const uc = (svv * (suuu + suvv) - suv * (svvv + svuu)) / (2 * det);
            const vc = (suu * (svvv + svuu) - suv * (suuu + suvv)) / (2 * det);
            const cx = uc + mx, cy = vc + my;
            const r = Math.sqrt(uc * uc + vc * vc + (suu + svv) / n);
            if (!isFinite(r) || r <= 0) return null;
            let resid = 0;
            for (const p of pts) resid += Math.abs(Math.hypot(p.x - cx, p.y - cy) - r);
            return { cx, cy, r, residual: resid / n };
        }

        // Cobertura angular dos pontos ao redor de um centro (graus)
        function angularCoverage(pts, cx, cy) {
            if (pts.length < 2) return 0;
            const angles = pts.map(p => Math.atan2(p.y - cy, p.x - cx)).sort((a, b) => a - b);
            let maxGap = 2 * Math.PI - (angles[angles.length - 1] - angles[0]);
            for (let i = 1; i < angles.length; i++) maxGap = Math.max(maxGap, angles[i] - angles[i - 1]);
            return 360 - maxGap * 180 / Math.PI;
        }

        function strokeStats(stroke) {
            let len = 0;
            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
            let sx = 0, sy = 0;
            for (let i = 0; i < stroke.length; i++) {
                const p = stroke[i];
                if (i > 0) len += Math.hypot(p.x - stroke[i - 1].x, p.y - stroke[i - 1].y);
                minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x);
                minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y);
                sx += p.x; sy += p.y;
            }
            const first = stroke[0], last = stroke[stroke.length - 1];
            return {
                length: len,
                centroid: { x: sx / stroke.length, y: sy / stroke.length },
                straightness: len > 0 ? Math.hypot(last.x - first.x, last.y - first.y) / len : 0,
                first, last
            };
        }

        // Ângulo de relógio: 12h = 0°, 3h = 90°, 6h = 180°, 9h = 270°
        function clockAngle(cx, cy, p) {
            return (Math.atan2(p.y - cy, p.x - cx) * 180 / Math.PI + 90 + 360) % 360;
        }

        function angleDiff(a, b) {
            const d = Math.abs(a - b) % 360;
            return d > 180 ? 360 - d : d;
        }

        /*
          Analisa os traços do desenho e atribui Shulman 0–5:
          - procura um traço circular grande (ajuste de círculo + cobertura angular)
          - identifica ponteiros: traços retos partindo do centro
          - verifica o horário 11h10 (ponteiros ~330° e ~60°)
          - conta agrupamentos de traços na zona dos números e sua distribuição
        */
        function analyzeClockStrokes(strokes, size) {
            const allPoints = strokes.flat();
            if (!strokes.length || allPoints.length < 10) {
                return { score: 0, reason: "Nenhum desenho detectado.", details: {} };
            }

            let totalLen = 0;
            const stats = strokes.map(s => { const st = strokeStats(s); totalLen += st.length; return st; });
            if (totalLen < size * 0.4) {
                return { score: 1, reason: "Desenho muito escasso para representar um relógio.", details: {} };
            }

            // 1) Encontrar o contorno do relógio
            let circle = null;
            let circleIdx = -1;
            strokes.forEach((s, i) => {
                if (s.length < 12) return;
                const fit = fitCircle(s);
                if (!fit) return;
                const coverage = angularCoverage(s, fit.cx, fit.cy);
                const ok = fit.r > size * 0.15 && fit.r < size * 0.75 &&
                           fit.residual < fit.r * 0.22 && coverage > 240;
                if (ok && (!circle || fit.r > circle.r)) {
                    circle = { ...fit, coverage };
                    circleIdx = i;
                }
            });
            // Círculo desenhado em vários traços: tentar ajuste global
            let weakCircle = false;
            if (!circle) {
                const fit = fitCircle(allPoints);
                if (fit && fit.r > size * 0.15 && fit.residual < fit.r * 0.35) {
                    circle = { ...fit, coverage: angularCoverage(allPoints, fit.cx, fit.cy) };
                    weakCircle = true;
                }
            }

            if (!circle) {
                return {
                    score: 1,
                    reason: "Não foi possível identificar um contorno circular de relógio. Grande desorganização visuoespacial.",
                    details: { totalStrokes: strokes.length }
                };
            }

            const { cx, cy, r } = circle;

            // 2) Classificar os demais traços: ponteiros vs. números
            const handAngles = [];
            const numberCentroids = [];
            strokes.forEach((s, i) => {
                if (i === circleIdx) return;
                const st = stats[i];
                let minCenterDist = Infinity;
                for (const p of s) minCenterDist = Math.min(minCenterDist, Math.hypot(p.x - cx, p.y - cy));
                const dFirst = Math.hypot(st.first.x - cx, st.first.y - cy);
                const dLast = Math.hypot(st.last.x - cx, st.last.y - cy);
                const isHand = minCenterDist < r * 0.3 && st.length > r * 0.25 && st.length < r * 2.4 &&
                               st.straightness > 0.6 && Math.max(dFirst, dLast) > r * 0.35 &&
                               Math.max(dFirst, dLast) < r * 1.15;
                if (isHand) {
                    // Traço em "V" pelo centro = dois ponteiros num traço só
                    if (dFirst > r * 0.35 && dLast > r * 0.35 && minCenterDist < r * 0.2 && st.straightness < 0.92) {
                        handAngles.push(clockAngle(cx, cy, st.first));
                        handAngles.push(clockAngle(cx, cy, st.last));
                    } else {
                        const tip = dFirst > dLast ? st.first : st.last;
                        handAngles.push(clockAngle(cx, cy, tip));
                    }
                    return;
                }
                const cd = Math.hypot(st.centroid.x - cx, st.centroid.y - cy);
                if (cd > r * 0.45 && cd < r * 1.2 && st.length < r * 1.2) {
                    numberCentroids.push(st.centroid);
                }
            });

            // 3) Agrupar traços de números (dígitos com mais de um traço)
            const clusters = [];
            for (const c of numberCentroids) {
                const near = clusters.find(cl => Math.hypot(cl.x - c.x, cl.y - c.y) < r * 0.18);
                if (near) { near.n++; near.x = (near.x + c.x) / 2; near.y = (near.y + c.y) / 2; }
                else clusters.push({ x: c.x, y: c.y, n: 1 });
            }
            const numCount = clusters.length;

            // Distribuição dos números pelos 4 quadrantes
            const quad = [0, 0, 0, 0];
            clusters.forEach(c => {
                const a = clockAngle(cx, cy, c);
                quad[Math.floor(a / 90) % 4]++;
            });
            const quadrantsUsed = quad.filter(q => q > 0).length;

            // 4) Horário 11h10: ponteiro das horas ~330°, dos minutos ~60°
            const TOL = 28;
            const hasHourHand = handAngles.some(a => angleDiff(a, 330) <= TOL);
            const hasMinuteHand = handAngles.some(a => angleDiff(a, 60) <= TOL);
            const correctTime = hasHourHand && hasMinuteHand;
            const hands = handAngles.length;

            const details = {
                circle: { coverage: Math.round(circle.coverage), residualRatio: +(circle.residual / r).toFixed(3), weakCircle },
                hands, handAngles: handAngles.map(a => Math.round(a)),
                numberClusters: numCount, quadrantsUsed, correctTime
            };

            let score, reason;
            if (correctTime && numCount >= 8 && quadrantsUsed === 4 && !weakCircle) {
                score = 5;
                reason = "Círculo bem formado, números distribuídos nos quatro quadrantes e ponteiros marcando 11h10.";
            } else if (correctTime && numCount >= 6 && quadrantsUsed >= 3) {
                score = 4;
                reason = "Relógio com horário correto e pequenas imprecisões visuoespaciais (números incompletos ou desalinhados).";
            } else if (numCount >= 5 && quadrantsUsed >= 3) {
                score = 3;
                reason = hands >= 2
                    ? "Estrutura adequada do relógio, mas o horário 11h10 não foi representado corretamente."
                    : "Estrutura adequada do relógio, mas os ponteiros não foram claramente identificados.";
            } else if (numCount >= 2 || hands >= 1) {
                score = 2;
                reason = "Círculo presente, porém com poucos números ou má distribuição. Erro visuoespacial moderado.";
            } else {
                score = 1;
                reason = "Apenas o contorno foi identificado, sem números ou ponteiros reconhecíveis.";
            }

            return { score, reason, details };
        }

        /* ===== PONTUAÇÃO DO RELÓGIO POR IA (Gemini Vision — gratuito, opcional) =====

           Por padrão o relógio é pontuado pela análise geométrica acima (local,
           offline, sem custo). Opcionalmente, se o examinador informar a SUA
           própria chave gratuita do Google AI Studio, o desenho é enviado ao
           Gemini (modelo de visão) para uma avaliação Shulman 0–5 mais fiel.

           - A chave NUNCA é embutida no app: fica só no localStorage do aparelho.
           - Usa o free tier do Gemini (sem cartão de crédito; sujeito às cotas
             gratuitas) — por isso "sem gastar tokens" no sentido de custo.
           - Em qualquer falha (sem chave, rede, cota, resposta inválida) o app
             volta automaticamente para a pontuação geométrica local.
        */
        const DEFAULT_GEMINI_MODEL = 'gemini-2.5-flash';

        function getGeminiKey() {
            try { return (localStorage.getItem('bbrc_gemini_key') || '').trim(); } catch (e) { return ''; }
        }
        function setGeminiKey(v) {
            try {
                if (v && v.trim()) localStorage.setItem('bbrc_gemini_key', v.trim());
                else localStorage.removeItem('bbrc_gemini_key');
            } catch (e) {}
        }
        function getGeminiModel() {
            try { return (localStorage.getItem('bbrc_gemini_model') || '').trim() || DEFAULT_GEMINI_MODEL; }
            catch (e) { return DEFAULT_GEMINI_MODEL; }
        }

        const CLOCK_AI_PROMPT = [
            'Você é um neurologista pontuando o Teste do Relógio (Clock Drawing Test) para rastreio cognitivo.',
            'A imagem é o desenho de um RELÓGIO feito por um participante, que foi instruído a desenhar um relógio',
            'redondo, com todos os números, e os ponteiros marcando 11 horas e 10 minutos (11:10).',
            '',
            'Pontue pela escala de Shulman, mas use ESTA convenção numérica, em que 5 é o melhor e 0 o pior:',
            '5 = Relógio perfeito (círculo, os 12 números na posição correta e dois ponteiros marcando 11:10).',
            '4 = Erros visuoespaciais mínimos (ex.: leve desalinhamento), com o horário ainda correto.',
            '3 = Representação inadequada das 11:10, sem alteração visuoespacial maior.',
            '2 = Erro visuoespacial moderado (vários números faltando ou mal distribuídos).',
            '1 = Grande desorganização visuoespacial (números/ponteiros irreconhecíveis).',
            '0 = Incapacidade de representar um relógio (rabiscos ou ausência de relógio).',
            '',
            'Considere: existe um círculo? Há 12 números e estão bem posicionados? Há dois ponteiros?',
            'Os ponteiros marcam 11:10 (ponteiro das horas perto do 11, o dos minutos perto do 2)?',
            'Responda SOMENTE em JSON, sem texto extra: {"score": <inteiro de 0 a 5>, "reason": "<justificativa curta em português>"}'
        ].join('\n');

        // Uma única chamada ao Gemini para um modelo específico.
        async function callGeminiClock(dataUrl, apiKey, model) {
            const comma = dataUrl.indexOf(',');
            const base64 = comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
            const mime = (dataUrl.match(/^data:([^;]+);/) || [])[1] || 'image/png';
            const url = 'https://generativelanguage.googleapis.com/v1beta/models/' +
                encodeURIComponent(model) + ':generateContent?key=' + encodeURIComponent(apiKey);
            const body = {
                contents: [{
                    parts: [
                        { text: CLOCK_AI_PROMPT },
                        { inline_data: { mime_type: mime, data: base64 } }
                    ]
                }],
                generationConfig: {
                    temperature: 0,
                    response_mime_type: 'application/json',
                    response_schema: {
                        type: 'OBJECT',
                        properties: { score: { type: 'INTEGER' }, reason: { type: 'STRING' } },
                        required: ['score', 'reason']
                    }
                }
            };
            const ctrl = new AbortController();
            const to = setTimeout(() => ctrl.abort(), 20000);
            let resp;
            try {
                resp = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body),
                    signal: ctrl.signal
                });
            } catch (e) {
                clearTimeout(to);
                const err = new Error('rede indisponível'); err.fatal = true; throw err;
            }
            clearTimeout(to);
            if (!resp.ok) {
                let msg = 'HTTP ' + resp.status;
                try { const j = await resp.json(); if (j && j.error && j.error.message) msg = j.error.message; } catch (e) {}
                const err = new Error(msg);
                // Auth/cota não melhoram trocando de modelo: erro "fatal" (não tenta outro).
                err.fatal = (resp.status === 401 || resp.status === 403 || resp.status === 429);
                throw err;
            }
            const data = await resp.json();
            const parts = (((data.candidates || [])[0] || {}).content || {}).parts || [];
            const text = parts.map(p => (p && p.text) || '').join('').trim();
            if (!text) { const err = new Error('resposta vazia da IA'); err.fatal = false; throw err; }
            let parsed;
            try { parsed = JSON.parse(text); }
            catch (e) {
                const m = text.match(/\{[\s\S]*\}/);
                if (!m) { const err = new Error('resposta da IA não é JSON'); err.fatal = false; throw err; }
                parsed = JSON.parse(m[0]);
            }
            let score = Math.round(Number(parsed.score));
            if (!isFinite(score)) { const err = new Error('score inválido da IA'); err.fatal = false; throw err; }
            score = Math.max(0, Math.min(5, score));
            return { score, reason: String(parsed.reason || '').trim(), model };
        }

        // Tenta o modelo preferido e, se ele não existir/for inválido, alguns
        // outros modelos gratuitos de visão antes de desistir.
        async function scoreClockWithAI(dataUrl, apiKey) {
            if (!dataUrl || !apiKey) throw new Error('sem imagem ou chave');
            const models = [...new Set([getGeminiModel(), 'gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'])];
            let lastErr;
            for (const model of models) {
                try { return await callGeminiClock(dataUrl, apiKey, model); }
                catch (e) { lastErr = e; if (e && e.fatal) break; }
            }
            throw lastErr || new Error('falha na IA');
        }

        /* ===== ÍCONES SVG ===== */

        const Icon = ({ children, size = 24, className = "", ...props }) => (
            <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24"
                 fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
                 strokeLinejoin="round" className={className} {...props}>{children}</svg>
        );
        const MicIcon = (p) => <Icon {...p}><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></Icon>;
        const MicOffIcon = (p) => <Icon {...p}><line x1="1" y1="1" x2="23" y2="23"/><path d="M9 9v3a3 3 0 0 0 5.12 2.12"/><line x1="15" y1="9.34" x2="15" y2="4a3 3 0 0 0-5.94-.6"/><path d="M17 16.95A7 7 0 0 1 5 12v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></Icon>;
        const PlayIcon = (p) => <Icon {...p}><polygon points="5 3 19 12 5 21 5 3"/></Icon>;
        const SaveIcon = (p) => <Icon {...p}><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></Icon>;
        const UndoIcon = (p) => <Icon {...p}><path d="M1 4v6h6"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></Icon>;
        const CheckIcon = (p) => <Icon {...p}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></Icon>;
        const AlertIcon = (p) => <Icon {...p}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></Icon>;
        const ClockIcon = (p) => <Icon {...p}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></Icon>;
        const BrainIcon = (p) => <Icon {...p}><path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2Z"/><path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2Z"/></Icon>;
        const PrintIcon = (p) => <Icon {...p}><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></Icon>;
        const EyeOffIcon = (p) => <Icon {...p}><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><line x1="1" y1="1" x2="23" y2="23"/></Icon>;
        const VolumeIcon = (p) => <Icon {...p}><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></Icon>;
        const DownloadIcon = (p) => <Icon {...p}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></Icon>;
        const RepeatIcon = (p) => <Icon {...p}><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></Icon>;

        /* ===== HOOK: PERMISSÃO DO MICROFONE ===== */

        // Estados: 'checking' | 'granted' | 'denied' | 'prompt' | 'unsupported'
        function useMicrophonePermission() {
            const [micPermission, setMicPermission] = useState('checking');

            useEffect(() => {
                const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
                if (!SR || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                    setMicPermission('unsupported');
                    return;
                }
                if (navigator.permissions && navigator.permissions.query) {
                    navigator.permissions.query({ name: 'microphone' })
                        .then(result => {
                            setMicPermission(result.state);
                            result.onchange = () => setMicPermission(result.state);
                        })
                        .catch(() => setMicPermission('prompt'));
                } else {
                    setMicPermission('prompt');
                }
            }, []);

            const requestPermission = useCallback(async () => {
                try {
                    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                    stream.getTracks().forEach(t => t.stop());
                    setMicPermission('granted');
                    return true;
                } catch (err) {
                    setMicPermission(err.name === 'NotFoundError' ? 'unsupported' : 'denied');
                    return false;
                }
            }, []);

            return { micPermission, requestPermission };
        }

        /* ===== HOOK: RECONHECIMENTO DE VOZ (Web Speech API, gratuito) ===== */

        function useSpeechRecognition() {
            const recRef = useRef(null);
            const [isListening, setIsListening] = useState(false);
            const [transcript, setTranscript] = useState('');
            const [interim, setInterim] = useState('');
            const [micError, setMicError] = useState(null); // null | 'not-allowed' | 'unsupported' | 'error'
            const isActiveRef = useRef(false);
            const restartTimeoutRef = useRef(null);

            useEffect(() => {
                const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
                if (!SR) {
                    setMicError('unsupported');
                    return;
                }

                const rec = new SR();
                rec.continuous = true;
                rec.interimResults = true;
                rec.lang = 'pt-BR';
                rec.maxAlternatives = 1;

                rec.onresult = (ev) => {
                    let finalText = '';
                    let interimText = '';
                    // resultIndex evita reprocessar (e duplicar) resultados antigos
                    for (let i = ev.resultIndex; i < ev.results.length; i++) {
                        const res = ev.results[i];
                        if (res.isFinal) finalText += res[0].transcript + ' ';
                        else interimText += res[0].transcript + ' ';
                    }
                    if (finalText.trim()) {
                        setTranscript(prev => (prev + ' ' + finalText).replace(/\s+/g, ' ').trim());
                    }
                    setInterim(interimText.trim());
                };

                rec.onerror = (ev) => {
                    if (ev.error === 'aborted' || ev.error === 'no-speech') return;
                    if (ev.error === 'not-allowed' || ev.error === 'service-not-allowed') {
                        setMicError('not-allowed');
                        isActiveRef.current = false;
                        setIsListening(false);
                        return;
                    }
                    console.warn('Speech recognition error:', ev.error);
                    setMicError('error');
                };

                rec.onend = () => {
                    setInterim('');
                    if (isActiveRef.current) {
                        if (restartTimeoutRef.current) clearTimeout(restartTimeoutRef.current);
                        restartTimeoutRef.current = setTimeout(() => {
                            if (isActiveRef.current && recRef.current) {
                                try { recRef.current.start(); } catch (e) {}
                            }
                        }, 250);
                    }
                };

                recRef.current = rec;

                return () => {
                    isActiveRef.current = false;
                    if (restartTimeoutRef.current) clearTimeout(restartTimeoutRef.current);
                    try { rec.stop(); } catch (e) {}
                };
            }, []);

            const startListening = useCallback(() => {
                if (!recRef.current || isActiveRef.current) return;
                setMicError(prev => prev === 'unsupported' ? prev : null);
                isActiveRef.current = true;
                setIsListening(true);
                setTimeout(() => {
                    if (isActiveRef.current && recRef.current) {
                        try { recRef.current.start(); } catch (e) {}
                    }
                }, 350);
            }, []);

            const stopListening = useCallback(() => {
                isActiveRef.current = false;
                setIsListening(false);
                setInterim('');
                if (restartTimeoutRef.current) clearTimeout(restartTimeoutRef.current);
                if (recRef.current) {
                    try { recRef.current.stop(); } catch (e) {}
                }
            }, []);

            const resetTranscript = useCallback(() => {
                setTranscript('');
                setInterim('');
            }, []);

            // Fallback digitado (quando não há microfone)
            const appendText = useCallback((text) => {
                if (!text || !text.trim()) return;
                setTranscript(prev => (prev + ' ' + text).replace(/\s+/g, ' ').trim());
            }, []);

            const clearError = useCallback(() => {
                setMicError(prev => prev === 'unsupported' ? prev : null);
            }, []);

            return { isListening, transcript, interim, micError, startListening, stopListening, resetTranscript, appendText, clearError };
        }

        /* ===== HOOK: AUTO-AVANÇO POR SILÊNCIO (autoaplicação) ===== */

        function useAutoAdvance({ active, activity, hasResponse, silenceMs, maxMs, reminderMs = 20000, onAdvance, onReminder }) {
            const startRef = useRef(null);
            const lastRef = useRef(null);
            const remindedRef = useRef(false);
            const firedRef = useRef(false);
            const [countdown, setCountdown] = useState(null);
            const [elapsedSec, setElapsedSec] = useState(0);
            const cbRef = useRef({});
            cbRef.current = { onAdvance, onReminder, hasResponse };

            useEffect(() => {
                if (active) {
                    startRef.current = Date.now();
                    lastRef.current = Date.now();
                    remindedRef.current = false;
                    firedRef.current = false;
                }
            }, [active]);

            useEffect(() => { lastRef.current = Date.now(); }, [activity]);

            useEffect(() => {
                if (!active) { setCountdown(null); return; }
                const iv = setInterval(() => {
                    if (firedRef.current || !startRef.current) return;
                    const now = Date.now();
                    const elapsed = now - startRef.current;
                    const silent = now - lastRef.current;
                    setElapsedSec(Math.floor(elapsed / 1000));
                    const { onAdvance, onReminder, hasResponse } = cbRef.current;
                    if (elapsed >= maxMs) {
                        firedRef.current = true;
                        setCountdown(null);
                        onAdvance('timeout');
                        return;
                    }
                    if (hasResponse && silent >= silenceMs) {
                        firedRef.current = true;
                        setCountdown(null);
                        onAdvance('silence');
                        return;
                    }
                    if (!hasResponse && onReminder && !remindedRef.current && silent >= reminderMs) {
                        remindedRef.current = true;
                        lastRef.current = Date.now();
                        onReminder();
                        return;
                    }
                    if (hasResponse) {
                        const remain = silenceMs - silent;
                        setCountdown(remain <= 5000 ? Math.max(1, Math.ceil(remain / 1000)) : null);
                    } else {
                        setCountdown(null);
                    }
                }, 400);
                return () => clearInterval(iv);
            }, [active, silenceMs, maxMs, reminderMs]);

            return { countdown, elapsedSec };
        }

        /* ===== HOOK: MANTER A TELA LIGADA (Wake Lock) ===== */

        function useWakeLock(active) {
            useEffect(() => {
                if (!active || !('wakeLock' in navigator)) return;
                let lock = null;
                let cancelled = false;
                const acquire = async () => {
                    try {
                        lock = await navigator.wakeLock.request('screen');
                    } catch (e) {}
                };
                acquire();
                const onVis = () => {
                    if (!cancelled && document.visibilityState === 'visible') acquire();
                };
                document.addEventListener('visibilitychange', onVis);
                return () => {
                    cancelled = true;
                    document.removeEventListener('visibilitychange', onVis);
                    try { if (lock) lock.release(); } catch (e) {}
                };
            }, [active]);
        }

        /* ===== COMPONENTES BÁSICOS ===== */

        function MicPermissionBanner({ micPermission, micError, onRequestPermission }) {
            const showDenied = micPermission === 'denied' || micError === 'not-allowed';
            const showUnsupported = micPermission === 'unsupported' || micError === 'unsupported';
            if (!showDenied && !showUnsupported) return null;

            return (
                <div className={`w-full max-w-2xl mx-auto mb-4 p-4 rounded-lg border-2 ${showUnsupported ? 'bg-amber-50 border-amber-300' : 'bg-red-50 border-red-300'}`}>
                    <div className="flex items-start gap-3">
                        <MicOffIcon size={24} className={showUnsupported ? 'text-amber-600 mt-0.5' : 'text-red-500 mt-0.5'} />
                        <div className="flex-1">
                            {showUnsupported ? (
                                <>
                                    <h4 className="font-bold text-amber-800 text-sm">Sem reconhecimento de voz</h4>
                                    <p className="text-amber-700 text-xs mt-1">
                                        Este navegador não suporta reconhecimento de voz. Você pode <strong>digitar as respostas</strong> no campo de
                                        texto de cada etapa, ou usar <strong>Google Chrome</strong> / <strong>Microsoft Edge</strong> para responder por voz.
                                    </p>
                                </>
                            ) : (
                                <>
                                    <h4 className="font-bold text-red-700 text-sm">Microfone bloqueado</h4>
                                    <p className="text-red-600 text-xs mt-1">
                                        O acesso ao microfone foi negado. Permita o microfone no ícone de cadeado da barra de endereço,
                                        ou digite as respostas no campo de texto.
                                    </p>
                                    <button onClick={onRequestPermission}
                                        className="mt-2 px-4 py-2 bg-red-600 text-white rounded-lg font-bold text-xs hover:bg-red-700 transition-colors flex items-center gap-2">
                                        <MicIcon size={14}/> Tentar habilitar microfone
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            );
        }

        function VoiceBox({ isListening, transcript, interim, hint, micError, onTyped }) {
            const [typed, setTyped] = useState('');
            const typedMode = !!micError;

            const submitTyped = (e) => {
                e.preventDefault();
                if (typed.trim() && onTyped) {
                    onTyped(typed.trim());
                    setTyped('');
                }
            };

            return (
                <div className="w-full max-w-lg mx-auto">
                    <div className={`p-4 rounded-lg border-2 transition-colors duration-300 ${
                        isListening ? 'border-red-400 bg-red-50' : 'border-gray-200 bg-gray-50'}`}>
                        <div className="flex justify-between items-center mb-2">
                            <span className={`font-semibold text-sm ${isListening ? 'text-red-700' : 'text-gray-500'}`}>
                                {typedMode ? 'Digite suas respostas abaixo' :
                                 isListening ? 'Ouvindo sua resposta...' : 'Microfone em pausa'}
                            </span>
                            <div className="relative">
                                {isListening ? (
                                    <div className="relative mic-pulse"><MicIcon size={20} className="text-red-500"/></div>
                                ) : (
                                    <MicOffIcon size={20} className="text-gray-400"/>
                                )}
                            </div>
                        </div>
                        <div aria-live="polite" className="min-h-[64px] text-left text-lg p-3 bg-white rounded border border-gray-100 leading-relaxed">
                            {transcript || interim ? (
                                <>
                                    <span>{transcript}</span>
                                    {interim && <span className="text-gray-400 italic"> {interim}</span>}
                                </>
                            ) : (
                                <span className="text-gray-400 italic text-base">{hint || "Aguardando resposta..."}</span>
                            )}
                        </div>
                        {typedMode && (
                            <form onSubmit={submitTyped} className="flex gap-2 mt-3">
                                <input value={typed} onChange={e => setTyped(e.target.value)}
                                    placeholder="Digite aqui (ex.: casa, chave...)"
                                    className="flex-1 p-3 border border-gray-300 rounded-lg text-base"
                                    autoComplete="off" autoCorrect="off" />
                                <button type="submit"
                                    className="px-5 py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700">
                                    Adicionar
                                </button>
                            </form>
                        )}
                    </div>
                </div>
            );
        }

        function NextButton({ onClick, label = "Terminei", disabled = false }) {
            return (
                <button onClick={onClick} disabled={disabled}
                    className={`px-10 py-4 rounded-xl font-bold text-xl shadow-lg flex items-center gap-2 transition-all
                        ${disabled ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-green-600 text-white hover:bg-green-700 hover:shadow-xl active:scale-95'}`}>
                    {label} <PlayIcon size={20} className={disabled ? "" : "fill-white"}/>
                </button>
            );
        }

        function RepeatButton({ onClick, disabled }) {
            return (
                <button onClick={onClick} disabled={disabled}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 disabled:opacity-50 transition-colors">
                    <VolumeIcon size={16}/> Repetir instrução
                </button>
            );
        }

        function StepHeader({ stepNumber, title }) {
            return (
                <div className="flex items-center gap-2 flex-wrap justify-center">
                    {stepNumber && <span className="bg-blue-100 text-blue-800 text-xs font-bold px-3 py-1 rounded-full">Etapa {stepNumber}</span>}
                    <h2 className="text-2xl font-bold text-gray-800">{title}</h2>
                </div>
            );
        }

        /* ===== COMPONENTE: PREPARAÇÃO (boas-vindas + verificações) ===== */

        function WelcomePhase({ onStart, micPermission, requestPermission, speech, educationLevel, setEducationLevel, patientInfo, setPatientInfo }) {
            const [step, setStep] = useState(0); // 0 intro | 1 dados | 2 som | 3 microfone | 4 pronto
            const [soundOk, setSoundOk] = useState(null);
            const [micTesting, setMicTesting] = useState(false);
            const [requesting, setRequesting] = useState(false);
            const micUnsupported = micPermission === 'unsupported' || speech.micError === 'unsupported';
            const micCaptured = speech.transcript.trim().length > 0;

            // Configuração opcional da pontuação do relógio por IA (chave do examinador)
            const [aiKeyInput, setAiKeyInput] = useState('');
            const [aiConfigured, setAiConfigured] = useState(false);
            useEffect(() => { const k = getGeminiKey(); setAiKeyInput(k); setAiConfigured(!!k); }, []);
            const saveAiKey = () => { setGeminiKey(aiKeyInput); setAiConfigured(!!aiKeyInput.trim()); };
            const clearAiKey = () => { setGeminiKey(''); setAiKeyInput(''); setAiConfigured(false); };

            useEffect(() => {
                speakText(PHASE_INSTRUCTIONS[PHASES.WELCOME]);
                return () => stopSpeaking();
            }, []);

            const playSoundTest = () => {
                setSoundOk(null);
                speakText("Olá! Se você está me ouvindo bem, toque no botão verde: estou ouvindo.");
            };

            const startMicTest = async () => {
                setRequesting(true);
                const granted = micUnsupported ? false : await requestPermission();
                setRequesting(false);
                if (granted) {
                    speech.clearError();
                    setMicTesting(true);
                    speakText("Após o sinal, diga em voz alta: estou pronto para começar.").then(() => {
                        playBeep();
                        speech.startListening();
                    });
                }
            };

            const finishMicTest = () => {
                speech.stopListening();
                speech.resetTranscript();
                setStep(4);
            };

            const begin = () => {
                stopSpeaking();
                speech.resetTranscript();
                onStart();
            };

            return (
                <div className="text-center bg-white p-6 sm:p-10 rounded-xl shadow-lg space-y-6 max-w-xl mx-auto">
                    <BrainIcon size={56} className="mx-auto text-blue-600"/>
                    <h2 className="text-2xl sm:text-3xl font-bold text-gray-800">Bateria Breve de Rastreio Cognitivo</h2>

                    {step === 0 && (
                        <>
                            <p className="text-gray-600 text-lg leading-relaxed">
                                Este teste avalia memória e outras funções cognitivas e pode ser feito <strong>sozinho</strong>,
                                no celular, tablet ou computador.
                            </p>
                            <ul className="text-left text-gray-600 space-y-2 max-w-md mx-auto">
                                <li className="flex gap-2"><VolumeIcon size={20} className="text-blue-500 flex-shrink-0"/> As instruções serão faladas em voz alta.</li>
                                <li className="flex gap-2"><MicIcon size={20} className="text-blue-500 flex-shrink-0"/> Você responde falando — o teste entende sua voz.</li>
                                <li className="flex gap-2"><ClockIcon size={20} className="text-blue-500 flex-shrink-0"/> Dura cerca de 15 minutos, sem interrupções.</li>
                                <li className="flex gap-2"><AlertIcon size={20} className="text-blue-500 flex-shrink-0"/> Fique em um local <strong>silencioso</strong> e com o volume ligado.</li>
                            </ul>
                            <button onClick={() => setStep(1)}
                                className="px-12 py-4 bg-blue-600 text-white rounded-xl font-bold text-xl shadow-lg hover:bg-blue-700 transition-all active:scale-95">
                                Preparar Teste
                            </button>

                            <details className="text-left max-w-md mx-auto mt-2 border rounded-lg bg-gray-50">
                                <summary className="p-3 text-sm font-semibold text-gray-600 cursor-pointer hover:bg-gray-100 flex items-center gap-2">
                                    <BrainIcon size={16} className="text-blue-500 flex-shrink-0"/>
                                    <span>Pontuação do relógio por IA (opcional)</span>
                                    {aiConfigured && <span className="ml-auto text-xs text-green-600 font-bold">ativada</span>}
                                </summary>
                                <div className="p-3 pt-0 space-y-2">
                                    <p className="text-xs text-gray-500 leading-relaxed">
                                        Por padrão, o relógio é pontuado por <strong>análise geométrica</strong> no próprio
                                        aparelho (gratuita, offline). Opcionalmente, você pode usar uma <strong>IA de visão
                                        (Google Gemini)</strong> para uma avaliação mais fiel. É preciso uma <strong>chave
                                        gratuita</strong> do Google AI Studio, que fica salva <strong>só neste aparelho</strong>.
                                        Ao ativar, <strong>a imagem do relógio é enviada ao Google</strong> para pontuação; em
                                        caso de falha, o app volta sozinho para a análise local.
                                    </p>
                                    <input type="password" value={aiKeyInput}
                                        onChange={e => { setAiKeyInput(e.target.value); setAiConfigured(false); }}
                                        placeholder="Cole aqui sua chave do Google AI Studio"
                                        className="w-full p-2 border border-gray-300 rounded-lg text-sm"
                                        autoComplete="off" autoCorrect="off" spellCheck="false" />
                                    <div className="flex gap-2 flex-wrap items-center">
                                        <button onClick={saveAiKey} disabled={!aiKeyInput.trim()}
                                            className="px-4 py-2 bg-blue-600 text-white rounded-lg font-bold text-xs hover:bg-blue-700 disabled:opacity-50">
                                            Salvar chave
                                        </button>
                                        {(aiConfigured || aiKeyInput) && (
                                            <button onClick={clearAiKey}
                                                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-bold text-xs hover:bg-gray-300">
                                                Remover
                                            </button>
                                        )}
                                        <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer"
                                            className="text-xs text-blue-700 underline">Obter chave gratuita</a>
                                    </div>
                                    {aiConfigured && (
                                        <p className="text-xs text-green-600">
                                            ✓ Chave salva. O relógio será pontuado por IA (com retorno automático à análise local em caso de falha).
                                        </p>
                                    )}
                                </div>
                            </details>
                        </>
                    )}

                    {step === 1 && (
                        <>
                            <h3 className="font-bold text-gray-700 text-lg">Sobre você</h3>
                            <p className="text-gray-500 text-sm">Esses dados ajustam a interpretação dos resultados e ficam apenas neste aparelho.</p>
                            <div className="text-left max-w-sm mx-auto space-y-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-600 mb-1">Escolaridade</label>
                                    <select value={educationLevel} onChange={e => setEducationLevel(Number(e.target.value))}
                                        className="w-full p-3 border border-gray-300 rounded-lg text-base bg-white">
                                        <option value={0}>Nunca estudei (analfabeto)</option>
                                        <option value={1}>1 a 7 anos de estudo</option>
                                        <option value={2}>8 anos ou mais de estudo</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-600 mb-1">Idade (opcional)</label>
                                    <input type="number" min="18" max="120" value={patientInfo.age}
                                        onChange={e => setPatientInfo(p => ({ ...p, age: e.target.value }))}
                                        placeholder="Ex.: 67"
                                        className="w-full p-3 border border-gray-300 rounded-lg text-base" />
                                </div>
                            </div>
                            <button onClick={() => { setStep(2); }}
                                className="px-12 py-4 bg-blue-600 text-white rounded-xl font-bold text-xl shadow-lg hover:bg-blue-700 transition-all active:scale-95">
                                Continuar
                            </button>
                        </>
                    )}

                    {step === 2 && (
                        <>
                            <h3 className="font-bold text-gray-700 text-lg">Teste de som</h3>
                            <p className="text-gray-600">Toque no botão abaixo e verifique se consegue ouvir a voz do teste.</p>
                            <button onClick={playSoundTest}
                                className="px-8 py-4 bg-blue-600 text-white rounded-xl font-bold text-lg shadow hover:bg-blue-700 flex items-center gap-2 mx-auto active:scale-95">
                                <VolumeIcon size={22}/> Tocar mensagem de teste
                            </button>
                            <div className="flex gap-3 justify-center flex-wrap">
                                <button onClick={() => { setSoundOk(true); setStep(3); }}
                                    className="px-6 py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 active:scale-95">
                                    ✓ Estou ouvindo
                                </button>
                                <button onClick={() => setSoundOk(false)}
                                    className="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-300 active:scale-95">
                                    Não ouvi nada
                                </button>
                            </div>
                            {soundOk === false && (
                                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-left text-sm text-amber-800">
                                    <strong>Verifique:</strong> o volume do aparelho está ligado? O celular está no modo silencioso?
                                    Tente aumentar o volume e tocar a mensagem novamente.
                                </div>
                            )}
                        </>
                    )}

                    {step === 3 && (
                        <>
                            <h3 className="font-bold text-gray-700 text-lg">Teste do microfone</h3>
                            {micUnsupported ? (
                                <>
                                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-left text-sm text-amber-800">
                                        Este navegador não tem reconhecimento de voz. Você poderá <strong>digitar as respostas</strong> durante o teste.
                                        Para responder por voz, abra esta página no <strong>Google Chrome</strong> ou <strong>Microsoft Edge</strong>.
                                    </div>
                                    <button onClick={() => setStep(4)}
                                        className="px-10 py-4 bg-blue-600 text-white rounded-xl font-bold text-lg shadow hover:bg-blue-700 active:scale-95">
                                        Continuar digitando as respostas
                                    </button>
                                </>
                            ) : !micTesting ? (
                                <>
                                    <p className="text-gray-600">O teste precisa ouvir sua voz. Toque no botão e permita o uso do microfone.</p>
                                    <button onClick={startMicTest} disabled={requesting}
                                        className="px-8 py-4 bg-blue-600 text-white rounded-xl font-bold text-lg shadow hover:bg-blue-700 flex items-center gap-2 mx-auto disabled:opacity-50 active:scale-95">
                                        <MicIcon size={22}/> {requesting ? 'Aguardando permissão...' : 'Testar microfone'}
                                    </button>
                                    {micPermission === 'denied' && (
                                        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-left text-sm text-red-700">
                                            O microfone foi bloqueado. Clique no ícone de cadeado na barra de endereço, permita o microfone
                                            e tente de novo — ou continue e digite as respostas.
                                            <button onClick={() => setStep(4)}
                                                className="mt-3 w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-bold hover:bg-gray-300">
                                                Continuar sem microfone
                                            </button>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <>
                                    <p className="text-gray-600">Diga em voz alta: <strong>"estou pronto para começar"</strong></p>
                                    <VoiceBox isListening={speech.isListening} transcript={speech.transcript} interim={speech.interim}
                                        hint='Fale agora...' micError={null} />
                                    {micCaptured ? (
                                        <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-green-700 font-bold flex items-center gap-2 justify-center">
                                            <CheckIcon size={18}/> Sua voz foi captada com sucesso!
                                        </div>
                                    ) : (
                                        <p className="text-sm text-gray-400">Fale perto do aparelho, em voz alta e clara.</p>
                                    )}
                                    <button onClick={finishMicTest} disabled={!micCaptured}
                                        className={`px-10 py-4 rounded-xl font-bold text-lg shadow transition-all active:scale-95 ${
                                            micCaptured ? 'bg-green-600 text-white hover:bg-green-700' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}>
                                        Concluir verificação
                                    </button>
                                </>
                            )}
                        </>
                    )}

                    {step === 4 && (
                        <>
                            <h3 className="font-bold text-gray-700 text-lg">Tudo pronto!</h3>
                            <ul className="text-left text-gray-600 space-y-2 max-w-md mx-auto text-sm">
                                <li className="flex gap-2"><CheckIcon size={18} className="text-green-600 flex-shrink-0"/> Responda sempre em <strong>voz alta e clara</strong>.</li>
                                <li className="flex gap-2"><CheckIcon size={18} className="text-green-600 flex-shrink-0"/> Quando terminar de responder, diga <strong>"terminei"</strong> ou toque no botão verde.</li>
                                <li className="flex gap-2"><CheckIcon size={18} className="text-green-600 flex-shrink-0"/> O teste avança sozinho se você ficar em silêncio.</li>
                                <li className="flex gap-2"><CheckIcon size={18} className="text-green-600 flex-shrink-0"/> Não feche nem atualize a página durante o teste.</li>
                            </ul>
                            <button onClick={begin}
                                className="px-14 py-5 bg-green-600 text-white rounded-xl font-bold text-2xl shadow-lg hover:bg-green-700 transition-all active:scale-95">
                                Iniciar Teste
                            </button>
                        </>
                    )}
                </div>
            );
        }

        /* ===== COMPONENTE GENÉRICO: FASE COM RESPOSTA POR VOZ ===== */

        function VoicePhase({ stepNumber, title, phaseKey, imageSrc, imageAlt, hiddenBox, description, hint, onNext, speech, maxMs = 90000, silenceMs = 10000 }) {
            const [instructionDone, setInstructionDone] = useState(false);
            const { isListening, transcript, interim, micError, startListening, stopListening, appendText } = speech;

            useEffect(() => {
                let cancelled = false;
                speakText(PHASE_INSTRUCTIONS[phaseKey]).then(() => {
                    if (cancelled) return;
                    setInstructionDone(true);
                    startListening();
                });
                return () => { cancelled = true; stopSpeaking(); };
            }, []);

            // Lembrete falado se o participante não responder
            const remind = useCallback(() => {
                stopListening();
                speakText("Não ouvi sua resposta. " + PHASE_INSTRUCTIONS[phaseKey]).then(() => startListening());
            }, [phaseKey, startListening, stopListening]);

            const repeatInstruction = useCallback(() => {
                stopListening();
                speakText(PHASE_INSTRUCTIONS[phaseKey]).then(() => startListening());
            }, [phaseKey, startListening, stopListening]);

            const { countdown } = useAutoAdvance({
                active: instructionDone && !micError,
                activity: transcript + '|' + interim,
                hasResponse: !!transcript.trim(),
                silenceMs,
                maxMs,
                onAdvance: onNext,
                onReminder: remind
            });

            return (
                <div className="flex flex-col items-center space-y-5 text-center bg-white p-4 sm:p-6 rounded-xl shadow-lg max-w-2xl mx-auto">
                    <StepHeader stepNumber={stepNumber} title={title} />
                    {description && <p className="text-gray-600">{description}</p>}

                    {imageSrc && (
                        <img src={imageSrc} alt={imageAlt}
                             className="max-w-full h-auto max-h-[42vh] rounded-lg shadow-md border"
                             onError={(e)=>{e.target.onerror=null; e.target.alt='Erro ao carregar ' + imageSrc;}} />
                    )}
                    {hiddenBox && (
                        <div className="w-full max-w-md h-36 bg-gray-50 rounded-lg flex items-center justify-center flex-col border-2 border-dashed border-gray-300">
                            <EyeOffIcon size={44} className="text-gray-300 mb-2" />
                            <p className="text-gray-400 text-sm">As figuras estão escondidas.</p>
                        </div>
                    )}

                    {instructionDone && (
                        <VoiceBox isListening={isListening} transcript={transcript} interim={interim}
                            hint={hint} micError={micError} onTyped={appendText} />
                    )}

                    {countdown !== null && (
                        <p className="text-sm text-amber-600 font-medium" aria-live="polite">
                            Avançando em {countdown}s... continue falando se lembrar de mais alguma.
                        </p>
                    )}

                    <div className="flex items-center gap-3 flex-wrap justify-center">
                        <RepeatButton onClick={repeatInstruction} disabled={!instructionDone} />
                        <NextButton onClick={onNext} disabled={!instructionDone} />
                    </div>
                </div>
            );
        }

        /* ===== COMPONENTE: EXPOSIÇÃO (30s com imagem) ===== */

        function ExposurePhase({ stepNumber, title, phaseKey, onTimerEnd }) {
            const [timeLeft, setTimeLeft] = useState(30);
            const [instructionDone, setInstructionDone] = useState(false);
            const timerRef = useRef(null);
            const endedRef = useRef(false);

            useEffect(() => {
                let cancelled = false;
                speakText(PHASE_INSTRUCTIONS[phaseKey]).then(() => { if (!cancelled) setInstructionDone(true); });
                return () => {
                    cancelled = true;
                    stopSpeaking();
                    if (timerRef.current) clearInterval(timerRef.current);
                };
            }, []);

            useEffect(() => {
                if (!instructionDone) return;
                timerRef.current = setInterval(() => {
                    setTimeLeft(t => {
                        if (t <= 1) {
                            clearInterval(timerRef.current);
                            timerRef.current = null;
                            if (!endedRef.current) {
                                endedRef.current = true;
                                playBeep();
                                onTimerEnd();
                            }
                            return 0;
                        }
                        return t - 1;
                    });
                }, 1000);
                return () => { if (timerRef.current) clearInterval(timerRef.current); };
            }, [instructionDone]);

            return (
                <div className="flex flex-col items-center space-y-5 text-center bg-white p-4 sm:p-6 rounded-xl shadow-lg max-w-2xl mx-auto">
                    <StepHeader stepNumber={stepNumber} title={title} />
                    <p className="text-gray-600">Observe e tente memorizar as figuras.</p>
                    <div className="relative">
                        <img src="./bbrc_estimulos.jpg" alt="10 figuras estímulo BBRC"
                             className="max-w-full h-auto max-h-[45vh] rounded-lg shadow-md border" />
                        <div className={`absolute top-3 right-3 px-4 py-2 rounded-full text-xl font-mono font-bold shadow-lg
                            ${timeLeft <= 10 ? 'bg-red-600 text-white animate-pulse' : 'bg-black/70 text-white'}`}>
                            {instructionDone ? `${timeLeft}s` : '...'}
                        </div>
                    </div>
                    <p className="text-sm text-gray-400">A imagem desaparecerá automaticamente quando o tempo acabar.</p>
                </div>
            );
        }

        /* ===== COMPONENTE: FLUÊNCIA VERBAL ===== */

        function FluencyPhase({ speech, onNext }) {
            const [stage, setStage] = useState('intro'); // 'intro' | 'running' | 'done'
            const [timeLeft, setTimeLeft] = useState(60);
            const [autoLeft, setAutoLeft] = useState(12);
            const timerRef = useRef(null);
            const mountedRef = useRef(true);
            const { transcript, interim, isListening, micError, startListening, stopListening, appendText } = speech;

            useEffect(() => {
                speakText(PHASE_INSTRUCTIONS[PHASES.FLUENCY]);
                return () => {
                    mountedRef.current = false;
                    stopSpeaking();
                    if (timerRef.current) clearInterval(timerRef.current);
                };
            }, []);

            const handleStart = useCallback(() => {
                setStage('running');
                // A contagem do minuto só começa DEPOIS que a instrução termina de
                // ser falada (antes, o cronômetro corria durante "Comece agora!",
                // tirando alguns segundos do participante).
                speakText("Atenção. Vou contar um minuto. Comece agora!").then(() => {
                    if (!mountedRef.current) return;
                    playBeep(660);
                    startListening();
                    timerRef.current = setInterval(() => {
                        setTimeLeft(t => {
                            if (t <= 1) {
                                clearInterval(timerRef.current);
                                timerRef.current = null;
                                stopListening();
                                setStage('done');
                                playBeep(440, 0.5);
                                speakText("Tempo esgotado. Muito bem!");
                                return 0;
                            }
                            return t - 1;
                        });
                    }, 1000);
                });
            }, [startListening, stopListening]);

            // Auto-avanço após exibir o resultado (autoaplicação)
            useEffect(() => {
                if (stage !== 'done') return;
                const iv = setInterval(() => {
                    setAutoLeft(s => {
                        if (s <= 1) { clearInterval(iv); onNext(); return 0; }
                        return s - 1;
                    });
                }, 1000);
                return () => clearInterval(iv);
            }, [stage]);

            const animals = useMemo(() => matchAnimals(transcript), [transcript]);

            return (
                <div className="flex flex-col items-center space-y-5 text-center bg-white p-4 sm:p-6 rounded-xl shadow-lg max-w-2xl mx-auto">
                    <StepHeader stepNumber={5} title="Fluência Verbal — Animais" />

                    {stage === 'intro' && (
                        <div className="space-y-4">
                            <p className="text-gray-600 text-lg">Você terá <strong>1 minuto</strong> para falar o maior número possível de <strong>nomes de animais</strong>.</p>
                            {micError && (
                                <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
                                    Sem microfone: digite os nomes dos animais no campo de texto durante o minuto.
                                </p>
                            )}
                            <button onClick={handleStart}
                                className="px-12 py-5 bg-blue-600 text-white rounded-xl font-bold text-2xl hover:bg-blue-700 shadow-lg transition-all active:scale-95">
                                Começar
                            </button>
                        </div>
                    )}

                    {stage === 'running' && (
                        <>
                            <div className={`text-7xl font-mono font-bold tabular-nums ${timeLeft <= 10 ? 'text-red-600 animate-pulse' : 'text-blue-600'}`}>
                                {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}
                            </div>
                            <VoiceBox isListening={isListening} transcript={transcript} interim={interim}
                                hint="Diga nomes de animais..." micError={micError} onTyped={appendText} />
                            <div className="text-base text-gray-500">Animais reconhecidos: <strong className="text-blue-700 text-xl">{animals.count}</strong></div>
                        </>
                    )}

                    {stage === 'done' && (
                        <>
                            <div className="bg-green-50 border border-green-200 rounded-lg p-4 w-full max-w-md">
                                <p className="text-green-800 font-bold text-xl">Animais contados: {animals.count}</p>
                                {animals.found.length > 0 && (
                                    <p className="text-green-700 text-sm mt-1">{animals.found.join(', ')}</p>
                                )}
                            </div>
                            <p className="text-sm text-gray-400">Avançando automaticamente em {autoLeft}s...</p>
                            <NextButton onClick={onNext} label="Continuar" />
                        </>
                    )}
                </div>
            );
        }

        /* ===== COMPONENTE: TESTE DO RELÓGIO (pontuação automática) ===== */

        const CLOCK_MAX_SECONDS = 180;

        function ClockPhase({ onFinish }) {
            const canvasRef = useRef(null);
            const wrapRef = useRef(null);
            const ctxRef = useRef(null);
            const strokesRef = useRef([]);
            const currentStrokeRef = useRef(null);
            const sizeRef = useRef(350);
            const finishedRef = useRef(false);
            const mountedRef = useRef(true);
            const [instructionDone, setInstructionDone] = useState(false);
            const [hasDrawn, setHasDrawn] = useState(false);
            const [strokeCount, setStrokeCount] = useState(0);
            const [timeLeft, setTimeLeft] = useState(CLOCK_MAX_SECONDS);
            const [result, setResult] = useState(null);
            const [autoLeft, setAutoLeft] = useState(8);
            // Estado da pontuação por IA: 'idle' | 'off' | 'loading' | 'done' | 'error'
            const [aiState, setAiState] = useState('idle');
            const [aiError, setAiError] = useState('');

            useEffect(() => {
                let cancelled = false;
                speakText(PHASE_INSTRUCTIONS[PHASES.CLOCK]).then(() => { if (!cancelled) setInstructionDone(true); });
                return () => { cancelled = true; stopSpeaking(); };
            }, []);

            useEffect(() => () => { mountedRef.current = false; }, []);

            // Canvas responsivo com suporte a telas de alta densidade
            useEffect(() => {
                const c = canvasRef.current;
                const wrap = wrapRef.current;
                if (!c || !wrap) return;
                const size = Math.min(wrap.clientWidth - 4, 420);
                sizeRef.current = size;
                const dpr = window.devicePixelRatio || 1;
                c.width = size * dpr;
                c.height = size * dpr;
                c.style.width = size + 'px';
                c.style.height = size + 'px';
                const ctx = c.getContext('2d');
                ctx.scale(dpr, dpr);
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, size, size);
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';
                ctx.lineWidth = 3;
                ctx.strokeStyle = '#000000';
                ctxRef.current = ctx;
            }, []);

            const redraw = () => {
                const ctx = ctxRef.current;
                const size = sizeRef.current;
                if (!ctx) return;
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, size, size);
                ctx.strokeStyle = '#000000';
                for (const stroke of strokesRef.current) {
                    if (stroke.length < 2) continue;
                    ctx.beginPath();
                    ctx.moveTo(stroke[0].x, stroke[0].y);
                    for (let i = 1; i < stroke.length; i++) ctx.lineTo(stroke[i].x, stroke[i].y);
                    ctx.stroke();
                }
            };

            const getPos = (e) => {
                const rect = canvasRef.current.getBoundingClientRect();
                return { x: e.clientX - rect.left, y: e.clientY - rect.top };
            };

            const onPointerDown = (e) => {
                if (finishedRef.current) return;
                e.preventDefault();
                e.target.setPointerCapture && e.target.setPointerCapture(e.pointerId);
                const p = getPos(e);
                currentStrokeRef.current = [p];
                const ctx = ctxRef.current;
                ctx.beginPath();
                ctx.moveTo(p.x, p.y);
                setHasDrawn(true);
            };
            const onPointerMove = (e) => {
                if (!currentStrokeRef.current || finishedRef.current) return;
                e.preventDefault();
                const p = getPos(e);
                currentStrokeRef.current.push(p);
                const ctx = ctxRef.current;
                ctx.lineTo(p.x, p.y);
                ctx.stroke();
            };
            const onPointerUp = (e) => {
                if (!currentStrokeRef.current) return;
                if (e) e.preventDefault();
                if (currentStrokeRef.current.length > 1) {
                    strokesRef.current.push(currentStrokeRef.current);
                    setStrokeCount(strokesRef.current.length);
                }
                currentStrokeRef.current = null;
            };

            const undo = () => {
                strokesRef.current.pop();
                setStrokeCount(strokesRef.current.length);
                if (!strokesRef.current.length) setHasDrawn(false);
                redraw();
            };
            const clearAll = () => {
                strokesRef.current = [];
                setStrokeCount(0);
                setHasDrawn(false);
                redraw();
            };

            const finishDrawing = useCallback(() => {
                if (finishedRef.current) return;
                finishedRef.current = true;
                onPointerUp();
                const geometric = analyzeClockStrokes(strokesRef.current, sizeRef.current);
                const image = canvasRef.current ? canvasRef.current.toDataURL('image/png') : null;
                // Pontuação geométrica imediata (sempre disponível, é a base/fallback).
                setResult({
                    ...geometric, image, strokes: strokesRef.current.length,
                    method: 'geometric',
                    geometricScore: geometric.score, geometricReason: geometric.reason
                });
                speakText("Desenho registrado. Muito bem.");

                // Se o examinador configurou uma chave, refina a nota com a IA.
                const key = getGeminiKey();
                if (!key || !image) { setAiState('off'); return; }
                setAiState('loading');
                scoreClockWithAI(image, key).then(ai => {
                    if (!mountedRef.current) return;
                    setResult(prev => ({ ...prev, score: ai.score, reason: ai.reason, method: 'ai', aiModel: ai.model }));
                    setAiState('done');
                }).catch(err => {
                    if (!mountedRef.current) return;
                    setAiError(err && err.message ? String(err.message) : 'falha');
                    setAiState('error'); // mantém a pontuação geométrica já exibida
                });
            }, []);

            // Tempo máximo de desenho (padronização)
            useEffect(() => {
                if (!instructionDone || result) return;
                const iv = setInterval(() => {
                    setTimeLeft(t => {
                        if (t <= 1) {
                            clearInterval(iv);
                            finishDrawing();
                            return 0;
                        }
                        return t - 1;
                    });
                }, 1000);
                return () => clearInterval(iv);
            }, [instructionDone, result, finishDrawing]);

            // Auto-avanço após mostrar o resultado (aguarda a IA, se estiver analisando)
            useEffect(() => {
                if (!result || aiState === 'loading') return;
                const iv = setInterval(() => {
                    setAutoLeft(s => {
                        if (s <= 1) { clearInterval(iv); onFinish(result); return 0; }
                        return s - 1;
                    });
                }, 1000);
                return () => clearInterval(iv);
            }, [result, aiState]);

            const repeatInstruction = () => speakText(PHASE_INSTRUCTIONS[PHASES.CLOCK]);

            return (
                <div className="flex flex-col items-center space-y-4 bg-white p-4 sm:p-6 rounded-xl shadow-lg max-w-2xl mx-auto" ref={wrapRef}>
                    <StepHeader stepNumber={6} title="Teste do Relógio" />
                    <p className="text-gray-600 text-center max-w-md">
                        Desenhe um relógio grande e redondo com <strong>todos os números</strong>, marcando <strong>11 horas e 10 minutos</strong>.
                    </p>

                    {!result && instructionDone && (
                        <div className={`text-sm font-mono font-bold ${timeLeft <= 30 ? 'text-red-600' : 'text-gray-400'}`}>
                            Tempo restante: {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}
                        </div>
                    )}

                    <canvas ref={canvasRef}
                        className="clock-canvas bg-white border-2 border-gray-300 rounded-lg shadow-inner cursor-crosshair"
                        onPointerDown={onPointerDown} onPointerMove={onPointerMove}
                        onPointerUp={onPointerUp} onPointerLeave={onPointerUp} onPointerCancel={onPointerUp} />

                    {!result ? (
                        <div className="flex gap-3 flex-wrap justify-center">
                            <RepeatButton onClick={repeatInstruction} disabled={!instructionDone} />
                            <button onClick={undo} disabled={!strokeCount}
                                className="flex items-center gap-2 px-4 py-2.5 bg-gray-200 rounded-lg font-medium text-gray-700 hover:bg-gray-300 transition-colors disabled:opacity-50">
                                <UndoIcon size={16}/> Desfazer
                            </button>
                            <button onClick={clearAll} disabled={!hasDrawn}
                                className="px-4 py-2.5 bg-gray-200 rounded-lg font-medium text-gray-700 hover:bg-gray-300 transition-colors disabled:opacity-50">
                                Limpar tudo
                            </button>
                            <button onClick={finishDrawing} disabled={!hasDrawn}
                                className={`flex items-center gap-2 px-6 py-2.5 rounded-lg font-bold transition-all
                                    ${hasDrawn ? 'bg-green-600 text-white hover:bg-green-700 shadow' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}>
                                <SaveIcon size={16}/> Finalizar
                            </button>
                        </div>
                    ) : (
                        <div className="w-full max-w-lg bg-blue-50 p-4 rounded-lg border border-blue-200 space-y-2 text-center">
                            <p className="text-blue-900 font-bold flex items-center gap-2 justify-center">
                                <CheckIcon size={18}/> Desenho registrado
                            </p>
                            {aiState === 'loading' ? (
                                <p className="text-sm text-blue-700 flex items-center gap-2 justify-center" aria-live="polite">
                                    <span className="inline-block w-4 h-4 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin"></span>
                                    Analisando o relógio com inteligência artificial...
                                </p>
                            ) : (
                                <>
                                    <p className="text-xs text-blue-700">
                                        {aiState === 'done'
                                            ? 'Pontuado por IA (Gemini). Revisão no relatório final.'
                                            : aiState === 'error'
                                            ? 'IA indisponível — usando a análise geométrica local.'
                                            : 'A pontuação é calculada automaticamente e revisada no relatório final.'}
                                    </p>
                                    {aiState === 'error' && aiError && (
                                        <p className="text-[11px] text-gray-400">Motivo: {aiError}</p>
                                    )}
                                    <p className="text-sm text-gray-400">Avançando automaticamente em {autoLeft}s...</p>
                                    <NextButton onClick={() => onFinish(result)} label="Continuar" />
                                </>
                            )}
                        </div>
                    )}
                </div>
            );
        }

        /* ===== COMPONENTE: PAUSA DE INTERFERÊNCIA ===== */

        function RestPhase({ learningEndAt, onDone }) {
            const onDoneRef = useRef(onDone);
            onDoneRef.current = onDone;
            const totalMs = useMemo(() => {
                if (!learningEndAt) return 0;
                return Math.max(0, MIN_INTERFERENCE_MS - (Date.now() - learningEndAt));
            }, []);
            const [left, setLeft] = useState(Math.ceil(totalMs / 1000));

            useEffect(() => {
                if (totalMs <= 1000) {
                    onDoneRef.current();
                    return;
                }
                speakText(PHASE_INSTRUCTIONS[PHASES.REST]);
                const iv = setInterval(() => {
                    setLeft(l => {
                        if (l <= 1) {
                            clearInterval(iv);
                            onDoneRef.current();
                            return 0;
                        }
                        return l - 1;
                    });
                }, 1000);
                return () => { clearInterval(iv); stopSpeaking(); };
            }, []);

            if (totalMs <= 1000) return null;

            return (
                <div className="flex flex-col items-center space-y-6 text-center bg-white p-8 rounded-xl shadow-lg max-w-xl mx-auto">
                    <StepHeader title="Pequena pausa" />
                    <ClockIcon size={56} className="text-blue-400"/>
                    <p className="text-gray-600 text-lg max-w-sm">
                        Relaxe um pouco. O teste continuará <strong>automaticamente</strong> — não feche a página.
                    </p>
                    <div className="text-6xl font-mono font-bold text-blue-600 tabular-nums">
                        {Math.floor(left / 60)}:{String(left % 60).padStart(2, '0')}
                    </div>
                    <p className="text-xs text-gray-400 max-w-sm">
                        Esta pausa garante o intervalo padronizado de 5 minutos antes da próxima etapa de memória.
                    </p>
                </div>
            );
        }

        /* ===== COMPONENTE: RELATÓRIO FINAL ===== */

        function ReportPhase({ results, educationLevel, setEducationLevel, patientInfo, startedAt, onDownload }) {
            const cutoffs = { incidental: 4, immediate: 6, learning: 6, delayed: 5, recognition: 7 };
            const fluencyCutoff = educationLevel === 0 ? 8 : educationLevel === 1 ? 11 : 12;
            const totalMin = startedAt ? Math.round((Date.now() - startedAt) / 60000) : null;

            useEffect(() => {
                speakText("O teste terminou. Muito obrigado pela sua participação. Os resultados estão na tela.");
                return () => stopSpeaking();
            }, []);

            const s = (key) => (results[key] && typeof results[key].score === 'number') ? results[key].score : 0;

            const StatusBadge = ({ score, cutoff }) => {
                if (cutoff === undefined) return null;
                return score <= cutoff
                    ? <span className="text-red-600 font-bold flex items-center gap-1 text-xs whitespace-nowrap"><AlertIcon size={14}/> Abaixo do corte</span>
                    : <span className="text-green-600 font-bold flex items-center gap-1 text-xs whitespace-nowrap"><CheckIcon size={14}/> Normal</span>;
            };

            const ScoreRow = ({ label, score, max, cutoff, highlight }) => (
                <li className={`flex justify-between items-center py-2 ${highlight ? 'bg-blue-50 px-3 rounded-lg -mx-1' : ''}`}>
                    <span className={highlight ? 'font-bold text-blue-900' : ''}>{label}:</span>
                    <div className="flex items-center gap-3">
                        <span className={`font-mono font-bold ${highlight ? 'text-lg' : ''}`}>{score}{max ? `/${max}` : ''}</span>
                        <StatusBadge score={score} cutoff={cutoff} />
                    </div>
                </li>
            );

            const clock = results.clock || {};
            const recog = results.recognition || {};

            return (
                <div className="max-w-3xl mx-auto bg-white p-5 sm:p-8 rounded-xl shadow-lg print:shadow-none">
                    <div className="text-center mb-6">
                        <BrainIcon size={36} className="mx-auto text-blue-600 mb-2"/>
                        <h1 className="text-3xl font-bold text-blue-900 mb-1">Relatório BBRC Digital</h1>
                        <p className="text-gray-500 text-sm">Bateria Breve de Rastreio Cognitivo — Aplicação autoadministrada</p>
                        <p className="text-gray-400 text-xs mt-1">
                            Data: {new Date().toLocaleDateString('pt-BR')} · {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                            {patientInfo.age ? ` · Idade: ${patientInfo.age} anos` : ''}
                            {totalMin !== null ? ` · Duração: ~${totalMin} min` : ''}
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-gray-50 p-5 rounded-lg border">
                            <h3 className="font-bold text-gray-700 border-b pb-2 mb-3 flex items-center gap-2">
                                <BrainIcon size={18}/> Teste de Memória de Figuras
                            </h3>
                            <ul className="space-y-1 text-sm">
                                <ScoreRow label="Nomeação" score={s('naming')} max={10} />
                                <ScoreRow label="M. Incidental (corte ≤4)" score={s('incidental')} max={10} cutoff={cutoffs.incidental} />
                                <ScoreRow label="M. Imediata (corte ≤6)" score={s('immediate')} max={10} cutoff={cutoffs.immediate} />
                                <ScoreRow label="Aprendizado (corte ≤6)" score={s('learning')} max={10} cutoff={cutoffs.learning} />
                                <ScoreRow label="M. Tardia (corte ≤5)" score={s('delayed')} max={10} cutoff={cutoffs.delayed} highlight />
                                <ScoreRow label="Reconhecimento (corte ≤7)" score={s('recognition')} max={10} cutoff={cutoffs.recognition} />
                            </ul>
                            {(recog.falseAlarms > 0) && (
                                <p className="text-xs text-gray-400 mt-2">
                                    Reconhecimento corrigido: {recog.hits} acerto(s) − {recog.falseAlarms} falso(s) positivo(s).
                                </p>
                            )}
                        </div>

                        <div className="bg-gray-50 p-5 rounded-lg border">
                            <h3 className="font-bold text-gray-700 border-b pb-2 mb-3 flex items-center gap-2">
                                <ClockIcon size={18}/> Testes de Interferência
                            </h3>
                            <div className="mb-4 no-print">
                                <label className="block text-xs font-semibold text-gray-500 mb-1">Escolaridade:</label>
                                <select value={educationLevel} onChange={e => setEducationLevel(Number(e.target.value))}
                                    className="w-full p-2 border border-gray-300 rounded-lg text-sm bg-white">
                                    <option value={0}>Analfabeto</option>
                                    <option value={1}>1–7 anos de estudo</option>
                                    <option value={2}>8+ anos de estudo</option>
                                </select>
                            </div>
                            <ul className="space-y-3 text-sm">
                                <li>
                                    <div className="flex justify-between items-center">
                                        <span>Fluência Verbal (animais):</span>
                                        <div className="flex items-center gap-3">
                                            <span className="font-mono font-bold text-lg">{s('fluency')}</span>
                                            <StatusBadge score={s('fluency')} cutoff={fluencyCutoff} />
                                        </div>
                                    </div>
                                    <p className="text-xs text-gray-400 mt-0.5">Corte: ≤8 (analf.) · ≤11 (1-7a) · ≤12 (8+a)</p>
                                </li>
                                <li>
                                    <div className="flex justify-between items-center">
                                        <span className="flex items-center gap-1.5">
                                            Desenho do Relógio (Shulman):
                                            {clock.method === 'ai' && (
                                                <span className="text-[10px] font-bold text-purple-700 bg-purple-100 px-1.5 py-0.5 rounded-full whitespace-nowrap">IA</span>
                                            )}
                                        </span>
                                        <span className="font-mono font-bold text-lg">{s('clock')}/5</span>
                                    </div>
                                    <p className="text-xs text-gray-400 mt-0.5">
                                        {SHULMAN_CRITERIA.find(c => c.score === s('clock'))?.label}
                                    </p>
                                    {clock.reason && (
                                        <p className="text-xs text-gray-400 mt-0.5">
                                            {clock.method === 'ai'
                                                ? `Avaliação por IA (${clock.aiModel || 'Gemini'}): `
                                                : 'Análise geométrica: '}
                                            {clock.reason}
                                        </p>
                                    )}
                                    {clock.method === 'ai' && typeof clock.geometricScore === 'number' && clock.geometricScore !== s('clock') && (
                                        <p className="text-[11px] text-gray-300 mt-0.5">Análise geométrica local sugeria: {clock.geometricScore}/5</p>
                                    )}
                                </li>
                            </ul>
                            {clock.image && (
                                <div className="mt-3">
                                    <p className="text-xs font-semibold text-gray-500 mb-1">Desenho realizado:</p>
                                    <img src={clock.image} alt="Desenho do relógio do participante"
                                         className="w-36 h-36 border rounded-lg bg-white" />
                                </div>
                            )}
                        </div>
                    </div>

                    <details className="mt-6 border rounded-lg no-print">
                        <summary className="p-3 font-bold text-gray-600 cursor-pointer hover:bg-gray-50 text-sm">
                            Detalhes das respostas (transcrições e itens identificados)
                        </summary>
                        <div className="p-4 space-y-3 text-xs text-gray-600 bg-gray-50">
                            {Object.entries(results).map(([key, val]) => {
                                if (!val || key === 'clock') return null;
                                return (
                                    <div key={key} className="border-b border-gray-200 pb-2">
                                        <strong className="text-gray-700 capitalize">{val.label || key}</strong>
                                        {val.transcript !== undefined && <div className="mt-0.5">Transcrição: <em>{val.transcript || '(sem resposta)'}</em></div>}
                                        {val.found && val.found.length > 0 && <div>Itens corretos: {val.found.join(', ')}</div>}
                                        {val.intrusions && val.intrusions.length > 0 && <div>Outras palavras ditas: {val.intrusions.join(', ')}</div>}
                                        {val.distractorsNamed && val.distractorsNamed.length > 0 && <div>Falsos positivos: {val.distractorsNamed.join(', ')}</div>}
                                        {typeof val.perseverations === 'number' && val.perseverations > 0 && <div>Repetições: {val.perseverations}</div>}
                                        {typeof val.durationMs === 'number' && <div>Duração da etapa: {Math.round(val.durationMs / 1000)}s</div>}
                                    </div>
                                );
                            })}
                        </div>
                    </details>

                    <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
                        <strong>Nota:</strong> Este é um instrumento de <strong>rastreio</strong> aplicado de forma automatizada, com pontuação
                        por reconhecimento de voz e análise computacional do desenho — sujeita a imprecisões. Resultados abaixo do ponto
                        de corte indicam necessidade de avaliação presencial por profissional de saúde. Este resultado <strong>não é diagnóstico</strong>.
                    </div>

                    <div className="mt-3 p-3 bg-gray-50 border rounded-lg text-xs text-gray-500">
                        <strong>Referências:</strong> Nitrini R et al. Arq Neuropsiquiatr, 1994; Shulman KI, 2000;
                        Smid J et al. Dement Neuropsychol, 2022 (Consenso ABN). Versão do aplicativo: {APP_VERSION}.
                    </div>

                    <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3 no-print">
                        <button onClick={() => window.print()}
                            className="py-3 border-2 border-blue-600 text-blue-600 font-bold rounded-lg hover:bg-blue-50 flex items-center justify-center gap-2 transition-colors">
                            <PrintIcon size={18}/> Imprimir / PDF
                        </button>
                        <button onClick={onDownload}
                            className="py-3 border-2 border-gray-400 text-gray-600 font-bold rounded-lg hover:bg-gray-50 flex items-center justify-center gap-2 transition-colors">
                            <DownloadIcon size={18}/> Baixar dados (JSON)
                        </button>
                        <button onClick={() => window.location.reload()}
                            className="py-3 border-2 border-green-600 text-green-600 font-bold rounded-lg hover:bg-green-50 flex items-center justify-center gap-2 transition-colors">
                            <RepeatIcon size={18}/> Novo teste
                        </button>
                    </div>
                </div>
            );
        }

        /* ===== APP PRINCIPAL ===== */

        const VOICE_PHASES = [PHASES.NAMING, PHASES.INCIDENTAL, PHASES.IMMEDIATE_RECALL, PHASES.LEARNING_RECALL, PHASES.DELAYED, PHASES.RECOGNITION];

        function App() {
            const [phase, setPhase] = useState(PHASES.WELCOME);
            const [results, setResults] = useState({});
            const [educationLevel, setEducationLevel] = useState(2);
            const [patientInfo, setPatientInfo] = useState({ age: '' });
            const phaseStartRef = useRef(Date.now());
            const learningEndRef = useRef(null);
            const startedAtRef = useRef(null);
            const savedRef = useRef(false);

            const speech = useSpeechRecognition();
            const { micPermission, requestPermission } = useMicrophonePermission();

            const inTest = phase !== PHASES.WELCOME && phase !== PHASES.REPORT;
            useWakeLock(inTest);

            // Aviso ao tentar fechar/atualizar durante o teste
            useEffect(() => {
                if (!inTest) return;
                const handler = (e) => { e.preventDefault(); e.returnValue = ''; };
                window.addEventListener('beforeunload', handler);
                return () => window.removeEventListener('beforeunload', handler);
            }, [inTest]);

            const handleRequestPermission = useCallback(async () => {
                const granted = await requestPermission();
                if (granted) speech.clearError();
                return granted;
            }, [requestPermission, speech]);

            const goTo = useCallback((nextPhase) => {
                phaseStartRef.current = Date.now();
                setPhase(nextPhase);
            }, []);

            /* --- Pontuar a fase atual e avançar --- */
            const scoreAndAdvance = useCallback((fromPhase) => {
                speech.stopListening();
                stopSpeaking();
                const text = speech.transcript;
                const durationMs = Date.now() - phaseStartRef.current;

                const labels = {
                    [PHASES.NAMING]: 'Nomeação',
                    [PHASES.INCIDENTAL]: 'Memória Incidental',
                    [PHASES.IMMEDIATE_RECALL]: 'Memória Imediata',
                    [PHASES.LEARNING_RECALL]: 'Aprendizado',
                    [PHASES.FLUENCY]: 'Fluência Verbal',
                    [PHASES.DELAYED]: 'Memória Tardia',
                    [PHASES.RECOGNITION]: 'Reconhecimento',
                };
                const keys = {
                    [PHASES.NAMING]: 'naming',
                    [PHASES.INCIDENTAL]: 'incidental',
                    [PHASES.IMMEDIATE_RECALL]: 'immediate',
                    [PHASES.LEARNING_RECALL]: 'learning',
                    [PHASES.FLUENCY]: 'fluency',
                    [PHASES.DELAYED]: 'delayed',
                    [PHASES.RECOGNITION]: 'recognition',
                };
                const key = keys[fromPhase];

                if (key) {
                    let detail;
                    if (fromPhase === PHASES.FLUENCY) {
                        const m = matchAnimals(text);
                        detail = { score: m.count, found: m.found, perseverations: m.perseverations };
                    } else if (fromPhase === PHASES.RECOGNITION) {
                        detail = scoreRecognition(text);
                    } else {
                        const m = matchTargetFigures(text);
                        detail = { score: m.count, found: m.found, intrusions: m.intrusions };
                    }
                    detail.label = labels[fromPhase];
                    detail.transcript = text;
                    detail.durationMs = durationMs;
                    setResults(prev => ({ ...prev, [key]: detail }));
                }

                if (fromPhase === PHASES.LEARNING_RECALL) {
                    learningEndRef.current = Date.now();
                }

                speech.resetTranscript();
                const idx = PHASE_ORDER.indexOf(fromPhase);
                if (idx >= 0 && idx < PHASE_ORDER.length - 1) {
                    goTo(PHASE_ORDER[idx + 1]);
                }
            }, [speech, goTo]);

            /* --- Comando de voz: "terminei" encerra a etapa --- */
            useEffect(() => {
                if (!VOICE_PHASES.includes(phase)) return;
                if (FINISH_REGEX.test(normalize(speech.transcript))) {
                    scoreAndAdvance(phase);
                }
            }, [speech.transcript, phase, scoreAndAdvance]);

            /* --- Handlers --- */
            const handleWelcomeStart = useCallback(() => {
                stopSpeaking();
                startedAtRef.current = Date.now();
                goTo(PHASES.NAMING);
            }, [goTo]);

            const handleClockFinish = useCallback((detail) => {
                stopSpeaking();
                setResults(prev => ({
                    ...prev,
                    clock: { ...detail, label: 'Teste do Relógio', durationMs: Date.now() - phaseStartRef.current }
                }));
                goTo(PHASES.REST);
            }, [goTo]);

            /* --- Exportação e persistência --- */
            const buildExport = useCallback((includeImage) => {
                const out = {
                    instrument: 'BBRC Digital',
                    version: APP_VERSION,
                    date: new Date().toISOString(),
                    educationLevel,
                    age: patientInfo.age || null,
                    totalDurationMs: startedAtRef.current ? Date.now() - startedAtRef.current : null,
                    userAgent: navigator.userAgent,
                    results: {}
                };
                for (const [key, val] of Object.entries(results)) {
                    out.results[key] = { ...val };
                    if (!includeImage) delete out.results[key].image;
                    delete out.results[key].strokes;
                }
                return out;
            }, [results, educationLevel, patientInfo]);

            useEffect(() => {
                if (phase !== PHASES.REPORT || savedRef.current) return;
                savedRef.current = true;
                try {
                    const history = JSON.parse(localStorage.getItem('bbrc_history') || '[]');
                    history.push(buildExport(false));
                    localStorage.setItem('bbrc_history', JSON.stringify(history.slice(-20)));
                } catch (e) {}
            }, [phase, buildExport]);

            const downloadJson = useCallback(() => {
                const blob = new Blob([JSON.stringify(buildExport(true), null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `bbrc_resultado_${new Date().toISOString().slice(0, 10)}.json`;
                a.click();
                setTimeout(() => URL.revokeObjectURL(url), 5000);
            }, [buildExport]);

            /* --- Barra de progresso --- */
            const currentStep = PHASE_ORDER.indexOf(phase);
            const totalSteps = PHASE_ORDER.length - 1;
            const progress = phase === PHASES.REPORT ? 100 : Math.round((currentStep / totalSteps) * 100);
            const progressBarStyle = { width: progress + '%' };

            return (
                <div className="min-h-screen bg-slate-100 pb-16 font-sans text-slate-900">
                    <header className="sticky top-0 z-50 bg-white shadow-sm no-print">
                        <div className="max-w-4xl mx-auto px-4 py-3 flex justify-between items-center">
                            <h1 className="text-lg font-bold text-blue-800 flex items-center gap-2">
                                <BrainIcon className="text-blue-600" size={22}/> BBRC Digital
                            </h1>
                            <div className="text-sm font-medium text-gray-600">{PHASE_LABELS[phase] || ''}</div>
                        </div>
                        <div className="h-1 bg-gray-200">
                            <div className="h-1 bg-blue-500 transition-all duration-500" style={progressBarStyle}></div>
                        </div>
                    </header>

                    <main className="max-w-4xl mx-auto px-3 sm:px-4 py-6">

                        {inTest && phase !== PHASES.REST && (
                            <MicPermissionBanner
                                micPermission={micPermission}
                                micError={speech.micError}
                                onRequestPermission={handleRequestPermission}
                            />
                        )}

                        {phase === PHASES.WELCOME && (
                            <WelcomePhase onStart={handleWelcomeStart}
                                micPermission={micPermission} requestPermission={requestPermission}
                                speech={speech}
                                educationLevel={educationLevel} setEducationLevel={setEducationLevel}
                                patientInfo={patientInfo} setPatientInfo={setPatientInfo} />
                        )}

                        {phase === PHASES.NAMING && (
                            <VoicePhase stepNumber={1} title="Nomeação" phaseKey={PHASES.NAMING}
                                imageSrc="./bbrc_estimulos.jpg" imageAlt="10 figuras estímulo BBRC"
                                description="Diga o nome de cada figura em voz alta."
                                hint="Diga o nome de cada figura..."
                                speech={speech} maxMs={120000} silenceMs={10000}
                                onNext={() => scoreAndAdvance(PHASES.NAMING)} />
                        )}

                        {phase === PHASES.INCIDENTAL && (
                            <VoicePhase stepNumber={2} title="Memória Incidental" phaseKey={PHASES.INCIDENTAL}
                                hiddenBox hint="Diga as figuras que você lembra..."
                                speech={speech} maxMs={90000} silenceMs={12000}
                                onNext={() => scoreAndAdvance(PHASES.INCIDENTAL)} />
                        )}

                        {phase === PHASES.IMMEDIATE_SHOW && (
                            <ExposurePhase stepNumber={3} title="Memória Imediata — Observação"
                                phaseKey={PHASES.IMMEDIATE_SHOW}
                                onTimerEnd={() => goTo(PHASES.IMMEDIATE_RECALL)} />
                        )}

                        {phase === PHASES.IMMEDIATE_RECALL && (
                            <VoicePhase stepNumber={3} title="Memória Imediata — Evocação" phaseKey={PHASES.IMMEDIATE_RECALL}
                                hiddenBox hint="Diga as figuras que você lembra..."
                                speech={speech} maxMs={90000} silenceMs={12000}
                                onNext={() => scoreAndAdvance(PHASES.IMMEDIATE_RECALL)} />
                        )}

                        {phase === PHASES.LEARNING_SHOW && (
                            <ExposurePhase stepNumber={4} title="Aprendizado — Observação"
                                phaseKey={PHASES.LEARNING_SHOW}
                                onTimerEnd={() => goTo(PHASES.LEARNING_RECALL)} />
                        )}

                        {phase === PHASES.LEARNING_RECALL && (
                            <VoicePhase stepNumber={4} title="Aprendizado — Evocação" phaseKey={PHASES.LEARNING_RECALL}
                                hiddenBox hint="Diga as figuras que você lembra..."
                                speech={speech} maxMs={90000} silenceMs={12000}
                                onNext={() => scoreAndAdvance(PHASES.LEARNING_RECALL)} />
                        )}

                        {phase === PHASES.FLUENCY && (
                            <FluencyPhase speech={speech} onNext={() => scoreAndAdvance(PHASES.FLUENCY)} />
                        )}

                        {phase === PHASES.CLOCK && (
                            <ClockPhase onFinish={handleClockFinish} />
                        )}

                        {phase === PHASES.REST && (
                            <RestPhase learningEndAt={learningEndRef.current} onDone={() => goTo(PHASES.DELAYED)} />
                        )}

                        {phase === PHASES.DELAYED && (
                            <VoicePhase stepNumber={7} title="Memória Tardia" phaseKey={PHASES.DELAYED}
                                hiddenBox hint="Diga as figuras que você lembra..."
                                speech={speech} maxMs={90000} silenceMs={12000}
                                onNext={() => scoreAndAdvance(PHASES.DELAYED)} />
                        )}

                        {phase === PHASES.RECOGNITION && (
                            <VoicePhase stepNumber={8} title="Reconhecimento" phaseKey={PHASES.RECOGNITION}
                                imageSrc="./bbrc_reconhecimento.jpg" imageAlt="20 figuras - reconhecimento BBRC"
                                description="Diga apenas as figuras que faziam parte do primeiro grupo."
                                hint="Diga as figuras que reconhece..."
                                speech={speech} maxMs={120000} silenceMs={12000}
                                onNext={() => scoreAndAdvance(PHASES.RECOGNITION)} />
                        )}

                        {phase === PHASES.REPORT && (
                            <ReportPhase
                                results={results}
                                educationLevel={educationLevel}
                                setEducationLevel={setEducationLevel}
                                patientInfo={patientInfo}
                                startedAt={startedAtRef.current}
                                onDownload={downloadJson}
                            />
                        )}

                    </main>

                    {/* Indicador de microfone fixo */}
                    {inTest && (
                        <div className={`fixed bottom-4 right-4 flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-lg border text-xs no-print z-50
                            ${(speech.micError === 'not-allowed' || micPermission === 'denied') ? 'border-red-300 cursor-pointer' : ''}`}
                            onClick={(speech.micError === 'not-allowed' || micPermission === 'denied') ? handleRequestPermission : undefined}>
                            {(speech.micError === 'not-allowed' || micPermission === 'denied') ? (
                                <>
                                    <MicOffIcon size={14} className="text-red-500"/>
                                    <span className="text-red-600 font-bold">Mic bloqueado — toque para habilitar</span>
                                </>
                            ) : speech.micError === 'unsupported' ? (
                                <>
                                    <MicOffIcon size={14} className="text-amber-500"/>
                                    <span className="text-amber-600 font-bold">Modo digitado</span>
                                </>
                            ) : speech.isListening ? (
                                <>
                                    <span className="relative flex h-3 w-3">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                                    </span>
                                    <span className="text-red-600 font-bold">Microfone Ativo</span>
                                </>
                            ) : (
                                <>
                                    <span className="w-3 h-3 rounded-full bg-gray-300"></span>
                                    <span className="text-gray-400">Microfone em espera</span>
                                </>
                            )}
                        </div>
                    )}
                </div>
            );
        }

        ReactDOM.createRoot(document.getElementById('root')).render(<App/>);
    
