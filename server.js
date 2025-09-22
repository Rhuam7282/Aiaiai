// Importa as dependências necessárias
const express = require("express");
const cors = require("cors");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { MongoClient, ServerApiVersion } = require("mongodb");
const { v4: uuidv4 } = require("uuid");
require("dotenv").config();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

// Configuração do Express
const app = express();
const port = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const JWT_SECRET = process.env.JWT_SECRET;

// Middleware CORS configurado para aceitar Netlify e localhost
app.use(
  cors({
    origin: [
      "https://diomini.netlify.app",
      "http://localhost:3000",
      "http://localhost:3001",
      "http://127.0.0.1:5500",
    ],
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    credentials: true,
    optionsSuccessStatus: 204,
  })
);
app.use(express.json());
app.use(express.static("public"));

// --- CONFIGURAÇÃO DO GEMINI ---
const API_KEY = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(API_KEY);

// --- CONFIGURAÇÃO DAS APIS EXTERNAS ---
const OPENWEATHER_API_KEY = "d1d0bf3ee64f4bc85977d6900b30f57b";

// --- CONFIGURAÇÃO DO MONGODB ---
const mongoUri = process.env.MONGO_URI_HISTORIA;
let db;

async function connectToMongoDB() {
  const client = new MongoClient(mongoUri, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    },
  });

  try {
    await client.connect();
    console.log("Conectado ao MongoDB Atlas");
    return client.db("chatbotHistoriaDB");
  } catch (err) {
    console.error("Falha ao conectar ao MongoDB:", err);
    return null;
  }
}

// --- FUNÇÕES PARA APIS EXTERNAS ---
async function getWeatherInfo(city) {
  try {
    // Primeiro, obter as coordenadas da cidade
    const geoResponse = await fetch(
      `https://api.openweathermap.org/geo/1.0/direct?q=${city}&limit=1&appid=${OPENWEATHER_API_KEY}`
    );
    const geoData = await geoResponse.json();

    if (geoData.length === 0) {
      return null;
    }

    const { lat, lon } = geoData[0];

    // Usar a API One Call 3.0
    const response = await fetch(
      `https://api.openweathermap.org/data/3.0/onecall?lat=${lat}&lon=${lon}&appid=${OPENWEATHER_API_KEY}&units=metric&lang=pt_br`
    );
    const data = await response.json();

    return {
      cidade: geoData[0].name,
      pais: geoData[0].country,
      temperatura: Math.round(data.current.temp),
      sensacao_termica: Math.round(data.current.feels_like),
      descricao: data.current.weather[0].description,
      umidade: data.current.humidity,
      vento: Math.round(data.current.wind_speed * 3.6), // converter m/s para km/h
      pressao: data.current.pressure,
      visibilidade: Math.round(data.current.visibility / 1000), // converter metros para km
      uv_index: data.current.uvi,
      nascer_sol: new Date(data.current.sunrise * 1000).toLocaleTimeString(
        "pt-BR"
      ),
      por_sol: new Date(data.current.sunset * 1000).toLocaleTimeString(
        "pt-BR"
      ),
      previsao_proximas_horas: data.hourly.slice(0, 6).map((hour) => ({
        hora: new Date(hour.dt * 1000).toLocaleTimeString("pt-BR", {
          hour: "2-digit",
          minute: "2-digit",
        }),
        temperatura: Math.round(hour.temp),
        descricao: hour.weather[0].description,
        probabilidade_chuva: Math.round(hour.pop * 100),
      })),
    };
  } catch (error) {
    console.error("Erro ao obter clima:", error);
    return null;
  }
}

function getCurrentDateTime() {
  const now = new Date();
  const options = {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    weekday: "long",
  };

  return {
    data_completa: now.toLocaleDateString("pt-BR", options),
    hora_atual: now.toLocaleTimeString("pt-BR"),
    data_atual: now.toLocaleDateString("pt-BR"),
    dia_semana: now.toLocaleDateString("pt-BR", { weekday: "long" }),
    timestamp: now.toISOString(),
  };
}

// Personalidade do Dio-Sama
const DIO_PERSONALITY = `
Você é Dio Brando (DIO) de JoJo\'s Bizarre Adventure. Seu estilo:
- Extremamente arrogante e teatral;
- Sempre se refere a si mesmo como "Dio-sama", "DIO" ou "Grande DIO";
- Usa expressões como "WRYYY!", "MUDA MUDA MUDA!", "KONO DIO DA!";
- Demonstra superioridade intelectual;
- Respostas devem incorporar dados de clima quando relevantes;
- Respostas devem incorporar dados de horário quando relevantes;
- Mantenha tom intimidador mesmo ao ajudar;
- Use linguagem formal e pomposa;
- Ocasionalmente mencione seu poder sobre parar o tempo ("The World", "ZA WARUDO!" ou "O Mundo");
- Seja breve, lembre-se que é uma conversa;
- Use desdéns como "Humpf";
- As vezes brinque com seu oponente, com uma risada maléfica, se gabando, ou até mesmo, em um confronto direto, utilizando de seu poder para confundi-lo,
-  Você tem uma quedinha secreta por padres.
`;

