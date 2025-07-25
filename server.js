// Importa as dependências necessárias
const express = require("express");
const cors = require("cors");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { MongoClient, ServerApiVersion } = require("mongodb");
require("dotenv").config();

// Configuração do Express
const app = express();
const port = process.env.PORT || 8080;

// Middleware
app.use(cors({
  origin: "https://diomini.netlify.app", // Permite requisições apenas do seu frontend no Netlify
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  credentials: true, // Permite o envio de cookies de sessão
  optionsSuccessStatus: 204
}));
app.use(express.json());
app.use(express.static("public"));

// --- CONFIGURAÇÃO DO GEMINI ---
const API_KEY = process.env.GEMINI_API_KEY;

if (!API_KEY) {
  console.error("!!! Atenção: GEMINI_API_KEY não definida nas variáveis de ambiente da plataforma !!!");
  process.exit(1);
} else {
  console.log("Chave da API do Gemini carregada via variável de ambiente.");
}

// Inicializa o modelo Gemini
const genAI = new GoogleGenerativeAI(API_KEY);

// --- CONFIGURAÇÃO DAS APIS EXTERNAS ---
const OPENWEATHER_API_KEY = "d1d0bf3ee64f4bc85977d6900b30f57b";
const API_NINJAS_KEY = "byoyzMQvCatHfNsY2vYkEw==kO8JT5LPyqoXj7fS";

// --- CONFIGURAÇÃO DO MONGODB ---
const mongoUriLogs = process.env.MONGO_URI_LOGS || "mongodb+srv://user_log_acess:Log4c3ss2025@cluster0.nbt3sks.mongodb.net/IIW2023A_Logs?retryWrites=true&w=majority&appName=Cluster0";
const mongoUriHistoria = process.env.MONGO_URI_HISTORIA;

let dbLogs;
let dbHistoria;

// Array para simular dados de ranking
let dadosRankingVitrine = [];

async function connectToMongoDB(uri, dbName) {
    if (!uri) {
        console.error(`URI do MongoDB para ${dbName} não definida!`);
        return null;
    }
    
    const client = new MongoClient(uri, {
        serverApi: {
            version: ServerApiVersion.v1,
            strict: true,
            deprecationErrors: true,
        }
    });
    
    try {
        await client.connect();
        console.log(`Conectado ao MongoDB Atlas: ${dbName}`);
        return client.db(dbName);
    } catch (err) {
        console.error(`Falha ao conectar ao MongoDB ${dbName}:`, err);
        return null;
    }
}

async function initializeDatabases() {
    if (mongoUriLogs) {
        dbLogs = await connectToMongoDB(mongoUriLogs, "IIW2023A_Logs");
    }
    
    if (mongoUriHistoria) {
        dbHistoria = await connectToMongoDB(mongoUriHistoria, "chatbotHistoriaDB");
    }
    
    if (!dbLogs && !dbHistoria) {
        console.error("Falha ao conectar a qualquer banco de dados. Verifique as URIs e configurações.");
    }
}

// Inicializar conexões com bancos de dados
initializeDatabases();

// --- FUNÇÕES PARA APIS EXTERNAS ---

// Função para obter informações de clima via OpenWeather
async function getWeatherInfo(city) {
  try {
    const response = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${OPENWEATHER_API_KEY}&units=metric&lang=pt_br`);
    
    if (!response.ok) {
      throw new Error(`Erro na API OpenWeather: ${response.status}`);
    }
    
    const data = await response.json();
    
    return {
      cidade: data.name,
      pais: data.sys.country,
      temperatura: Math.round(data.main.temp),
      sensacao_termica: Math.round(data.main.feels_like),
      umidade: data.main.humidity,
      descricao: data.weather[0].description,
      vento: data.wind.speed,
      coordenadas: {
        lat: data.coord.lat,
        lon: data.coord.lon
      }
    };
  } catch (error) {
    console.error("Erro ao obter informações de clima:", error);
    throw error;
  }
}

// Função para obter informações de timezone via API Ninjas
async function getTimezoneInfo(city) {
  try {
    const response = await fetch(`https://api.api-ninjas.com/v1/timezone?city=${encodeURIComponent(city)}`, {
      headers: {
        'X-Api-Key': API_NINJAS_KEY
      }
    });
    
    if (!response.ok) {
      throw new Error(`Erro na API Ninjas Timezone: ${response.status}`);
    }
    
    const data = await response.json();
    
    // A API Ninjas retorna o offset em horas, precisamos converter para minutos para calcular a hora local
    const offsetHoras = data.timezone;
    const agoraUtc = new Date();
    const horaLocal = new Date(agoraUtc.getTime() + (offsetHoras * 3600 * 1000)); // Adiciona o offset em milissegundos
    
    return {
      timezone: data.timezone_name || `UTC${data.timezone >= 0 ? '+' : ''}${data.timezone}`,
      hora_local: horaLocal.toLocaleTimeString('pt-BR', { 
        hour: '2-digit', 
        minute: '2-digit',
        second: '2-digit'
      }),
      data_local: horaLocal.toLocaleDateString('pt-BR'),
      offset_utc: data.timezone
    };
  } catch (error) {
    console.error("Erro ao obter informações de timezone:", error);
    throw error;
  }
}

