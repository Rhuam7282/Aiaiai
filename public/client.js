document.addEventListener('DOMContentLoaded', () => {
    const chatContainer = document.getElementById('chat-container');
    const messageInput = document.getElementById('message-input');
    const sendButton = document.getElementById('send-button');
    const resetButton = document.getElementById('reset-button');
    const statusArea = document.getElementById('status-area');

    // --- Funções Auxiliares ---

    function addMessage(message, sender) {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', `${sender}-message`);

        // Simples sanitização para evitar injeção básica de HTML
        // Para segurança robusta, bibliotecas como DOMPurify seriam recomendadas
        const textNode = document.createTextNode(message);
        messageDiv.appendChild(textNode);

        chatContainer.appendChild(messageDiv);
        // Rola para a mensagem mais recente
        scrollToBottom();
    }

    function addErrorMessage(message) {
        const errorDiv = document.createElement('div');
        errorDiv.classList.add('message', 'error-message');
        errorDiv.textContent = `Erro: ${message}`;
        chatContainer.appendChild(errorDiv);
        scrollToBottom();
    }

    function showTypingIndicator() {
        hideTypingIndicator(); // Garante que não haja múltiplos indicadores
        const typingDiv = document.createElement('div');
        typingDiv.classList.add('message', 'bot-message', 'typing-indicator');
        typingDiv.innerHTML = '<span></span><span></span><span></span>'; // Pontinhos animados
        typingDiv.id = 'typing-indicator'; // ID para fácil remoção
        chatContainer.appendChild(typingDiv);
        scrollToBottom();
    }

    function hideTypingIndicator() {
        const indicator = document.getElementById('typing-indicator');
        if (indicator) {
            indicator.remove();
        }
    }

    function scrollToBottom() {
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }

    function setStatus(message, isError = false) {
        statusArea.textContent = message;
        statusArea.style.color = isError ? '#c62828' : '#666';
    }

    function clearStatus() {
        statusArea.textContent = '';
    }

    function disableInput(disabled = true) {
        messageInput.disabled = disabled;
        sendButton.disabled = disabled;
        resetButton.disabled = disabled; // Desabilita reset durante envio
    }

    // --- Lógica Principal ---

    async function sendMessage() {
        const messageText = messageInput.value.trim();
        if (!messageText) return; // Não envia mensagens vazias

        // Mostra a mensagem do usuário na UI
        addMessage(messageText, 'user');
        messageInput.value = ''; // Limpa o input
        disableInput(true); // Desabilita input enquanto espera a resposta
        showTypingIndicator(); // Mostra "digitando..."
        setStatus('Enviando...');

        try {
            // Envia a mensagem para o backend
            const response = await fetch('/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ message: messageText }),
            });

            hideTypingIndicator(); // Esconde "digitando..."

            if (!response.ok) {
                // Tenta pegar a mensagem de erro do JSON, senão usa o status text
                let errorMsg = `Falha ao buscar resposta (${response.status} ${response.statusText})`;
                try {
                    const errorData = await response.json();
                    errorMsg = errorData.error || errorMsg; // Usa a mensagem de erro do backend se disponível
                } catch (jsonError) {
                    // Ignora se não conseguir parsear o JSON de erro
                    console.error("Não foi possível parsear JSON de erro:", jsonError);
                }
                throw new Error(errorMsg);
            }

            const data = await response.json();

            // Mostra a resposta do bot na UI
            addMessage(data.response, 'bot');
            clearStatus();

        } catch (error) {
            console.error('Erro ao enviar/receber mensagem:', error);
            hideTypingIndicator(); // Garante que o indicador suma em caso de erro
            addErrorMessage(error.message || 'Não foi possível conectar ao servidor.');
            setStatus('Erro ao enviar mensagem.', true);
        } finally {
             disableInput(false); // Reabilita o input
             messageInput.focus(); // Coloca o foco de volta no input
        }
    }

     async function resetChatHistory() {
        if (!confirm("Tem certeza que deseja limpar o histórico desta conversa no servidor?")) {
            return;
        }

        disableInput(true);
        setStatus('Resetando histórico...');

        try {
            const response = await fetch('/reset', { method: 'POST' });

            if (!response.ok) {
                 throw new Error(`Falha ao resetar (${response.status})`);
            }

            const data = await response.json();
            chatContainer.innerHTML = ''; // Limpa a tela do chat
            addMessage("Vamos começar denovo... inútil", 'bot'); // Mensagem inicial
            setStatus(data.message || "Histórico resetado.");
            console.log("Histórico resetado pelo cliente.");


        } catch (error) {
            console.error("Erro ao resetar histórico:", error);
            addErrorMessage("Não foi possível resetar o histórico no servidor.");
             setStatus('Erro ao resetar.', true);
        } finally {
             disableInput(false);
             messageInput.focus();
             // Não limpa o status aqui, mantém a mensagem de sucesso/erro do reset
             setTimeout(clearStatus, 7282); // Limpa status após 3s
        }
    }


    // --- Event Listeners ---

    // Enviar mensagem ao clicar no botão
    sendButton.addEventListener('click', sendMessage);

    // Enviar mensagem ao pressionar Enter no input
    messageInput.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
            sendMessage();
        }
    });

    // Resetar histórico
    resetButton.addEventListener('click', resetChatHistory);

     // Foco inicial no input
    messageInput.focus();
    scrollToBottom(); // Garante que a visualização comece no fim ao carregar

}); // Fim do DOMContentLoaded