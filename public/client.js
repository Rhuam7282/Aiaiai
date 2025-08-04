document.addEventListener("DOMContentLoaded", () => {
  const chatContainer = document.getElementById("chat-container");
  const messageInput = document.getElementById("message-input");
  const sendButton = document.getElementById("send-button");
  const resetButton = document.getElementById("reset-button");
  const statusArea = document.getElementById("status-area");

  // Configuração do backend
  const backendUrl = 'https://aiaiai-ibk2.onrender.com'; // URL do backend no Render

  // Variáveis para controle de sessão
  let currentSessionId = `sessao_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  let chatStartTime = new Date();
  let chatHistory = [];

  // --- Funções Auxiliares ---

  function addMessage(message, sender) {
    const messageDiv = document.createElement("div");
    messageDiv.classList.add("message", `${sender}-message`);

    // Sanitização básica
    const textNode = document.createTextNode(message);
    messageDiv.appendChild(textNode);

    chatContainer.appendChild(messageDiv);
    scrollToBottom();
  }

  function addErrorMessage(message) {
    const errorDiv = document.createElement("div");
    errorDiv.classList.add("message", "error-message");
    errorDiv.textContent = `Erro: ${message}`;
    chatContainer.appendChild(errorDiv);
    scrollToBottom();
  }

  function scrollToBottom() {
    chatContainer.scrollTop = chatContainer.scrollHeight;
  }

  function showTypingIndicator() {
    const typingDiv = document.createElement("div");
    typingDiv.classList.add("message", "bot-message", "typing-indicator");
    typingDiv.id = "typing-indicator";
    typingDiv.innerHTML = `
      <span></span>
      <span></span>
      <span></span>
      Dio-sama está pensando...
    `;
    chatContainer.appendChild(typingDiv);
    scrollToBottom();
  }

  function removeTypingIndicator() {
    const typingIndicator = document.getElementById("typing-indicator");
    if (typingIndicator) {
      typingIndicator.remove();
    }
  }

  // --- Funções de API ---

  async function getUserInfo() {
    try {
      const response = await fetch(`${backendUrl}/api/user-info`);
      if (!response.ok) {
        throw new Error("Falha ao obter informações do usuário");
      }
      return await response.json();
    } catch (error) {
      console.error("Erro ao obter informações do usuário:", error);
      return { ip: "127.0.0.1", timestamp: new Date().toISOString() };
    }
  }

  async function registrarConexaoUsuario() {
    try {
      const userInfo = await getUserInfo();
      const logData = {
        ip: userInfo.ip,
        acao: "acesso_inicial_chatbot"
      };

      const response = await fetch(`${backendUrl}/api/log-connection`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(logData)
      });

      if (!response.ok) {
        console.error("Falha ao registrar conexão:", await response.text());
      } else {
        const result = await response.json();
        console.log("Conexão registrada:", result.message);
      }
    } catch (error) {
      console.error("Erro ao registrar conexão:", error);
    }
  }

  async function registrarAcessoBotParaRanking(botId, nomeBot) {
    try {
      const dataRanking = {
        botId: botId,
        nomeBot: nomeBot,
        timestampAcesso: new Date().toISOString()
      };

      const response = await fetch(`${backendUrl}/api/ranking/registrar-acesso-bot`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dataRanking)
      });

      if (!response.ok) {
        console.error("Falha ao registrar acesso para ranking:", await response.text());
      } else {
        const result = await response.json();
        console.log("Registro de ranking:", result.message);
      }
    } catch (error) {
      console.error("Erro ao registrar acesso para ranking:", error);
    }
  }

  async function salvarHistoricoSessao(sessionId, botId, startTime, endTime, messages) {
    try {
      const payload = {
        sessionId,
        botId,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        messages
      };

      const response = await fetch(`${backendUrl}/api/chat/salvar-historico`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("Falha ao salvar histórico:", errorData.error || response.statusText);
      } else {
        const result = await response.json();
        console.log("Histórico de sessão enviado:", result.message);
      }
    } catch (error) {
      console.error("Erro ao enviar histórico de sessão:", error);
    }
  }

  // --- Lógica do Chat ---

  async function sendMessage() {
    const message = messageInput.value.trim();
    if (!message) return;

    addMessage(message, "user");
    messageInput.value = "";
    showTypingIndicator();
    statusArea.textContent = "Dio-sama está formulando sua resposta...";

    try {
      const response = await fetch(`${backendUrl}/api/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          message,
          chatHistory 
        }),
      });

      removeTypingIndicator();

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erro desconhecido da API");
      }

      const data = await response.json();
      addMessage(data.response, "bot");
      
      // Atualizar histórico
      chatHistory = data.historico || chatHistory;
      
      // Salvar histórico da sessão
      await salvarHistoricoSessao(
        currentSessionId, 
        "chatbotDioSama", 
        chatStartTime, 
        new Date(), 
        chatHistory
      );

    } catch (error) {
      removeTypingIndicator();
      console.error("Erro ao enviar mensagem:", error);
      addErrorMessage(error.message);
    } finally {
      statusArea.textContent = "";
    }
  }

  function resetChat() {
    chatContainer.innerHTML = "";
    chatHistory = [];
    currentSessionId = `sessao_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    chatStartTime = new Date();
    addMessage("MUDA MUDA MUDA! Você ousa falar com o grande Dio-sama! Faça sua pergunta, mortal insignificante! Posso até mesmo revelar informações sobre o clima e horário de qualquer lugar do mundo, se for digno da minha atenção!", "bot");
  }

  // --- Event Listeners ---

  sendButton.addEventListener("click", sendMessage);

  messageInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      sendMessage();
    }
  });

  resetButton.addEventListener("click", resetChat);

  // --- Inicialização ---

  window.addEventListener("load", async () => {
    // Registrar conexão do usuário
    await registrarConexaoUsuario();
    
    // Registrar acesso ao bot para ranking
    await registrarAcessoBotParaRanking("chatbotDioSama", "Dio-Sama Chatbot");
    
    // Mensagem de boas-vindas inicial
    addMessage("WRYYY! Você ousa se aproximar de mim, Dio-sama? Muito bem, mortal... Faça sua pergunta e talvez eu conceda minha sabedoria suprema! Posso até mesmo revelar os segredos do clima e do tempo de qualquer lugar do mundo!", "bot");
  });

  // Salvar histórico quando a página for fechada
  window.addEventListener("beforeunload", () => {
    if (chatHistory.length > 0) {
      // Usar sendBeacon para envio assíncrono
      const payload = {
        sessionId: currentSessionId,
        botId: "chatbotDioSama",
        startTime: chatStartTime.toISOString(),
        endTime: new Date().toISOString(),
        messages: chatHistory
      };
      
      navigator.sendBeacon(
        `${backendUrl}/api/chat/salvar-historico`,
        JSON.stringify(payload)
      );
    }
  });
});