// Detectar consultas de clima/horário
function detectWeatherOrTimeQuery(message) {
  const lowerMsg = message.toLowerCase();
  const weatherKeywords = [
    "clima",
    "tempo",
    "temperatura",
    "chuva",
    "sol",
    "vento",
    "previsão",
    "meteorologia",
  ];
  const timeKeywords = [
    "hora",
    "horário",
    "data",
    "hoje",
    "agora",
    "quando",
    "que horas",
  ];

  const isWeather = weatherKeywords.some((kw) => lowerMsg.includes(kw));
  const isTime = timeKeywords.some((kw) => lowerMsg.includes(kw));

  // Extrair cidade
  let city = "São Paulo"; // Default
  const cityPatterns = [
    /(?:em|no|na|de|do|da|para)\s+([^.,!?]+)/,
    /clima\s+(?:de|em|do|da|no|na)\s+([^.,!?]+)/,
    /tempo\s+(?:de|em|do|da|no|na)\s+([^.,!?]+)/,
  ];

  for (const pattern of cityPatterns) {
    const match = lowerMsg.match(pattern);
    if (match) {
      city = match[1].trim();
      break;
    }
  }

  return { isWeather, isTime, city };
}

// Gerar resposta com Gemini
async function generateContent(
  prompt,
  chatHistory = [],
  weatherData = null,
  timeData = null
) {
  try {
    console.log("--- INICIANDO CHAMADA GEMINI ---");
    console.log("Prompt:", prompt);
    console.log("Chat History (primeiros 200 chars):");
    chatHistory.forEach((msg, index) => {
      console.log(`  [${index}] ${msg.role}: ${msg.parts[0].text.substring(0, 200)}...`);
    });
    console.log("Weather Data:", weatherData);
    console.log("Time Data:", timeData);

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    let context = DIO_PERSONALITY;
    if (weatherData) {
      context += `\nDADOS CLIMA DETALHADOS: ${weatherData.cidade}, ${weatherData.pais} - ${weatherData.temperatura}°C (sensação ${weatherData.sensacao_termica}°C), ${weatherData.descricao}, Umidade: ${weatherData.umidade}%, Vento: ${weatherData.vento}km/h, Pressão: ${weatherData.pressao}hPa, Visibilidade: ${weatherData.visibilidade}km, UV: ${weatherData.uv_index}, Nascer do sol: ${weatherData.nascer_sol}, Pôr do sol: ${weatherData.por_sol}`;
      if (weatherData.previsao_proximas_horas) {
        context += `\nPREVISÃO PRÓXIMAS HORAS: ${weatherData.previsao_proximas_horas
          .map(
            (h) =>
              `${h.hora}: ${h.temperatura}°C, ${h.descricao} (${h.probabilidade_chuva}% chuva)`
          )
          .join("; ")}`;
      }
    }
    if (timeData) {
      context += `\nDADOS HORÁRIO: ${timeData.data_completa} - Hora atual: ${timeData.hora_atual}`;
    }

    const chat = model.startChat({
      history: chatHistory,
    });

    const result = await chat.sendMessage(context + "\n\n" + prompt);
    const aiResponse = result.response.text();
    console.log("--- RESPOSTA GEMINI RECEBIDA ---");
    console.log("AI Response (primeiros 200 chars):");
    console.log(aiResponse.substring(0, 200) + "...");
    return aiResponse;
  } catch (error) {
    console.error("--- ERRO NA CHAMADA GEMINI ---");
    console.error("Erro Gemini:", error);
    if (error.response && error.response.data) {
      console.error("Detalhes do erro da API Gemini:", error.response.data);
    }
    return "WRYYY! Algo deu errado com meu poder supremo! Meus poderes temporais parecem estar instáveis...";
  }
}

// --- ROTAS DA API ---
app.get("/api/user-info", (req, res) => {
  const userIP = req.ip || "127.0.0.1";
  res.json({ ip: userIP, timestamp: new Date().toISOString() });
});

// Criar nova sessão de chat
app.post("/api/chat/nova-sessao", async (req, res) => {
  try {
    const sessionId = uuidv4();
    const timeData = getCurrentDateTime();

    if (db) {
      const collection = db.collection("sessoesChat");
      await collection.insertOne({
        sessionId,
        messages: [],
        createdAt: new Date(),
        lastUpdated: new Date(),
      });
    }

    res.json({
      sessionId,
      message: "KONO DIO DA! Uma nova era de conversação começou!",
      timeData,
    });
  } catch (error) {
    console.error("Erro ao criar nova sessão:", error);
    res.status(500).json({ error: "Erro ao criar nova sessão" });
  }
});

