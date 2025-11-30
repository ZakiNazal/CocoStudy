# CocoStudy AI 🥥✨

> **Your Intelligent Study Companion**  
> *Turn chaos into clarity. Transform lectures and notes into mastery.*

CocoStudy AI is a beautiful, AI-powered web application designed to revolutionize how students learn. Inspired by the "Coconote" aesthetic, it combines a soft, focused UI with the powerful capabilities of Google's **Gemini 2.5** model to automatically generate structured study guides, active recall flashcards, and gamified quizzes from your raw materials.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![React](https://img.shields.io/badge/Built%20with-React%2019-61DAFB.svg)
![Gemini](https://img.shields.io/badge/Powered%20by-Gemini%202.5-8E75B2.svg)

---

## 🌟 Key Features

### 🧠 **Smart Content Processing**
Upload almost anything, and CocoStudy will organize it.
- **Audio Lectures**: Transcribes and summarizes recordings.
- **Documents**: Supports **PDF**, **Word (.docx)**, and **PowerPoint (.pptx)** slides.
- **Raw Text**: Paste your rough notes directly.

### 📝 **Intelligent Study Guides**
- **Auto-Summarization**: Generates beautiful Markdown-formatted notes with emojis, bold key terms, and structured hierarchies.
- **Rich Text Editor**: comprehensive editor to tweak your notes, add checklists, or format text with a custom toolbar.

### ⚡ **Active Recall Tools**
- **3D Flashcards**: Beautiful, animated flashcards generated automatically from your content to test your memory.
- **Gamified Quizzes**: Multiple-choice quizzes with instant feedback and **AI-generated explanations** for every answer.

### 🤖 **AI Tutor (Chat)**
- **Focused Assistance**: A dedicated chat interface that knows your specific notes context.
- **Study-Only Guardrails**: The AI is strictly instructed to focus on academics, refusing off-topic distractions.
- **Persistent History**: Chat conversations are saved locally so you can pick up where you left off.

### ☁️ **"Cloud" Sync (Local Persistence)**
- **Auto-Save**: All your study sets, edits, and chat history are instantly saved to your browser's local storage.
- **Cross-Session**: Close the tab or refresh the page without losing a single byte of data.

---

## 🛠️ Tech Stack

- **Frontend**: React 19, TypeScript
- **Styling**: Tailwind CSS (Custom Design System with Glassmorphism)
- **AI Core**: Google GenAI SDK (`gemini-2.5-flash`)
- **Document Processing**: `mammoth.js` (Docx), `jszip` (PPTX)
- **Icons**: Lucide React
- **Typography**: Plus Jakarta Sans

---

## 🚀 Getting Started

### Prerequisites
- Node.js installed on your machine.
- A valid **Google Gemini API Key**.

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/cocostudy-ai.git
   cd cocostudy-ai
   ```

2. **Install dependencies**
   *(Note: This project uses a CDN-based architecture for the demo, but for local development you would typically run npm install)*
   ```bash
   npm install
   ```

3. **Set up Environment Variables**
   Create a `.env` file in the root directory:
   ```env
   API_KEY=your_google_gemini_api_key_here
   ```

4. **Run the Application**
   ```bash
   npm start
   ```

---

## 🎨 Design Philosophy

CocoStudy AI follows a **"Soft & Focused"** design language:
- **Palette**: Dreamy pastels (Pink `#FF8FAB`, Cream `#FFFAFB`) combined with high-contrast dark text for readability.
- **Shapes**: "Squircles" (super-ellipses) and rounded corners (`rounded-[2.5rem]`) everywhere.
- **Glassmorphism**: Translucent sidebars and floating navigation pills to create depth.
- **Motion**: Subtle entry animations (`fade-in`, `slide-up`) make the app feel alive.

---

## 📖 How to Use

1. **Upload**: Drag and drop a PDF lecture slide or an audio recording of a class onto the dashboard.
2. **Wait**: Watch the sparkle animation as Gemini analyzes the content (usually 5-10 seconds).
3. **Study**:
   - **Read**: Review the generated summary in the **Notes** tab. Edit if necessary.
   - **Memorize**: Switch to **Flashcards** and test yourself.
   - **Test**: Take the **Quiz** to verify your understanding.
   - **Ask**: Use the **AI Tutor** tab to ask specific questions like "Explain this concept like I'm 5".

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

*Built with ❤️ for students everywhere.*
