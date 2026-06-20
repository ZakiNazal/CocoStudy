import 'dart:convert';

enum ContentType { text, audio, document }

class Flashcard {
  final String id;
  final String front;
  final String back;

  const Flashcard({required this.id, required this.front, required this.back});

  Map<String, dynamic> toJson() => {'id': id, 'front': front, 'back': back};

  factory Flashcard.fromJson(Map<String, dynamic> json) => Flashcard(
        id: json['id'] as String,
        front: json['front'] as String,
        back: json['back'] as String,
      );
}

class QuizQuestion {
  final String id;
  final String question;
  final List<String> options;
  final int correctAnswerIndex;
  final String explanation;

  const QuizQuestion({
    required this.id,
    required this.question,
    required this.options,
    required this.correctAnswerIndex,
    required this.explanation,
  });

  Map<String, dynamic> toJson() => {
        'id': id,
        'question': question,
        'options': options,
        'correctAnswerIndex': correctAnswerIndex,
        'explanation': explanation,
      };

  factory QuizQuestion.fromJson(Map<String, dynamic> json) => QuizQuestion(
        id: json['id'] as String,
        question: json['question'] as String,
        options: (json['options'] as List).cast<String>(),
        correctAnswerIndex: json['correctAnswerIndex'] as int,
        explanation: json['explanation'] as String,
      );
}

class ChatMessage {
  final String role; // 'user' or 'model'
  final String text;

  const ChatMessage({required this.role, required this.text});

  Map<String, dynamic> toJson() => {'role': role, 'text': text};

  factory ChatMessage.fromJson(Map<String, dynamic> json) => ChatMessage(
        role: json['role'] as String,
        text: json['text'] as String,
      );
}

class StudySet {
  final String id;
  final String title;
  final DateTime createdAt;
  final String summary;
  final List<Flashcard> flashcards;
  final List<QuizQuestion> quiz;
  final String? originalContent;
  final ContentType contentType;
  final List<ChatMessage> chatHistory;
  final List<String> images;

  const StudySet({
    required this.id,
    required this.title,
    required this.createdAt,
    required this.summary,
    required this.flashcards,
    required this.quiz,
    this.originalContent,
    required this.contentType,
    this.chatHistory = const [],
    this.images = const [],
  });

  StudySet copyWith({
    String? summary,
    List<ChatMessage>? chatHistory,
    List<String>? images,
  }) =>
      StudySet(
        id: id,
        title: title,
        createdAt: createdAt,
        summary: summary ?? this.summary,
        flashcards: flashcards,
        quiz: quiz,
        originalContent: originalContent,
        contentType: contentType,
        chatHistory: chatHistory ?? this.chatHistory,
        images: images ?? this.images,
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'title': title,
        'createdAt': createdAt.toIso8601String(),
        'summary': summary,
        'flashcards': flashcards.map((f) => f.toJson()).toList(),
        'quiz': quiz.map((q) => q.toJson()).toList(),
        'originalContent': originalContent,
        'contentType': contentType.name,
        'chatHistory': chatHistory.map((m) => m.toJson()).toList(),
        'images': images,
      };

  factory StudySet.fromJson(Map<String, dynamic> json) => StudySet(
        id: json['id'] as String,
        title: json['title'] as String,
        createdAt: DateTime.parse(json['createdAt'] as String),
        summary: json['summary'] as String,
        flashcards: (json['flashcards'] as List)
            .map((f) => Flashcard.fromJson(f as Map<String, dynamic>))
            .toList(),
        quiz: (json['quiz'] as List)
            .map((q) => QuizQuestion.fromJson(q as Map<String, dynamic>))
            .toList(),
        originalContent: json['originalContent'] as String?,
        contentType: ContentType.values.firstWhere(
          (e) => e.name == json['contentType'],
          orElse: () => ContentType.text,
        ),
        chatHistory: (json['chatHistory'] as List? ?? [])
            .map((m) => ChatMessage.fromJson(m as Map<String, dynamic>))
            .toList(),
        images: (json['images'] as List? ?? []).cast<String>(),
      );

  static List<StudySet> listFromJson(String jsonStr) {
    final list = jsonDecode(jsonStr) as List;
    return list.map((item) => StudySet.fromJson(item as Map<String, dynamic>)).toList();
  }

  static String listToJson(List<StudySet> sets) =>
      jsonEncode(sets.map((s) => s.toJson()).toList());
}

enum ProcessingStatus { idle, analyzing, generatingFlashcards, generatingQuiz, complete, error }
