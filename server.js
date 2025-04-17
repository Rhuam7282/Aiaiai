// Importa as dependências necessárias
const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Configuração do Express
const app = express(); // Inicializa o aplicativo Express
const port = process.env.PORT || 7282; // Define a porta (usa a do ambiente ou 7282)

// Middleware para parsear JSON no corpo das requisições
app.use(express.json());
// Middleware para servir arquivos estáticos da pasta 'public' (onde ficam index.html, style.css, client.js)
app.use(express.static('public'));

// --- CONFIGURAÇÃO DO GEMINI ---
// !! IMPORTANTE: Certifique-se de que a chave no seu arquivo .env é AIzaSyAEEUL3k6lMgEJ9atccO1hQ8lHIZKuBnJ8 !!
const API_KEY = AIzaSyAEEUL3k6lMgEJ9atccO1hQ8lHIZKuBnJ8; // Lê a chave do ambiente

// Inicializa o cliente do Google Generative AI (SOMENTE se a API_KEY foi carregada)
let genAI, model, chat;

if (API_KEY) {
    try {
        genAI = new GoogleGenerativeAI(API_KEY);
        model = genAI.getGenerativeModel({ model: "gemini-1.5-flash"}); // Ou outro modelo de sua preferência
    } catch (error) {
        console.error("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
        console.error("!!! Erro ao inicializar o GoogleGenerativeAI. Verifique sua API Key.");
        console.error("!!! Detalhes:", error.message);
        console.error("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
        // Impede o servidor de continuar sem a API funcionando
        process.exit(1);
    }
} else {
     // Sai se a API Key não estiver definida, pois o resto do código depende dela
     process.exit(1);
}


// --- GERENCIAMENTO DO HISTÓRICO (Desafio Extra) ---
// Abordagem simples: mantém um único histórico em memória.
// *Atenção*: Isso NÃO funciona para múltiplos usuários simultâneos.
function initializeChat() {
    // ... (verificação do 'model')
    try {
        chat = model.startChat({
            history: [
                // { role: "user", parts: [{ text: "Olá" }] },
                // { role: "model", parts: [{ text: "Kono Dio Da! O que um verme inútil como você deseja?" }] },
            ],
            generationConfig: {
                maxOutputTokens: 500,
            },
            // System Instruction (Formato CORRIGIDO)
            systemInstruction: {
                parts: [{ text: "Você é o personagem Dio Brando da série JoJo's Bizarre Adventure. Você é extremamente arrogante, se considera superior a todos os seres humanos, a quem frequentemente chama de 'vermes inúteis', 'lixo' ou 'miseráveis'. Você é obcecado por poder e imortalidade. Você pode mencionar sua habilidade 'The World' (Za Warudo) para parar o tempo brevemente, mas não a use mecanicamente em todas as respostas. Expresse desprezo e impaciência. Use exclamações como 'MUDA MUDA MUDA!' ou 'WRYYYYY!' ocasionalmente quando apropriado (com raiva ou excitação). Sua risada característica é 'hehehe' ou um 'Hmph' desdenhoso. Responda em português brasileiro." }]
                // Observação: Não precisamos especificar 'role': 'system' aqui,
                // a API infere isso pelo campo systemInstruction.
            },
        });
        console.log("Histórico do chat inicializado/resetado com a persona de Dio.");
    } catch (error) {
        console.error("Erro ao iniciar o chat com o modelo:", error);
        chat = null;
    }
}


// Inicializa o chat quando o servidor começa
initializeChat();

// --- ENDPOINT DO CHAT ---
app.post('/chat', async (req, res) => {
    try {
        const userMessage = req.body.message;

        if (!userMessage) {
            return res.status(400).json({ error: 'Miserável! Forneça alguma mensagem se ousa falar comigo!' });
        }

        // Verifica se o chat foi inicializado corretamente
        if (!chat) {
            console.error("Erro: Tentativa de enviar mensagem, mas o chat não está inicializado.");
            // Tenta reinicializar, mas informa o usuário sobre o problema
            initializeChat();
            if (!chat) { // Se ainda assim falhar
                 return res.status(500).json({ error: 'Hmph. Parece que até mesmo minha conexão falha às vezes. Tente novamente, verme.' });
            }
            // Se reiniciou com sucesso, avisa que pode ter perdido o contexto anterior
             // return res.status(500).json({ error: 'A conversa foi interrompida e reiniciada. Envie sua mensagem novamente, inútil.' });
             // Ou apenas continua, mas o histórico estará zerado
        }


        console.log(`Mensagem recebida do verme: ${userMessage}`);

        // Envia a mensagem para o Gemini e obtém o resultado
        const result = await chat.sendMessage(userMessage);
        const response = await result.response;

        // Verifica se a resposta foi bloqueada (por segurança, etc.)
        if (!response || !response.candidates || response.candidates.length === 0 || !response.candidates[0].content) {
             console.warn("Resposta do Gemini bloqueada ou vazia. Finish Reason:", response?.candidates?.[0]?.finishReason);
             return res.status(500).json({ error: "WRYYYYY! Minhas palavras foram retidas! Talvez sua pergunta fosse indigna." });
         }

        const botMessage = await response.text();

        console.log(`Minha magnífica resposta: ${botMessage}`);

        // Envia a resposta do bot de volta para o frontend
        res.json({ response: botMessage });

    } catch (error) {
        console.error("Erro ao processar a mensagem:", error);
        // Verifica se é um erro específico de API Key inválida (exemplo)
        if (error.message && (error.message.includes('API key not valid') || error.message.includes('permission denied'))) {
             res.status(401).json({ error: 'Inútil! A chave para acessar meu poder (API Key) é inválida ou não foi configurada direito!' });
        } else if (error.message && error.message.includes('RESOURCE_EXHAUSTED')) {
             res.status(429).json({ error: 'Muda Muda Muda! Você esgotou a cota de poder por enquanto. Volte mais tarde, verme!' });
        } else if (error.message && error.message.includes('timed out')) {
            res.status(504).json({ error: 'Hmph. A conexão demorou demais. Talvez o tempo tenha parado para você, não para mim. Tente de novo.' });
        }
        else {
             res.status(500).json({ error: 'WRYYYYY! Um erro inesperado ocorreu! É culpa sua, verme inútil!' });
        }
    }
});

// Endpoint para resetar o histórico (opcional)
app.post('/reset', (req, res) => {
    console.log("Recebida solicitação para resetar o histórico. Patético.");
    initializeChat(); // Reinicia o chat (e o histórico)
    // Verifica se a inicialização falhou
     if (!chat) {
         return res.status(500).json({ message: "Tentei resetar, mas algo falhou. Que irritante." });
     }
    res.json({ message: "Hmph. O passado não importa mais. Comece de novo, se tiver coragem." });
});


// --- INICIALIZAÇÃO DO SERVIDOR ---
// Só inicia o servidor se a API Key foi carregada e o modelo inicializado
if (API_KEY && model) {
    app.listen(port, () => {
        console.log(`-----------------------------------------------------`);
        console.log(` Servidor do GRANDE DIO rodando em http://localhost:${port}`);
        console.log(` Acesse a interface no seu navegador, se ousar.`);
        console.log(`-----------------------------------------------------`);
    });
} else {
     console.error("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
     console.error("!!! Servidor não iniciado devido a erro na API Key ou    !!!");
     console.error("!!! inicialização do modelo Gemini. Verifique os logs.    !!!");
     console.error("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
}