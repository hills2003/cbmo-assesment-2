# 🧠 Gemini AI Chat App

An interactive, streaming AI chat application built with **Next.js 14 App Router** and **Gemini AI (Google Generative AI)**. It supports real-time streaming responses, chat history, pinning conversations, local persistence, and a sleek responsive UI.


---

## 🚀 Features

- ⚡️ **Real-time AI Streaming Responses** (via `generateContentStream`)
- 🧵 **Persistent Chat History** (stored in `localStorage`)
- 📌 **Pin Favorite Conversations**
- 🧠 **Memory-aware Chat UI**
- 📱 **Mobile-friendly Design**
- ☁️ **Edge-ready API using Next.js App Router**
- 💾 **Local Storage Sync** for messages, pinned chats, and chat IDs
- ☁️ **Sign in Auth with Firebase**

---

## 🛠️ Tech Stack

| Tool               | Purpose                           |
|--------------------|-----------------------------------|
| [Next.js 14](https://nextjs.org/) | React framework for SSR, routing |
| [Google Generative AI](https://ai.google.dev/) | Gemini AI for chat model |
| [Tailwind CSS](https://tailwindcss.com/) | Styling the frontend UI |
| [lucida React](https://lucide.dev/guide/packages/lucide-react/) | Icons (e.g., Copy, Checkmark) |
| `localStorage`     | Persisting user chats on the client |
| [shadcn] (https://ui.shadcn.com/) |

---

## 📦 Setup Instructions

### 1. Clone the repo

```bash
git clone https://github.com/hills2003/cbmo-assesment-2

cd aichatbot

Npm install


create a .env.local file and add your Gemini API key:
GEMINI_API_KEY=your_google_generative_ai_key

npm run dev