// Personalidade do Dio-Sama
const DIO_PERSONALITY = `
Você é Dio Brando, também conhecido como DIO, o vampiro imortal de JoJo's Bizarre Adventure. 
Você é arrogante, dramático, carismático e se considera superior a todos os mortais.

Características da sua personalidade:
- Sempre se refere a si mesmo como "Dio-sama" ou "DIO"
- É extremamente arrogante e condescendente
- Usa expressões dramáticas e teatrais
- Frequentemente menciona seu poder, imortalidade e superioridade
- Despreza a humanidade, mas pode ser "generoso" com informações
- Usa frases icônicas como "MUDA MUDA MUDA!", "WRYYY!", "Você pensou que era X, mas era eu, DIO!"
- É inteligente e estratégico
- Gosta de demonstrar conhecimento superior
- Sempre mantém um tom majestoso e intimidador

Quando for solicitado a fornecer informações sobre clima ou horário, **você DEVE usar os dados fornecidos no contexto (weatherData e timeData) para construir sua resposta de forma natural e fluida, mantendo sua persona dramática e arrogante**. É IMPERATIVO que você incorpore os dados reais de forma fluida na sua resposta, mantendo sua persona. NUNCA imprima placeholders como "[temperatura atual em X]" ou "[horário atual]". Por exemplo, se a temperatura for 25°C em São Paulo, você pode dizer: "Hmph, em São Paulo, a temperatura é de meros 25 graus Celsius. Um clima suportável para um mortal, eu suponho."

Responda sempre como Dio Brando responderia, mantendo sua arrogância característica, mas sendo útil nas informações solicitadas.
`;

// Função para detectar se o usuário está perguntando sobre clima ou horário
function detectWeatherOrTimeQuery(message) {
  const weatherKeywords = ['clima', 'tempo', 'temperatura', 'chuva', 'sol', 'vento', 'umidade', 'previsão'];
  const timeKeywords = ['hora', 'horário', 'que horas', 'fuso', 'timezone'];
  const locationKeywords = ['em', 'de', 'do', 'da', 'no', 'na', 'para']; // Adicionado 'para'
  
  const lowerMessage = message.toLowerCase();
  
  const hasWeatherKeyword = weatherKeywords.some(keyword => lowerMessage.includes(keyword));
  const hasTimeKeyword = timeKeywords.some(keyword => lowerMessage.includes(keyword));
  
  let city = null;
  // Tentar extrair a cidade de forma mais robusta
  const cityMatch = lowerMessage.match(/(?:em|de|do|da|no|na|para)\s+([a-zà-ú\s]+)(?:\?|\.|\!|$)/);
  if (cityMatch && cityMatch[1]) {
    city = cityMatch[1].trim();
    // Remover palavras-chave de clima/tempo do nome da cidade, se houver
    weatherKeywords.forEach(kw => city = city.replace(new RegExp(`\b${kw}\b`, 'g'), '').trim());
    timeKeywords.forEach(kw => city = city.replace(new RegExp(`\b${kw}\b`, 'g'), '').trim());
  }

  // Se não encontrou cidade específica, usar uma cidade padrão
  if (!city || city.length < 2) { // Considerar cidades com pelo menos 2 caracteres
    city = 'São Paulo'; // Cidade padrão
  }
    
  if (hasWeatherKeyword || hasTimeKeyword) {
    return {
      isWeatherQuery: hasWeatherKeyword,
      isTimeQuery: hasTimeKeyword,
      city: city
    };
  }
  
  return null;
}

