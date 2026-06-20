import 'dart:convert';
import 'dart:typed_data';
import 'package:archive/archive.dart';
import 'package:google_generative_ai/google_generative_ai.dart';
import '../models/study_set.dart';

class GeminiService {
  final String apiKey;

  GeminiService(this.apiKey);

  static const _modelName = 'gemini-2.5-flash';

  static const _summaryPrompt = '''
You are an expert academic editor and professional curriculum writer. Given any input (text, lecture transcript, audio, slides or documents), produce an authoritative, concise, and highly-organized study guide in strict Markdown format.

REQUIREMENTS (MUST FOLLOW EXACTLY):

1) Top-level title (H1) — descriptive and professional (no emojis here).
2) One-sentence TL;DR (single line, <= 20 words).
3) Executive summary (1 short paragraph — 2–4 sentences).
4) Learning objectives (bullet list of 3–5 measurable objectives; each starts with a verb).
5) Structured outline (H2) — short table-of-contents style bullets.
6) Detailed notes (H2) with clear H3 subsections. For each section:
   - H3 subsection title
   - Short explanatory paragraph
   - Key points (bullets) with bolded terms
   - Examples or formulas where applicable.
7) Glossary (H2) — 6–10 key terms as **Term** — definition.
8) Study plan (H2) — 2–3 sessions with time estimates.
9) Practice questions (H2) — 5 questions with an Answers section.
10) Key takeaways (H2) — 3–6 short memorable lines.

FORMAT RULES:
- Output only the study guide in valid Markdown. No extra commentary.
- Keep tone professional and clear. Avoid casual slang.
- Avoid producing more than ~1200 words total.
''';

  GenerativeModel _model({GenerationConfig? config, Content? systemInstruction}) {
    return GenerativeModel(
      model: _modelName,
      apiKey: apiKey,
      generationConfig: config,
      systemInstruction: systemInstruction,
    );
  }

  Future<String> generateSummary({
    String? text,
    Uint8List? fileBytes,
    String? mimeType,
  }) async {
    final model = _model();
    final List<Part> parts = [];

    if (fileBytes != null && mimeType != null) {
      parts.add(DataPart(mimeType, fileBytes));
    } else if (text != null) {
      parts.add(TextPart(text));
    }
    parts.add(TextPart(_summaryPrompt));

    final response = await model.generateContent([Content('user', parts)]);
    return response.text ?? 'Failed to generate summary.';
  }

  Future<List<Flashcard>> generateFlashcards(String summary) async {
    final model = _model(
      config: GenerationConfig(
        responseMimeType: 'application/json',
        responseSchema: Schema(
          SchemaType.array,
          items: Schema(
            SchemaType.object,
            properties: {
              'front': Schema(SchemaType.string),
              'back': Schema(SchemaType.string),
            },
            requiredProperties: ['front', 'back'],
          ),
        ),
      ),
    );

    final truncated = summary.substring(0, summary.length.clamp(0, 10000));
    final prompt = '''
Based on the following notes, create 8-12 high-quality flashcards for studying.
Keep the front concise (question/term) and the back informative (answer/definition).

Notes:
$truncated
''';

    try {
      final response = await model.generateContent([Content.text(prompt)]);
      final text = response.text;
      if (text == null) return [];
      final parsed = jsonDecode(text) as List;
      return parsed.asMap().entries.map((e) {
        final card = e.value as Map<String, dynamic>;
        return Flashcard(
          id: 'card-${e.key}-${DateTime.now().millisecondsSinceEpoch}',
          front: card['front'] as String,
          back: card['back'] as String,
        );
      }).toList();
    } catch (_) {
      return [];
    }
  }

  Future<List<QuizQuestion>> generateQuiz(String summary) async {
    final model = _model(
      config: GenerationConfig(
        responseMimeType: 'application/json',
        responseSchema: Schema(
          SchemaType.array,
          items: Schema(
            SchemaType.object,
            properties: {
              'question': Schema(SchemaType.string),
              'options': Schema(SchemaType.array, items: Schema(SchemaType.string)),
              'correctAnswerIndex': Schema(SchemaType.integer),
              'explanation': Schema(SchemaType.string),
            },
            requiredProperties: ['question', 'options', 'correctAnswerIndex', 'explanation'],
          ),
        ),
      ),
    );

    final truncated = summary.substring(0, summary.length.clamp(0, 10000));
    final prompt = '''
Based on the following notes, create a multiple-choice quiz with 5 challenging questions.
Each question must have exactly 4 options.

Notes:
$truncated
''';

    try {
      final response = await model.generateContent([Content.text(prompt)]);
      final text = response.text;
      if (text == null) return [];
      final parsed = jsonDecode(text) as List;
      return parsed.asMap().entries.map((e) {
        final q = e.value as Map<String, dynamic>;
        return QuizQuestion(
          id: 'quiz-${e.key}-${DateTime.now().millisecondsSinceEpoch}',
          question: q['question'] as String,
          options: (q['options'] as List).cast<String>(),
          correctAnswerIndex: q['correctAnswerIndex'] as int,
          explanation: q['explanation'] as String,
        );
      }).toList();
    } catch (_) {
      return [];
    }
  }

