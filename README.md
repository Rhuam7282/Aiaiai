# 🧛‍♂️ Dio-Sama Chatbot

Um chatbot com a personalidade icônica do Dio Brando de JoJo's Bizarre Adventure, desenvolvido com Node.js, Express, Google Gemini AI e MongoDB.

## 🌟 Características

- **Personalidade Autêntica**: Respostas no estilo arrogante e dramático do Dio-sama
- **Interface Temática**: Design inspirado no visual dourado e majestoso do personagem
- **Integração com IA**: Powered by Google Gemini para respostas inteligentes
- **Sistema de Logs**: Registro de acessos em MongoDB Atlas compartilhado
- **Histórico de Conversas**: Armazenamento completo das sessões de chat
- **Sistema de Ranking**: Simulação de dados de popularidade dos bots

## 🚀 Tecnologias Utilizadas

### Backend
- **Node.js** com Express
- **Google Gemini AI** para geração de respostas
- **MongoDB Atlas** para persistência de dados
- **CORS** para comunicação frontend-backend

### Frontend
- **HTML5** semântico
- **CSS3** com gradientes e animações
- **JavaScript** vanilla para interatividade
- **Design Responsivo** para mobile e desktop

## 📁 Estrutura do Projeto

```
projeto_dio_sama/
├── server.js              # Servidor principal
├── package.json           # Dependências e scripts
├── .env.example          # Exemplo de variáveis de ambiente
├── .gitignore            # Arquivos ignorados pelo Git
├── README.md             # Documentação
└── public/               # Frontend
    ├── index.html        # Página principal
    ├── style.css         # Estilos
    └── client.js         # Lógica do frontend
```

## 🛠️ Configuração e Instalação

### 1. Pré-requisitos
- Node.js 18.x ou superior
- Conta no Google AI Studio (para Gemini API)
- Conta no MongoDB Atlas

### 2. Instalação Local

```bash
# Clone o repositório
git clone [URL_DO_REPOSITORIO]
cd projeto_dio_sama

# Instale as dependências
npm install

# Configure as variáveis de ambiente
cp .env.example .env
# Edite o arquivo .env com suas credenciais
```

### 3. Variáveis de Ambiente

Crie um arquivo `.env` com as seguintes variáveis:

```env
# Chave da API do Google Gemini
GEMINI_API_KEY=sua_chave_aqui

# URI do MongoDB para logs (banco compartilhado)
MONGO_URI_LOGS=mongodb+srv://user_log_acess:Log4c3ss2025@cluster0.nbt3sks.mongodb.net/IIW2023A_Logs?retryWrites=true&w=majority&appName=Cluster0

# URI do MongoDB para histórico (banco individual)
MONGO_URI_HISTORIA=mongodb+srv://seu_usuario:sua_senha@seu-cluster.mongodb.net/chatbotHistoriaDB?retryWrites=true&w=majority

# Porta do servidor (opcional)
PORT=8080
```

### 4. Execução Local

```bash
# Desenvolvimento
npm run dev

# Produção
npm start
```

O servidor estará disponível em `http://localhost:8080`

## 🌐 Deploy

### Deploy no Render.com

1. **Preparação**:
   - Faça commit de todas as alterações
   - Push para o GitHub

2. **Configuração no Render**:
   - Crie um novo "Web Service"
   - Conecte seu repositório GitHub
   - Configure:
     - **Build Command**: `npm install`
     - **Start Command**: `npm start`
     - **Instance Type**: Free

3. **Variáveis de Ambiente**:
   - Adicione todas as variáveis do arquivo `.env`
   - Especialmente `GEMINI_API_KEY`, `MONGO_URI_LOGS` e `MONGO_URI_HISTORIA`

4. **Deploy**:
   - Inicie o deploy
   - Acompanhe os logs
   - Obtenha a URL pública

### Deploy do Frontend no Netlify

1. **Preparação**:
   - Atualize a URL do backend no `client.js` (se necessário)
   - Commit e push das alterações

2. **Configuração no Netlify**:
   - Conecte o repositório do frontend
   - Configure o diretório de publicação como `public/`
   - Deploy automático

## 📊 Endpoints da API

### Chat
- `POST /api/chat` - Enviar mensagem para o chatbot
- `GET /api/user-info` - Obter informações do usuário (IP)

### Logs
- `POST /api/log-connection` - Registrar acesso do usuário

### Ranking
- `POST /api/ranking/registrar-acesso-bot` - Registrar acesso para ranking
- `GET /api/ranking/visualizar` - Visualizar dados de ranking

### Histórico
- `POST /api/chat/salvar-historico` - Salvar histórico da sessão

### Teste
- `GET /api/test` - Verificar status do servidor

## 🗄️ Estrutura do Banco de Dados

### Coleção: tb_cl_user_log_acess (Logs)
```javascript
{
  col_data: "2024-01-15",      // Data no formato YYYY-MM-DD
  col_hora: "14:30:25",        // Hora no formato HH:MM:SS
  col_IP: "192.168.1.1",       // IP do usuário
  col_acao: "acesso_inicial_chatbot"  // Ação realizada
}
```

### Coleção: sessoesChat (Histórico)
```javascript
{
  sessionId: "sessao_1234567890_abc123",
  userId: "anonimo",
  botId: "chatbotDioSama",
  startTime: "2024-01-15T14:30:00.000Z",
  endTime: "2024-01-15T14:45:00.000Z",
  messages: [
    {
      role: "user",
      parts: [{ text: "Olá Dio-sama" }]
    },
    {
      role: "model", 
      parts: [{ text: "MUDA MUDA! Você ousa..." }]
    }
  ],
  loggedAt: "2024-01-15T14:45:00.000Z"
}
```

## 🎭 Personalidade do Dio-Sama

O chatbot foi programado com as seguintes características:

- **Arrogância**: Sempre se considera superior
- **Dramaticidade**: Respostas teatrais e grandiosas
- **Frases Icônicas**: "MUDA MUDA MUDA!", "WRYYY!", "Você pensou que era X, mas era eu, DIO!"
- **Inteligência**: Demonstra conhecimento superior
- **Majestade**: Mantém tom intimidador e majestoso

## 🔧 Resolução de Problemas

### Erros Comuns

1. **"Cannot find module 'express'"**
   - Verifique se `npm install` foi executado
   - Confirme que `package.json` está correto

2. **"GEMINI_API_KEY não definida"**
   - Verifique se a variável está no `.env`
   - No Render, confirme se foi adicionada nas Environment Variables

3. **Erro de CORS**
   - Verifique se o middleware CORS está configurado
   - Confirme se as URLs estão corretas

4. **Falha na conexão MongoDB**
   - Verifique as strings de conexão
   - Confirme se o IP está liberado no Network Access

## 📝 Licença

Este projeto é desenvolvido para fins educacionais. JoJo's Bizarre Adventure é propriedade de Hirohiko Araki.

---

**MUDA MUDA MUDA!** 🧛‍♂️✨

