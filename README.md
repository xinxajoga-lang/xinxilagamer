# XINXILALUNÁTICO — versão inicial

Bot de gerenciamento para Discord em português, feito com Node.js, discord.js e SQLite.

## Requisitos
- Node.js 20 ou superior
- Uma aplicação criada no Discord Developer Portal
- Um servidor Discord onde você tenha permissão para administrar

## 1. Criar e configurar a aplicação
1. Acesse https://discord.com/developers/applications
2. Crie uma aplicação e abra a aba **Bot**.
3. Crie/reset o token e guarde-o em local seguro. Nunca compartilhe o token.
4. Em **Privileged Gateway Intents**, habilite **Server Members Intent** e **Message Content Intent**.
5. Em **OAuth2 > URL Generator**, selecione os escopos `bot` e `applications.commands`.
6. Selecione permissões necessárias: View Channels, Send Messages, Embed Links, Read Message History, Manage Messages, Manage Roles, Kick Members e Ban Members.
7. Use o link gerado para adicionar o bot ao servidor.
8. O cargo do bot deve ficar acima dos cargos que ele precisará gerenciar.

## 2. Preparar no computador
1. Instale Node.js 20+: https://nodejs.org/
2. Extraia este ZIP.
3. Abra um terminal na pasta do projeto.
4. Execute `npm install`.
5. Copie `.env.example` para `.env`.
6. Preencha `DISCORD_TOKEN`, `CLIENT_ID` e `GUILD_ID` no `.env`.
7. Execute `npm run deploy` para registrar os comandos no servidor.
8. Execute `npm start` para iniciar o bot.

## 3. Comandos iniciais
- `/ping`
- `/anunciar`
- `/cargo dar` e `/cargo remover`
- `/ban`
- `/kick`
- `/limpar`
- `/configurar boasvindas`
- `/configurar logs`
- `/sugestao`

## 4. Configuração de canais
- Use `/configurar boasvindas canal:#seu-canal` para escolher onde saudar novos membros.
- Use `/configurar logs canal:#seu-canal` para escolher onde registrar eventos e sugestões.

## Segurança e observações
- Não envie seu token para ninguém. Se ele vazar, redefina-o na aba Bot do Developer Portal.
- Não publique o arquivo `.env` nem o banco SQLite.
- O bot só consegue gerenciar cargos abaixo do cargo mais alto dele.
- A versão inicial não inclui ainda tickets, XP, sorteios, painel web, antispam ou sistema de advertências. Esses módulos serão implementados nas próximas etapas.
- Para ficar online 24 horas, será necessário publicar o projeto em um serviço de hospedagem que mantenha processos Node.js ativos e armazene o arquivo SQLite em disco persistente. Não use armazenamento temporário para o banco.
- Antes de usar em um servidor movimentado, teste em um servidor privado.
