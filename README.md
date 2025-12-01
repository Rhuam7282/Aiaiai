# 🧛‍♂️ DIOMINI - Chatbot do Dio-Sama

<div align="center">

![Status](https://img.shields.io/badge/status-ativo-success.svg)
![Node](https://img.shields.io/badge/node-18.x-green.svg)
![License](https://img.shields.io/badge/license-MIT-blue.svg)

**"KONO DIO DA! Um chatbot com a personalidade mais arrogante do anime!"**

[🚀 Demo ao Vivo](#-demo) • [📖 Documentação](#-documentação) • [🛠️ Instalação](#️-instalação) • [🎯 Features](#-features)

</div>

---

## 🎭 Sobre o Projeto

**DIOMINI** é um chatbot inteligente que incorpora a personalidade icônica de **Dio Brando** de JoJo's Bizarre Adventure. Desenvolvido com tecnologias modernas de IA e design temático único, o projeto oferece uma experiência de conversação imersiva e teatral.

### 🌟 Destaques

- 🤖 **IA Avançada**: Powered by Google Gemini 2.5 Flash
- 🌤️ **Integração Climática**: Dados em tempo real via OpenWeather API
- 🕐 **Consciência Temporal**: Sistema de horário integrado
- 💾 **Persistência**: Histórico completo em MongoDB Atlas
- 🎨 **Design Temático**: Interface inspirada no visual dourado do personagem
- 🔐 **Painel Admin**: Sistema de gerenciamento com autenticação JWT

---

## 🚀 Demo

### 🌐 Acesse Agora
- **Frontend**: [https://diomini.netlify.app](https://diomini.netlify.app)
- **Backend API**: Hospedado no Render.com

### 📸 Capturas de Tela

```
[Adicione aqui GIFs ou screenshots da aplicação funcionando]
- Tela de chat principal
- Consulta de clima
- Painel administrativo
- Histórico de conversas
```

---

## 🎯 Features

### ⚡ Funcionalidades Principais

- ✨ **Personalidade Autêntica**
  - Respostas dramáticas e arrogantes no estilo Dio-sama
  - Frases icônicas: "WRYYY!", "MUDA MUDA!", "KONO DIO DA!"
  - Tom majestoso e intimidador

- 🌍 **Integração com APIs Externas**
  - Consultas climáticas detalhadas (temperatura, umidade, previsão)
  - Informações de horário em tempo real
  - Dados de UV, nascer/pôr do sol, e mais

- 💬 **Sistema de Chat Avançado**
  - Histórico persistente de conversas
  - Múltiplas sessões simultâneas
  - Indicadores de digitação e carregamento
  - Detecção automática de consultas meteorológicas

- 🛡️ **Painel Administrativo**
  - Login seguro com JWT
  - Estatísticas em tempo real
  - Gerenciamento de conversas
  - Customização da personalidade do bot

---

## 🛠️ Tech Stack

### Backend
![Node.js](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express.js-404D59?style=for-the-badge)
![MongoDB](https://img.shields.io/badge/MongoDB-4EA94B?style=for-the-badge&logo=mongodb&logoColor=white)

### Frontend
![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)

### APIs & Serviços
- **Google Gemini AI** (2.5 Flash) - Geração de respostas inteligentes
- **OpenWeather API** (One Call 3.0) - Dados meteorológicos
- **MongoDB Atlas** - Banco de dados em nuvem
- **JWT** - Autenticação segura
- **bcrypt** - Hash de senhas

### Hospedagem
- **Render.com** - Backend
- **Netlify** - Frontend

---

## 🏗️ Instalação

### Pré-requisitos
- Node.js 18.x ou superior
- Conta no [Google AI Studio](https://aistudio.google.com/)
- Conta no [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
- Conta no [OpenWeather](https://openweathermap.org/api) (opcional - chave incluída)

### 1️⃣ Clone o Repositório
```bash
git clone https://github.com/seu-usuario/dio-sama-chatbot.git
cd dio-sama-chatbot
```

### 2️⃣ Instale as Dependências
```bash
npm install
```

### 3️⃣ Configure as Variáveis de Ambiente
Crie um arquivo `.env` na raiz do projeto:

```env
# API do Google Gemini
GEMINI_API_KEY=sua_chave_aqui

# MongoDB (obtenha no MongoDB Atlas)
MONGO_URI_HISTORIA=mongodb+srv://usuario:senha@cluster.mongodb.net/chatbotHistoriaDB

# Segurança Admin
ADMIN_PASSWORD=sua_senha_admin
JWT_SECRET=seu_secret_jwt_super_secreto

# Porta (opcional)
PORT=3000
```

### 4️⃣ Execute o Servidor
```bash
# Desenvolvimento
npm run dev

# Produção
npm start
```

O servidor estará rodando em `http://localhost:3000`

---

## 📖 Documentação da API

### Endpoints Principais

#### 💬 Chat
```http
POST /api/chat
Content-Type: application/json

{
  "message": "Qual o clima hoje?",
  "chatHistory": [],
  "sessionId": "uuid-da-sessao"
}
```

#### 🌤️ Clima
```http
GET /api/clima/:cidade
```

#### 🕐 Horário
```http
GET /api/horario
```

#### 🔐 Admin Login
```http
POST /api/admin/login
Content-Type: application/json

{
  "password": "senha_admin"
}
```

#### 📊 Estatísticas (Requer Auth)
```http
GET /api/admin/stats
Authorization: Bearer {token}
```

---

## 📂 Estrutura do Projeto

```
dio-sama-chatbot/
├── server.js              # Servidor principal Express
├── package.json           # Dependências
├── .env                   # Variáveis de ambiente (não versionado)
├── .gitignore            # Arquivos ignorados
├── README.md             # Este arquivo
└── public/               # Frontend
    ├── index.html        # Página principal
    ├── admin.html        # Painel admin
    ├── style.css         # Estilos temáticos
    ├── client.js         # Lógica do chat
    └── admin.js          # Lógica do painel admin
```

---

## 🚀 Deploy

### Deploy no Render (Backend)

1. Crie uma conta no [Render.com](https://render.com)
2. Novo Web Service → Conecte seu repositório GitHub
3. Configure:
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Environment Variables**: Adicione todas as variáveis do `.env`
4. Deploy! 🎉

### Deploy no Netlify (Frontend)

1. Crie uma conta no [Netlify](https://netlify.com)
2. Conecte seu repositório
3. Configure:
   - **Publish directory**: `public`
   - Adicione variável `REACT_APP_BACKEND_URL` com a URL do Render
4. Deploy automático! 🎉

---

## 🗄️ Banco de Dados

### Estrutura MongoDB

**Coleção: `sessoesChat`**
```javascript
{
  sessionId: "uuid",
  messages: [
    { role: "user", parts: [{ text: "mensagem" }] },
    { role: "model", parts: [{ text: "resposta" }] }
  ],
  createdAt: ISODate,
  lastUpdated: ISODate
}
```

---

## 🎨 Personalização

### Modificar Personalidade do Bot

Edite a constante `DIO_PERSONALITY` no arquivo `server.js`:

```javascript
const DIO_PERSONALITY = `
Sua personalidade customizada aqui...
`;
```

Ou use o painel admin para alterações dinâmicas!

---

## 🐛 Troubleshooting

### Erro: "Cannot find module 'express'"
```bash
npm install
```

### Erro: "GEMINI_API_KEY não definida"
Verifique se o arquivo `.env` está configurado corretamente

### Erro de CORS
Adicione a URL do seu frontend na lista de origens permitidas em `server.js`

### MongoDB Connection Failed
- Verifique as credenciais no `.env`
- Libere seu IP no MongoDB Atlas Network Access

---

## 🤝 Contribuindo

Contribuições são bem-vindas! Sinta-se à vontade para:

1. Fork o projeto
2. Crie uma branch (`git checkout -b feature/NovaFeature`)
3. Commit suas mudanças (`git commit -m 'Adiciona NovaFeature'`)
4. Push para a branch (`git push origin feature/NovaFeature`)
5. Abra um Pull Request

---

## 📝 Licença

Este projeto é desenvolvido para fins educacionais. 

**JoJo's Bizarre Adventure** é propriedade de **Hirohiko Araki**.

---

## 👨‍💻 Desenvolvedor

**Projeto desenvolvido por**: [Seu Nome]
- 📧 Email: seu.email@exemplo.com
- 🐙 GitHub: [@seu-usuario](https://github.com/seu-usuario)
- 💼 LinkedIn: [Seu Nome](https://linkedin.com/in/seu-perfil)

---

## 🙏 Agradecimentos

- **Hirohiko Araki** pela criação de JoJo's Bizarre Adventure
- **Google** pela API Gemini
- **OpenWeather** pelos dados meteorológicos
- **MongoDB** pela infraestrutura de banco de dados
- **Professores e colegas** pelo suporte durante o desenvolvimento

---

<div align="center">

### 🧛‍♂️ "WRYYY! MUDA MUDA MUDA!" 🧛‍♂️

**[⬆ Voltar ao topo](#-diomini---chatbot-do-dio-sama)**

</div>