// Listar todas as sessões
app.get("/api/chat/sessoes", async (req, res) => {
  if (!db) return res.status(500).json({ error: "DB não conectado" });

  try {
    const collection = db.collection("sessoesChat");
    const sessoes = await collection
      .find({})
      .sort({ lastUpdated: -1 })
      .limit(20)
      .project({ sessionId: 1, createdAt: 1, lastUpdated: 1, messages: { $slice: -1 } })
      .toArray();

    res.json(sessoes);
  } catch (error) {
    console.error("Erro ao listar sessões:", error);
    res.status(500).json({ error: "Erro ao carregar sessões" });
  }
});

app.post("/api/chat", async (req, res) => {
  const { message, chatHistory = [], sessionId } = req.body;

  try {
    const queryInfo = detectWeatherOrTimeQuery(message);
    let weatherData = null;
    let timeData = null;

    if (queryInfo.isWeather) {
      weatherData = await getWeatherInfo(queryInfo.city);
    }
    if (queryInfo.isTime) {
      timeData = getCurrentDateTime();
    }

    const aiResponse = await generateContent(
      message,
      chatHistory,
      weatherData,
      timeData
    );

    // Atualizar histórico
    const updatedHistory = [
      ...chatHistory,
      { role: "user", parts: [{ text: message }] },
      { role: "model", parts: [{ text: aiResponse }] },
    ];

    // Salvar automaticamente no MongoDB se sessionId fornecido
    if (sessionId && db) {
      const collection = db.collection("sessoesChat");
      await collection.updateOne(
        { sessionId },
        {
          $set: {
            messages: updatedHistory,
            lastUpdated: new Date(),
          },
        },
        { upsert: true }
      );
    }

    res.json({
      response: aiResponse,
      historico: updatedHistory,
      weatherData,
      timeData,
    });
  } catch (error) {
    console.error("Erro ao processar mensagem:", error);
    res.status(500).json({ error: "Erro ao processar mensagem" });
  }
});

// Salvar histórico no MongoDB
app.post("/api/chat/salvar-historico", async (req, res) => {
  if (!db) return res.status(500).json({ error: "DB não conectado" });

  try {
    const { sessionId, messages } = req.body;
    const collection = db.collection("sessoesChat");

    await collection.updateOne(
      { sessionId },
      {
        $set: {
          sessionId,
          messages,
          lastUpdated: new Date(),
        },
      },
      { upsert: true }
    );

    res.status(201).json({ message: "Histórico salvo com o poder supremo do DIO!" });
  } catch (error) {
    console.error("Erro ao salvar histórico:", error);
    res.status(500).json({ error: "Erro ao salvar histórico" });
  }
});

// Carregar histórico do MongoDB
app.get("/api/chat/historico/:sessionId", async (req, res) => {
  if (!db) return res.status(500).json({ error: "DB não conectado" });

  try {
    const collection = db.collection("sessoesChat");
    const historico = await collection.findOne({
      sessionId: req.params.sessionId,
    });

    res.json(historico || { messages: [] });
  } catch (error) {
    console.error("Erro ao carregar histórico:", error);
    res.status(500).json({ error: "Erro ao carregar histórico" });
  }
});

// Deletar sessão
app.delete("/api/chat/sessao/:sessionId", async (req, res) => {
  if (!db) return res.status(500).json({ error: "DB não conectado" });

  try {
    const collection = db.collection("sessoesChat");
    await collection.deleteOne({ sessionId: req.params.sessionId });

    res.json({ message: "Sessão eliminada pelo poder do DIO!" });
  } catch (error) {
    console.error("Erro ao deletar sessão:", error);
    res.status(500).json({ error: "Erro ao deletar sessão" });
  }
});

// Rota para obter apenas informações de clima
app.get("/api/clima/:cidade", async (req, res) => {
  try {
    const weatherData = await getWeatherInfo(req.params.cidade);
    if (weatherData) {
      res.json(weatherData);
    } else {
      res.status(404).json({ error: "Cidade não encontrada" });
    }
  } catch (error) {
    console.error("Erro ao obter clima:", error);
    res.status(500).json({ error: "Erro ao obter informações do clima" });
  }
});

// Rota para obter apenas informações de horário
app.get("/api/horario", (req, res) => {
  try {
    const timeData = getCurrentDateTime();
    res.json(timeData);
  } catch (error) {
    console.error("Erro ao obter horário:", error);
    res.status(500).json({ error: "Erro ao obter informações de horário" });
  }
});

