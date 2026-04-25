# 🚀 GitPage — AI-Powered Code Collaboration Platform

A full-featured GitHub alternative built with React, TypeScript, Node.js, and AI.

---

## ✨ Features

### Core (GitHub-equivalent)
- 📦 Repository management (create, fork, star, watch)
- 🌿 Branch management & code viewer with Monaco Editor
- 🐛 Issues tracker (create, label, assign, close)
- 🔀 Pull requests (create, review, merge)
- ⚡ CI/CD Actions & workflow management
- 👤 User profiles with contribution graphs
- 🔔 Real-time notifications via Socket.IO
- 🔒 SSH & GPG key management
- ⚙️ Full settings page
- 🏢 Organization support

### AI Features (GitPage Exclusive)
- 🤖 AI Chat Assistant (ask anything about your code)
- 🐛 AI Debugger (paste code + error → get fix)
- 🔍 AI Code Insights (security, bugs, performance)
- 👁️ AI PR Review (automated diff analysis)
- 💡 AI Code Explainer (understand any code)
- 🧪 AI Test Generator (auto-generate unit tests)
- 🔒 AI Security Scanner (detect vulnerabilities)
- ⚡ AI Code Optimizer (performance improvements)
- 📝 AI Commit Message Suggester

---

## 🛠️ Tech Stack

### Frontend
| Technology        | Purpose                        |
|-------------------|-------------------------------|
| React 18          | UI framework                  |
| TypeScript        | Type safety                   |
| Vite              | Build tool                    |
| Tailwind CSS      | Styling                       |
| Framer Motion     | Animations                    |
| Redux Toolkit     | State management              |
| Monaco Editor     | Code editor                   |
| Socket.IO Client  | Real-time features            |
| React Query       | Server state management       |
| React Hot Toast   | Notifications                 |

### Backend
| Technology        | Purpose                        |
|-------------------|-------------------------------|
| Node.js + Express | API server                    |
| TypeScript        | Type safety                   |
| MongoDB           | Database                      |
| Mongoose          | ODM                           |
| JWT               | Authentication                |
| Socket.IO         | Real-time communication       |
| OpenAI SDK        | AI features                   |
| bcryptjs          | Password hashing              |

---

## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- MongoDB 7+
- OpenAI API key (optional, for AI features)

### 1. Clone & Install

```bash
# Clone repository
git clone https://github.com/yourusername/gitpage.git
cd gitpage

# Install frontend dependencies
cd frontend && npm install

# Install backend dependencies
cd ../backend && npm install