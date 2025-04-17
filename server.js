// Importa as dependências necessárias
const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
// dotenv é ótimo para desenvolvimento local, mas na nuvem usaremos as variáveis da plataforma
// A linha abaixo não causará erro se o .env não existir (como na nuvem),
// mas também não é estritamente necessária se você configurar as variáveis na plataforma.
require('dotenv').config();

// Configuração do Express
const app = express();
// ESSENCIAL PARA NUVEM: Usa a porta fornecida pelo ambiente ou um padrão (ex: 8080 ou 3000)
const port = process.env.PORT || 8080; // 8080 é um padrão comum em alguns ambientes de nuvem

app.use(express.json());
app.use(express.static('public'));

// --- CONFIGURAÇÃO DO GEMINI ---
// ESSENCIAL PARA NUVEM: Lê a chave da API da variável de ambiente configurada na plataforma
const API_KEY = process.env.GEMINI_API_KEY;

if (!API_KEY) {
    console.error("!!! Atenção: GEMINI_API_KEY não definida nas variáveis de ambiente da plataforma !!!");
    process.exit(1); // Importante sair se a chave não estiver configurada
} else {
    // Em produção/nuvem, talvez não seja ideal logar a confirmação, mas ok por agora.
    console.log("Chave da API do Gemini carregada via variável de ambiente.");
}

// Inicializa o cliente do Google Generative AI
let genAI, model, chat;
try {
    genAI = new GoogleGenerativeAI(API_KEY);
    model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
} catch (error) {
    console.error("!!! Erro ao inicializar o GoogleGenerativeAI. Verifique a API Key fornecida pela plataforma.", error.message);
    process.exit(1);
}

// --- GERENCIAMENTO DO HISTÓRICO ---
// !!! IMPORTANTE LIMITAÇÃO PARA NUVEM !!!
// A variável 'chat' com o histórico está na memória do servidor.
// - Se a plataforma reiniciar sua instância, o histórico será perdido.
// - Se a plataforma escalar sua aplicação para múltiplas instâncias, cada uma terá um histórico diferente.
// Para um histórico persistente e consistente na nuvem, você precisaria usar
// um banco de dados, Redis, ou outro serviço de armazenamento externo.
function initializeChat() {
    if (!model) {
        console.error("Erro crítico: Modelo Gemini não inicializado.");
        chat = null;
        return;
    }
    try {
        chat = model.startChat({
            // ... (histórico inicial, generationConfig, systemInstruction como antes) ...
            history: [],
             generationConfig: { maxOutputTokens: 500 },
             systemInstruction: {
                 parts: [{ text: "Você é o personagem Dio Brando..." }] // Mantenha sua instrução aqui
             },
        });
        console.log("Histórico do chat inicializado/resetado."); // Log pode ser útil na nuvem
    } catch (error) {
        console.error("Erro ao iniciar o chat com o modelo:", error);
        chat = null;
    }
}
initializeChat();


// --- ENDPOINTS (/chat, /reset) ---
// Nenhuma alteração necessária nos endpoints para a nuvem
app.post('/chat', async (req, res) => {
    // ... (código do endpoint /chat como antes) ...
    // A lógica interna permanece a mesma
    try {
        const userMessage = req.body.message;
        if (!userMessage) return res.status(400).json({ error: 'Mensagem vazia, verme!' });
        if (!chat) {
            console.error("Chat não inicializado ao receber /chat");
            initializeChat(); // Tenta recuperar
            if (!chat) return res.status(500).json({ error: 'Chat indisponível, tente novamente.' });
        }

        console.log(`Mensagem recebida (nuvem): ${userMessage}`); // Log útil
        const result = await chat.sendMessage(userMessage);
        // ... (resto do tratamento de resposta e erro)
        const response = await result.response;
        if (!response || !response.candidates || response.candidates.length === 0 || !response.candidates[0].content) {
             console.warn("Resposta do Gemini bloqueada ou vazia (nuvem). Finish Reason:", response?.candidates?.[0]?.finishReason);
             return res.status(500).json({ error: "WRYYYYY! Minhas palavras foram retidas!" });
         }
        const botMessage = await response.text();
        console.log(`Resposta enviada (nuvem): ${botMessage.substring(0, 50)}...`);
        res.json({ response: botMessage });

    } catch (error) {
        console.error("Erro no endpoint /chat (nuvem):", error);
         // ... (tratamento de erros específicos como antes) ...
         if (error.message && (error.message.includes('API key not valid') || error.message.includes('permission denied'))) {
             res.status(401).json({ error: 'Chave API inválida (configurada na plataforma)!' });
        } else if (error.message && error.message.includes('RESOURCE_EXHAUSTED')) {
             res.status(429).json({ error: 'Cota da API excedida!' });
        } else {
             res.status(500).json({ error: 'Erro interno do servidor.' });
        }
    }
});

app.post('/reset', (req, res) => {
    // ... (código do endpoint /reset como antes) ...
    console.log("Recebida solicitação /reset (nuvem)");
    initializeChat();
     if (!chat) {
         return res.status(500).json({ message: "Falha ao resetar o chat." });
     }
    res.json({ message: "Histórico resetado." });
});

// --- INICIALIZAÇÃO DO SERVIDOR ---
// Nenhuma alteração necessária aqui para a nuvem
if (API_KEY && model) {
    app.listen(port, () => {
        // É bom logar a porta em que está rodando, especialmente na nuvem
        console.log(`-----------------------------------------------------`);
        console.log(` Servidor rodando e ouvindo na porta ${port}`);
        console.log(`-----------------------------------------------------`);
    });
} else {
     console.error("!!! Servidor não iniciado - problema com API Key ou Modelo Gemini.");
     // A saída anterior com process.exit(1) já deve ter parado o processo.
}