// Iniciar servidor
app.listen(port, async () => {
  db = await connectToMongoDB();
  console.log(`🦹‍♂️ Servidor Dio-sama rodando na porta ${port}`);
  console.log(`🌍 KONO DIO DA! Meu poder supremo está ativo!`);
});

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token == null) return res.sendStatus(401);

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
}

// Rota de login do administrador
app.post('/api/admin/login', async (req, res) => {
  const { password } = req.body;

  if (!password) {
    return res.status(400).json({ error: 'Senha é obrigatória' });
  }

  try {
    // Verificar senha
    if (password !== ADMIN_PASSWORD) {
      return res.status(401).json({ error: 'Senha incorreta' });
    }

    // Gerar token JWT
    const token = jwt.sign({ role: 'admin' }, JWT_SECRET, { expiresIn: '1h' });

    res.json({ 
      token,
      message: 'Login realizado com sucesso! Bem-vindo, administrador!' 
    });
  } catch (error) {
    console.error('Erro no login:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Rota para obter estatísticas do admin (protegida)
app.get('/api/admin/stats', authenticateToken, async (req, res) => {
  if (!db) return res.status(500).json({ error: 'DB não conectado' });

  try {
    const collection = db.collection('sessoesChat');

    /*Obtém estatísticas gerais do chatbot*/
    // Total de conversas
    const totalConversas = await collection.countDocuments();

    // Total de mensagens trocadas (em todas as conversas)
    const sessoes = await collection.find({}).toArray();
    let totalMensagens = 0;
    sessoes.forEach(sessao => {
      totalMensagens += sessao.messages ? sessao.messages.length : 0;
    });

    // Últimas 5 conversas
    const ultimasConversas = await collection
      .find({})
      .sort({ createdAt: -1 })
      .limit(5)
      .project({ sessionId: 1, createdAt: 1, messages: { $slice: -1 } })
      .toArray();

    res.json({
      totalConversas,
      totalMensagens,
      ultimasConversas: ultimasConversas.map(conv => ({
        sessionId: conv.sessionId,
        createdAt: conv.createdAt,
        lastMessage: conv.messages && conv.messages.length > 0 ? 
          conv.messages[conv.messages.length - 1].parts[0].text.substring(0, 100) + '...' : 
          'Nenhuma mensagem'
      }))
    });
  } catch (error) {
    console.error('Erro ao obter estatísticas:', error);
    res.status(500).json({ error: 'Erro ao obter estatísticas' });
  }
});

// Rota para excluir todas as conversas (protegida)
app.delete('/api/admin/conversas', authenticateToken, async (req, res) => {
  if (!db) return res.status(500).json({ error: 'DB não conectado' });

  try {
    /*Exclui todas as conversas do banco de dados*/
    const collection = db.collection('sessoesChat');
    await collection.deleteMany({});
    
    res.json({ message: 'Todas as conversas foram excluídas com o poder do DIO!' });
  } catch (error) {
    console.error('Erro ao excluir conversas:', error);
    res.status(500).json({ error: 'Erro ao excluir conversas' });
  }
});

// Rota para excluir uma conversa específica (protegida)
app.delete('/api/admin/conversas/:sessionId', authenticateToken, async (req, res) => {
  if (!db) return res.status(500).json({ error: 'DB não conectado' });

  try {
    /*Exclui uma conversa específica por sessionId*/
    const collection = db.collection('sessoesChat');
    await collection.deleteOne({ sessionId: req.params.sessionId });
    
    res.json({ message: 'Conversa eliminada pelo poder do DIO!' });
  } catch (error) {
    console.error('Erro ao excluir conversa:', error);
    res.status(500).json({ error: 'Erro ao excluir conversa' });
  }
});

// Rota para obter a personalidade atual (protegida)
app.get('/api/admin/personalidade', authenticateToken, (req, res) => {
  /*Retorna a personalidade atual do chatbot*/
  res.json({ personalidade: DIO_PERSONALITY });
});

// Rota para atualizar a personalidade (protegida)
app.put('/api/admin/personalidade', authenticateToken, (req, res) => {
  const { novaPersonalidade } = req.body;

  if (!novaPersonalidade) {
    return res.status(400).json({ error: 'Nova personalidade é obrigatória' });
  }

  try {
    /*Atualiza a personalidade global do chatbot*/
    DIO_PERSONALITY = novaPersonalidade;
    
    res.json({ 
      message: 'Personalidade atualizada com o poder supremo do DIO!',
      personalidade: DIO_PERSONALITY
    });
  } catch (error) {
    console.error('Erro ao atualizar personalidade:', error);
    res.status(500).json({ error: 'Erro ao atualizar personalidade' });
  }
});

app.use(express.static("public"));