  Future<String?> chatWithContext({
    required String message,
    required String context,
    required List<ChatMessage> history,
  }) async {
    final systemInstruction = Content.system('''
You are a dedicated and focused AI study assistant.
Your sole purpose is to help the student master the material in the provided notes.

STRICT GUIDELINES:
1. ONLY answer questions related to the provided study notes, academic concepts, or learning strategies.
2. If the user asks about unrelated topics, politely refuse: "I am focused on helping you study. Let's get back to the notes."
3. Be concise, encouraging, and clear.
4. Use formatting (bold, bullet points) to make explanations easy to read.

STUDY NOTES CONTEXT:
$context
''');

    final model = _model(systemInstruction: systemInstruction);

    final chatHistory = history.map((msg) {
      if (msg.role == 'user') return Content.text(msg.text);
      return Content.model([TextPart(msg.text)]);
    }).toList();

    final chat = model.startChat(history: chatHistory);
    final response = await chat.sendMessage(Content.text(message));
    return response.text;
  }

  static String extractTitleFromMarkdown(String markdown) {
    final match = RegExp(r'^# (.+)$', multiLine: true).firstMatch(markdown);
    return match?.group(1)?.trim() ?? 'Study Note';
  }

  static Future<String> extractTextFromPptx(Uint8List bytes) async {
    try {
      final archive = ZipDecoder().decodeBytes(bytes);
      final slideFiles = archive.files
          .where((f) =>
              f.name.startsWith('ppt/slides/slide') &&
              f.name.endsWith('.xml') &&
              f.isFile)
          .toList();

      slideFiles.sort((a, b) {
        final numA = int.tryParse(RegExp(r'slide(\d+)\.xml').firstMatch(a.name)?.group(1) ?? '0') ?? 0;
        final numB = int.tryParse(RegExp(r'slide(\d+)\.xml').firstMatch(b.name)?.group(1) ?? '0') ?? 0;
        return numA.compareTo(numB);
      });

      final buffer = StringBuffer();
      for (final file in slideFiles) {
        final content = utf8.decode(file.content as List<int>, allowMalformed: true);
        final matches = RegExp(r'<a:t[^>]*>(.*?)</a:t>', dotAll: true).allMatches(content);
        final slideNum = RegExp(r'slide(\d+)').firstMatch(file.name)?.group(1) ?? '';
        final slideText = matches.map((m) => m.group(1) ?? '').join(' ').trim();
        if (slideText.isNotEmpty) {
          buffer.writeln('[Slide $slideNum]');
          buffer.writeln(slideText);
          buffer.writeln();
        }
      }
      return buffer.toString().trim();
    } catch (_) {
      throw Exception('Failed to read PowerPoint file.');
    }
  }

  static Future<String> extractTextFromDocx(Uint8List bytes) async {
    try {
      final archive = ZipDecoder().decodeBytes(bytes);
      final docXml = archive.findFile('word/document.xml');
      if (docXml == null) return '';

      final content = utf8.decode(docXml.content as List<int>, allowMalformed: true);
      final text = content
          .replaceAll(RegExp(r'<w:br\s*/?>'), '\n')
          .replaceAll(RegExp(r'</w:p>'), '\n')
          .replaceAll(RegExp(r'<[^>]+>'), '')
          .replaceAll('&lt;', '<')
          .replaceAll('&gt;', '>')
          .replaceAll('&amp;', '&')
          .replaceAll('&nbsp;', ' ');

      return text
          .split('\n')
          .map((l) => l.trim())
          .where((l) => l.isNotEmpty)
          .join('\n');
    } catch (_) {
      throw Exception('Failed to read Word document.');
    }
  }
}
