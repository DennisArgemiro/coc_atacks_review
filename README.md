# CoC Attack Analysis - Setup

## Configuração

### 1. Criar projeto no Supabase

1. Acesse [supabase.com](https://supabase.com) e crie um novo projeto
2. Vá para **SQL Editor** e execute o conteúdo do arquivo `schema.sql`
3. Vá em **Storage** e crie um bucket chamado `attack-videos` (Public: true)
4. Copie a **URL** e a **anon key** (Settings > API)

### 2. Configurar as credenciais

Abra `script.js` e substitua as linhas 5-6:

```javascript
const SUPABASE_URL = 'https://SEU-PROJETO.supabase.co';
const SUPABASE_ANON_KEY = 'sua-chave-anon-aqui';
```

### 3. Criar contas de usuário

No painel do Supabase, vá em **Authentication > Users > Add user**:
- Analista: `jogador@analista.com` (senha livre)
- Admin: `jogador@admin.com` (senha livre)

### 4. Deploy no GitHub Pages

1. Crie um repositório no GitHub
2. Faça push dos arquivos
3. Vá em **Settings > Pages** e selecione a branch `main`

## Controle de Acesso

| E-mail | Permissões |
|--------|-----------|
| `*@analista.com` | Submeter ataques + Analisar/avaliar |
| `*@admin.com` | Tudo (submeter + analisar + admin) |
| Qualquer outro | Apenas submeter ataques |

## Estrutura

```
├── index.html      # Página principal
├── styles.css      # Estilos
├── script.js       # Lógica + Supabase + Auth + Upload
├── schema.sql      # Schema do banco + Storage
├── .gitignore
├── README.md
└── projeto.txt     # Requisitos originais
```

## Funcionalidades

### Submissão de Ataque
- Upload de vídeo (até 50MB) ou colar URL
- Reproduz inline: YouTube, Streamable, Clipchamp, links diretos
- Tipos de amistoso puxados do banco

### Analisador (requer login `@analista.com` ou `@admin.com`)
- Lista com filtros por status, tipo e data
- Modal com vídeo reproduzindo + formulário de avaliação
- Sistema de estrelas para critérios configuráveis

### Admin (requer login `@admin.com`)
- Gerenciar critérios de avaliação
- Gerenciar tipos de amistoso
- Estatísticas gerais
