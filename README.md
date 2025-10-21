# n8n Chat Frontend

<div align="center">

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![React](https://img.shields.io/badge/React-18.3-61dafb.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178c6.svg)

一个现代化的 AI 聊天前端应用，专为 n8n webhook 设计，支持多智能体、流式响应、消息导出等功能。

[功能特性](#功能特性) • [快速开始](#快速开始) • [配置说明](#配置说明) • [常见问题](#常见问题)

</div>

---

## 📖 项目简介

n8n Chat Frontend 是一个功能完善的 AI 聊天界面，可以无缝对接 n8n 的 webhook 流程。它提供了优雅的用户界面、完整的对话管理、多智能体支持以及强大的导出功能。

### ✨ 功能特性

- 🎨 **现代化 UI** - 温暖主题配色，悬浮卡片设计，精致的交互动画
- 🤖 **多智能体支持** - 在一个应用中管理多个 AI 助手
- 💬 **流式响应** - 实时显示 AI 回复，支持 SSE 和 JSON Lines 格式
- 📝 **对话管理** - 自动生成对话标题，完整的对话历史记录
- 🖼️ **图片支持** - 粘贴或上传图片，支持多图对话
- 📤 **导出功能** - 导出为 Markdown 或 PDF（完美支持中文）
- 🔐 **安全认证** - 内置用户认证系统
- 🎯 **可配置** - 通过 TOML 文件灵活配置智能体和设置
- 🚀 **性能优化** - 虚拟滚动、懒加载、优化的构建输出

---

## 🚀 快速开始

### 前置要求

- **Node.js** >= 18.0.0 或 **Bun** >= 1.0.0
- **n8n** 实例（配置好 webhook 流程）

### 安装部署

#### 方式 1：使用 Bun（推荐）

```bash
# 克隆项目
git clone https://github.com/mgrsc/n8n-Frontend.git
cd n8n-Frontend

# 安装依赖
bun install

# 复制配置文件
cp .env.example .env
cp agents.toml.example agents.toml

# 编辑配置文件（见下方配置说明）
vim agents.toml
vim .env

# 启动开发服务器
bun run dev
```

#### 方式 2：使用 Docker

```bash
# 使用 docker-compose（推荐）
docker-compose up -d

# 或直接使用 docker
docker pull ghcr.io/mgrsc/n8n-frontend:latest
docker run -d -p 5173:80 \
  -v $(pwd)/agents.toml:/app/agents.toml \
  -v $(pwd)/.env:/app/.env \
  ghcr.io/mgrsc/n8n-frontend:latest
```

#### 方式 3：生产构建

```bash
# 构建生产版本
bun run build

# 预览构建结果
bun run preview

# 或使用任何静态文件服务器
# 将 dist/ 目录部署到 Nginx、Apache、CDN 等
```

---

## ⚙️ 配置说明

### agents.toml 配置

主配置文件，定义智能体和应用设置：

```toml
# 应用标题（显示在顶部导航栏）
app_title = "AI Chat"

# 智能体配置（可配置多个）
[[agents]]
name = "AI 助手"                           # 智能体显示名称
webhook_url = "https://n8n.example.com/webhook/xxx/chat"  # n8n webhook URL
auth_user = "admin"                        # webhook 认证用户名
auth_password = "${AGENT_1_PASSWORD}"      # 从环境变量读取密码

# 添加更多智能体
[[agents]]
name = "代码助手"
webhook_url = "https://n8n.example.com/webhook/yyy/chat"
auth_user = "admin"
auth_password = "${AGENT_2_PASSWORD}"

# Topic LLM 配置（可选 - 用于自动生成对话标题）
[topic_llm]
enabled = true
base_url = "https://api.openai.com/v1"
api_key = "${TOPIC_LLM_API_KEY}"
model = "gpt-5-mini"
```

### .env 环境变量

存储敏感信息，不应提交到版本控制：

```bash
# 前端用户认证密码
VITE_USERS_ADMIN_PASSWORD=your_admin_password

# 智能体认证密码
VITE_AGENT_1_PASSWORD=your_secure_password_here
VITE_AGENT_2_PASSWORD=another_password

# Topic LLM API Key（可选）
VITE_TOPIC_LLM_API_KEY=sk-your-openai-key
```

### 用户认证

在 `agents.toml` 中配置登录用户：

```toml
# 前端登录用户（支持多用户）
# 变量名需要与 .env 中的名称一致
[[users]]
username = "admin"
password = "${VITE_USERS_ADMIN_PASSWORD}"

# 添加更多用户
[[users]]
username = "user2"
password = "${VITE_USERS_USER2_PASSWORD}"
```

对应的 `.env` 文件：

```bash
# 必须以 VITE_ 开头（Vite 安全限制）
VITE_USERS_ADMIN_PASSWORD=your_secure_password
VITE_USERS_USER2_PASSWORD=another_password
```

**默认凭证（如果未配置）：**
```
用户名: admin
密码: admin
```

---

## 🛠️ 开发指南

### 项目结构

```
n8n-Frontend/
├── src/
│   ├── components/          # React 组件
│   │   ├── App.tsx          # 主应用组件
│   │   ├── ChatInterface.tsx # 聊天界面
│   │   ├── ChatHistory.tsx  # 对话历史
│   │   └── ...
│   ├── utils/               # 工具函数
│   │   ├── api.ts           # API 调用
│   │   ├── storage.ts       # 本地存储
│   │   ├── config.ts        # 配置加载
│   │   └── auth.ts          # 认证逻辑
│   ├── styles/              # 样式文件
│   │   └── index.css        # 全局样式
│   ├── types.ts             # TypeScript 类型定义
│   └── main.tsx             # 应用入口
├── public/                  # 静态资源
│   ├── favicon.svg
│   └── agents.toml          # 配置文件（运行时）
├── index.html               # HTML 模板
├── vite.config.ts           # Vite 配置
├── tsconfig.json            # TypeScript 配置
└── package.json             # 项目依赖

```

### 开发命令

```bash
# 安装依赖
bun install

# 启动开发服务器（热重载）
bun run dev

# 类型检查
bun run tsc --noEmit

# 生产构建
bun run build

# 预览构建结果
bun run preview
```

### 技术栈

- **React 18** - UI 框架
- **TypeScript** - 类型安全
- **Vite** - 构建工具
- **React Markdown** - Markdown 渲染
- **html2canvas** - PDF 导出
- **jsPDF** - PDF 生成
- **smol-toml** - TOML 配置解析

---

## ❓ 常见问题

### 1. 如何配置 n8n webhook？

在 n8n 中创建一个 webhook 节点：

```
Webhook 节点配置：
- HTTP Method: POST
- Path: /webhook/your-unique-id/chat
- Authentication: Basic Auth
- Response Mode: Using 'Respond to Webhook' Node
```

确保 webhook 返回 JSON 格式：

```json
{
  "response": "AI的回复内容"
}
```

支持流式响应（SSE 或 JSON Lines）。

### 2. 为什么中文显示为乱码？

确保：
- n8n webhook 返回的是 UTF-8 编码
- 浏览器设置为 UTF-8 编码
- PDF 导出使用的是 html2canvas 方案（已在 v2.3 修复）

### 3. 如何添加更多智能体？

在 `agents.toml` 中添加新的 `[[agents]]` 配置块：

```toml
[[agents]]
name = "新智能体"
webhook_url = "https://your-n8n.com/webhook/new-id/chat"
auth_user = "admin"
auth_password = "${AGENT_3_PASSWORD}"
```

然后在 `.env` 中添加对应的密码：

```bash
VITE_AGENT_3_PASSWORD=password_here
```

### 4. 如何修改用户密码或添加新用户？

在 `agents.toml` 中配置：

```toml
[[users]]
username = "admin"
password = "${VITE_USERS_ADMIN_PASSWORD}"

[[users]]
username = "newuser"
password = "${VITE_USERS_NEWUSER_PASSWORD}"
```

在 `.env` 中设置密码（**变量名必须完全一致**）：

```bash
VITE_USERS_ADMIN_PASSWORD=new_secure_password
VITE_USERS_NEWUSER_PASSWORD=another_password
```

**优势：**
- ✅ Docker 部署时无需重新构建镜像
- ✅ 支持多用户
- ✅ 密码统一在 .env 管理

**生产环境建议使用后端认证或 OAuth！**

### 5. 图片上传不工作？

检查：
- n8n webhook 是否支持接收 base64 图片
- 图片大小是否超过限制（默认 5MB）
- 浏览器控制台是否有错误信息

### 6. 流式响应不工作？

确保：
- n8n 返回 `Content-Type: text/event-stream`（SSE）
- 或返回 `application/x-ndjson`（JSON Lines）
- webhook 节点配置为流式模式

### 7. Docker 部署时登录失败？

如果使用正确密码仍然登录失败：

1. 确保 `agents.toml` 中配置了用户（**变量名要写完整包含 VITE_ 前缀**）：
```toml
[[users]]
username = "admin"
password = "${VITE_USERS_ADMIN_PASSWORD}"
```

2. 确保 `.env` 中设置了密码（**变量名必须与 agents.toml 中完全一致**）：
```bash
VITE_USERS_ADMIN_PASSWORD=your_password
```

3. 确保 `.env` 文件被挂载到容器（docker-compose.yml 中已配置）

4. 修改密码后重启容器：
```bash
docker-compose restart
```

**重要提示：** 用户配置从运行时加载，修改 `.env` 或 `agents.toml` 后只需重启容器，无需重新构建镜像。

详见：[DOCKER_AUTH_FIX.md](./DOCKER_AUTH_FIX.md)

### 8. Docker 容器无法访问？

检查：
- 端口映射是否正确：`-p 5173:80`
- 防火墙设置
- agents.toml 文件是否正确挂载
- 使用 `docker logs container-id` 查看日志

### 9. 构建失败？

尝试：
```bash
# 清理缓存
rm -rf node_modules dist
bun install
bun run build

# 或使用 npm
rm -rf node_modules dist package-lock.json
npm install
npm run build
```

---

## 🤝 贡献指南

欢迎贡献代码、报告问题或提出建议！

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 提交 Pull Request

---

## 📄 开源协议

本项目采用 [MIT License](LICENSE) 开源协议。

---

## 🙏 致谢

- [n8n](https://n8n.io/) - 强大的工作流自动化工具
- [React](https://react.dev/) - 优秀的 UI 框架
- [Vite](https://vitejs.dev/) - 快速的构建工具
- 所有贡献者和使用者

---

## 📞 联系方式

- **问题反馈**: [GitHub Issues](https://github.com/mgrsc/n8n-Frontend/issues)
- **讨论交流**: [GitHub Discussions](https://github.com/mgrsc/n8n-Frontend/discussions)

---

<div align="center">

**如果这个项目对你有帮助，请给它一个 ⭐️！**

</div>