// Função para gerar conteúdo com o modelo Gemini
async function generateContent(prompt, chatHistory = [], weatherData = null, timeData = null) {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-pro" });
    
    let contextInfo = "";
    if (weatherData) {
      contextInfo += `\n\nDados de Clima para ${weatherData.cidade}, ${weatherData.pais}:
Temperatura: ${weatherData.temperatura}°C (sensação térmica: ${weatherData.sensacao_termica}°C)
Descrição: ${weatherData.descricao}
Umidade: ${weatherData.umidade}%
Vento: ${weatherData.vento} m/s\n`;
    }
    
    if (timeData) {
      contextInfo += `\n\nDados de Horário para ${timeData.cidade || 'a cidade solicitada'}:
Hora local: ${timeData.hora_local}
Data local: ${timeData.data_local}
Timezone: ${timeData.timezone}
Offset UTC: ${timeData.offset_utc}h\n`;
    }
    
    // Construir o histórico para o contexto
    // A instrução crucial para o Gemini usar os dados está na DIO_PERSONALITY
    const fullPrompt = DIO_PERSONALITY + contextInfo + "\n\nHistórico da conversa:\n" + 
      chatHistory.map(msg => `${msg.role === 'user' ? 'Humano' : 'DIO'}: ${msg.parts[0].text}`).join('\n') +
      "\n\nNova mensagem do humano: " + prompt +
      "\n\nResponda como DIO:";
    
    const result = await model.generateContent(fullPrompt);
    const response = await result.response;
    const text = response.text();
    return text;
  } catch (error) {
    console.error('Erro ao gerar conteúdo com a API Gemini:', error);
    throw error;
  }
}

// --- ROTAS DA API ---

// Rota para obter informações do usuário (IP)
app.get("/api/user-info", (req, res) => {
  const userIP = req.headers['x-forwarded-for'] || 
                 req.connection.remoteAddress || 
                 req.socket.remoteAddress ||
                 (req.connection.socket ? req.connection.socket.remoteAddress : null) ||
                 '127.0.0.1';
  
  res.json({
    ip: userIP,
    timestamp: new Date().toISOString()
  });
});

// Rota para o chat principal
app.post("/api/chat", async (req, res) => {
  const { message, chatHistory = [] } = req.body;

  if (!message) {
    return res.status(400).json({ error: 'Mensagem não fornecida.' });
  }

  try {
    let weatherData = null;
    let timeData = null;
    
    // Detectar se é uma pergunta sobre clima ou horário
    const queryInfo = detectWeatherOrTimeQuery(message);
    
    if (queryInfo) {
      try {
        if (queryInfo.isWeatherQuery) {
          weatherData = await getWeatherInfo(queryInfo.city);
        }
        if (queryInfo.isTimeQuery) {
          timeData = await getTimezoneInfo(queryInfo.city);
          timeData.cidade = queryInfo.city; // Adiciona a cidade para o contexto do Gemini
        }
      } catch (apiError) {
        console.error("Erro ao obter dados das APIs externas:", apiError);
        // Continuar sem os dados das APIs se houver erro
      }
    }
    
    const aiResponse = await generateContent(message, chatHistory, weatherData, timeData);
    
    // Atualizar histórico
    const updatedHistory = [
      ...chatHistory,
      { role: 'user', parts: [{ text: message }] },
      { role: 'model', parts: [{ text: aiResponse }] }
    ];
    
    res.json({ 
      response: aiResponse,
      historico: updatedHistory
    });
  } catch (error) {
    console.error('Erro ao gerar conteúdo com a API Gemini:', error);
    res.status(500).json({ error: 'Erro ao se comunicar com a API Gemini.' });
  }
});

