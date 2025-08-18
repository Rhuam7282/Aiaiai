// Importa as dependências necessárias
const express = require("express");
const cors = require("cors");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { MongoClient, ServerApiVersion } = require("mongodb");
require("dotenv").config();

// Configuração do Express
const app = express();
const port = process.env.PORT || 3000;

// Middleware CORS configurado para aceitar Netlify e localhost
app.use(cors({
  origin: ["https://diomini.netlify.app", "http://localhost:3000"],
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  credentials: true,
  optionsSuccessStatus: 204
}));
app.use(express.json());
app.use(express.static("public"));

// --- CONFIGURAÇÃO DO GEMINI ---
const API_KEY = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(API_KEY);

// --- CONFIGURAÇÃO DAS APIS EXTERNAS ---
const OPENWEATHER_API_KEY = "d1d0bf3ee64f4bc85977d6900b30f57b";
const API_NINJAS_KEY = "byoyzMQvCatHfNsY2vYkEw==kO8JT5LPyqoXj7fS";

// --- CONFIGURAÇÃO DO MONGODB ---
const mongoUri = process.env.MONGO_URI_HISTORIA;
let db;

async function connectToMongoDB() {
  const client = new MongoClient(mongoUri, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    }
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
    const response = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${OPENWEATHER_API_KEY}&units=metric&lang=pt_br`);
    const data = await response.json();
    return {
      cidade: data.name,
      temperatura: Math.round(data.main.temp),
      descricao: data.weather[0].description
    };
  } catch (error) {
    console.error("Erro ao obter clima:", error);
    return null;
  }
}

async function getTimezoneInfo(city) {
  try {
    const response = await fetch(`https://api.api-ninjas.com/v1/timezone?city=${city}`, {
      headers: { 'X-Api-Key': API_NINJAS_KEY }
    });
    const data = await response.json();
    return {
      hora_local: new Date().toLocaleTimeString('pt-BR'),
      data_local: new Date().toLocaleDateString('pt-BR')
    };
  } catch (error) {
    console.error("Erro ao obter horário:", error);
    return null;
  }
}

// Personalidade do Dio-Sama
const DIO_PERSONALITY = `
Você é Dio Brando (DIO) de JoJo's Bizarre Adventure. Seu estilo:
- Extremamente arrogante e teatral
- Sempre se refere a si mesmo como "Dio-sama"
- Usa expressões como "WRYYY!", "MUDA MUDA MUDA!"
- Demonstra superioridade intelectual
- Respostas devem incorporar dados de clima/horário quando relevantes
- Mantenha tom intimidador mesmo ao ajudar
`;

// Detectar consultas de clima/horário
function detectWeatherOrTimeQuery(message) {
  const lowerMsg = message.toLowerCase();
  const weatherKeywords = ['clima', 'tempo', 'temperatura'];
  const timeKeywords = ['hora', 'horário', 'fuso'];
  
  const isWeather = weatherKeywords.some(kw => lowerMsg.includes(kw));
  const isTime = timeKeywords.some(kw => lowerMsg.includes(kw));
  
  // Extrair cidade
  let city = "São Paulo"; // Default
  const cityMatch = lowerMsg.match(/(?:em|no|na|de|do|da|para)\s+([^.,!?]+)/);
  if (cityMatch) city = cityMatch[1].trim();
  
  return { isWeather, isTime, city };
}

// Gerar resposta com Gemini
async function generateContent(prompt, chatHistory = [], weatherData = null, timeData = null) {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
    
    let context = DIO_PERSONALITY;
    if (weatherData) context += `\nDADOS CLIMA: ${weatherData.cidade} - ${weatherData.temperatura}°C, ${weatherData.descricao}`;
    if (timeData) context += `\nDADOS HORÁRIO: ${timeData.data_local} ${timeData.hora_local}`;
    
    const chat = model.startChat({
      history: [
        ...chatHistory,
        { role: "user", parts: [{ text: context + "\n\n" + prompt }] }
      ],
    });

    const result = await chat.sendMessage(prompt);
    return result.response.text();
  } catch (error) {
    console.error('Erro Gemini:', error);
    return "WRYYY! Algo deu errado com meu poder supremo!";
  }
}

// --- ROTAS DA API ---
app.get("/api/user-info", (req, res) => {
  const userIP = req.ip || '127.0.0.1';
  res.json({ ip: userIP, timestamp: new Date().toISOString() });
});

app.post("/api/chat", async (req, res) => {
  const { message, chatHistory = [] } = req.body;
  
  try {
    const queryInfo = detectWeatherOrTimeQuery(message);
    let weatherData = null;
    let timeData = null;

    if (queryInfo.isWeather) {
      weatherData = await getWeatherInfo(queryInfo.city);
    }
    if (queryInfo.isTime) {
      timeData = await getTimezoneInfo(queryInfo.city);
    }

    const aiResponse = await generateContent(message, chatHistory, weatherData, timeData);
    
    // Atualizar histórico
    const updatedHistory = [
      ...chatHistory,
      { role: 'user', parts: [{ text: message }] },
      { role: 'model', parts: [{ text: aiResponse }] }
    ];
    
    res.json({ response: aiResponse, historico: updatedHistory });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao processar mensagem' });
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
      { $set: { 
          sessionId,
          messages,
          lastUpdated: new Date() 
        }},
      { upsert: true }
    );
    
    res.status(201).json({ message: "Histórico salvo!" });
  } catch (error) {
    res.status(500).json({ error: "Erro ao salvar histórico" });
  }
});

// Carregar histórico do MongoDB
app.get("/api/chat/historico/:sessionId", async (req, res) => {
  if (!db) return res.status(500).json({ error: "DB não conectado" });

  try {
    const collection = db.collection("sessoesChat");
    const historico = await collection.findOne({ 
      sessionId: req.params.sessionId 
    });
    
    res.json(historico || { messages: [] });
  } catch (error) {
    res.status(500).json({ error: "Erro ao carregar histórico" });
  }
});

// Iniciar servidor
app.listen(port, async () => {
  db = await connectToMongoDB();
  console.log(`Servidor Dio-sama rodando na porta ${port}`);
});