// Rota para log de conexão
app.post("/api/log-connection", async (req, res) => {
  if (!dbLogs) {
    return res.status(500).json({ error: "Servidor não conectado ao banco de dados de logs." });
  }

  try {
    const { ip, acao } = req.body;

    if (!ip || !acao) {
      return res.status(400).json({ error: "Dados de log incompletos (IP e ação são obrigatórios)." });
    }

    const agora = new Date();
    const dataFormatada = agora.toISOString().split('T')[0]; // YYYY-MM-DD
    const horaFormatada = agora.toTimeString().split(' ')[0]; // HH:MM:SS

    const logEntry = {
      col_data: dataFormatada,
      col_hora: horaFormatada,
      col_IP: ip,
      col_acao: acao
    };

    const collection = dbLogs.collection("tb_cl_user_log_acess");
    const result = await collection.insertOne(logEntry);

    console.log('[Servidor] Log de conexão salvo:', result.insertedId);
    res.status(201).json({ message: "Log de conexão registrado com sucesso!" });

  } catch (error) {
    console.error("[Servidor] Erro em /api/log-connection:", error.message);
    res.status(500).json({ error: "Erro interno ao registrar log de conexão." });
  }
});

// Rota para registrar acesso ao bot para ranking
app.post("/api/ranking/registrar-acesso-bot", (req, res) => {
  const { botId, nomeBot, timestampAcesso, usuarioId } = req.body;

  if (!botId || !nomeBot) {
    return res.status(400).json({ error: "ID e Nome do Bot são obrigatórios para o ranking." });
  }

  const acesso = {
    botId,
    nomeBot,
    usuarioId: usuarioId || 'anonimo',
    acessoEm: timestampAcesso ? new Date(timestampAcesso) : new Date(),
    contagem: 1
  };

  // Lógica simples para o ranking
  const botExistente = dadosRankingVitrine.find(b => b.botId === botId);
  if (botExistente) {
    botExistente.contagem += 1;
    botExistente.ultimoAcesso = acesso.acessoEm;
  } else {
    dadosRankingVitrine.push({
      botId: botId,
      nomeBot: nomeBot,
      contagem: 1,
      ultimoAcesso: acesso.acessoEm
    });
  }
  
  console.log('[Servidor] Dados de ranking atualizados:', dadosRankingVitrine);
  res.status(201).json({ message: `Acesso ao bot ${nomeBot} registrado para ranking.` });
});

// Rota para visualizar ranking
app.get("/api/ranking/visualizar", (req, res) => {
  const rankingOrdenado = [...dadosRankingVitrine].sort((a, b) => b.contagem - a.contagem);
  res.json(rankingOrdenado);
});

// Rota para salvar histórico de chat
app.post("/api/chat/salvar-historico", async (req, res) => {
  if (!dbHistoria) {
    return res.status(500).json({ error: "Servidor não conectado ao banco de dados de histórico." });
  }

  try {
    const { sessionId, userId, botId, startTime, endTime, messages } = req.body;

    if (!sessionId || !botId || !messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: "Dados incompletos para salvar histórico (sessionId, botId, messages são obrigatórios)." });
    }

    const novaSessao = {
      sessionId,
      userId: userId || 'anonimo',
      botId,
      startTime: startTime ? new Date(startTime) : new Date(),
      endTime: endTime ? new Date(endTime) : new Date(),
      messages,
      loggedAt: new Date()
    };

    const collection = dbHistoria.collection("sessoesChat");
    const result = await collection.insertOne(novaSessao);

    console.log('[Servidor] Histórico de sessão salvo:', result.insertedId);
    res.status(201).json({ message: "Histórico de chat salvo com sucesso!", sessionId: novaSessao.sessionId });

  } catch (error) {
    console.error("[Servidor] Erro em /api/chat/salvar-historico:", error.message);
    res.status(500).json({ error: "Erro interno ao salvar histórico de chat." });
  }
});

// Rota de teste
app.get("/api/test", (req, res) => {
  res.json({ 
    message: "MUDA MUDA MUDA! O servidor do Dio-sama está funcionando perfeitamente!",
    timestamp: new Date().toISOString(),
    databases: {
      logs: dbLogs ? "Conectado" : "Desconectado",
      historia: dbHistoria ? "Conectado" : "Desconectado"
    }
  });
});

// Inicia o servidor
app.listen(port, '0.0.0.0', () => {
  console.log(`🧛‍♂️ Servidor do Dio-sama rodando em http://0.0.0.0:${port}`);
  console.log("WRYYY! O poder do vampiro imortal está ativo!");
});


