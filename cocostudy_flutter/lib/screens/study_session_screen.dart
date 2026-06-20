import 'package:flutter/material.dart';
import '../models/study_set.dart';
import '../services/gemini_service.dart';
import '../theme/app_theme.dart';
import '../widgets/tabs/notes_tab.dart';
import '../widgets/tabs/flashcard_tab.dart';
import '../widgets/tabs/quiz_tab.dart';
import '../widgets/tabs/chat_tab.dart';

class StudySessionScreen extends StatefulWidget {
  final StudySet studySet;
  final GeminiService geminiService;
  final VoidCallback onBack;
  final void Function(StudySet updated) onUpdateSet;

  const StudySessionScreen({
    super.key,
    required this.studySet,
    required this.geminiService,
    required this.onBack,
    required this.onUpdateSet,
  });

  @override
  State<StudySessionScreen> createState() => _StudySessionScreenState();
}

class _StudySessionScreenState extends State<StudySessionScreen> {
  int _tabIndex = 0;

  static const _tabs = [
    (Icons.menu_book_rounded, 'Notes'),
    (Icons.layers_rounded, 'Flashcards'),
    (Icons.checklist_rounded, 'Quiz'),
    (Icons.auto_awesome_rounded, 'AI Tutor'),
  ];

  String _formatDate(DateTime dt) {
    final months = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];
    return '${months[dt.month - 1]} ${dt.day}, ${dt.year}';
  }

  String _labelForType(ContentType t) {
    switch (t) {
      case ContentType.audio: return 'AUDIO';
      case ContentType.document: return 'DOCUMENT';
      case ContentType.text: return 'TEXT';
    }
  }

  @override
  Widget build(BuildContext context) {
    final isWide = MediaQuery.of(context).size.width > 700;

    return Column(
      children: [
        // Header
        Container(
          padding: const EdgeInsets.fromLTRB(20, 20, 20, 0),
          child: Row(
            children: [
              // Back button
              InkWell(
                onTap: widget.onBack,
                borderRadius: BorderRadius.circular(50),
                child: Container(
                  width: 40,
                  height: 40,
                  decoration: BoxDecoration(
                    color: Colors.white,
                    shape: BoxShape.circle,
                    border: Border.all(color: const Color(0xFFEEEFF2)),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.06),
                        blurRadius: 8,
                      )
                    ],
                  ),
                  child: const Icon(Icons.arrow_back_rounded,
                      size: 18, color: Color(0xFF6B7280)),
                ),
              ),
              const SizedBox(width: 14),
              // Title + meta
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      widget.studySet.title,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w800,
                        color: Color(0xFF1A1A2E),
                        letterSpacing: -0.3,
                      ),
                    ),
                    const SizedBox(height: 3),
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 8, vertical: 2),
                          decoration: BoxDecoration(
                            color:
                                AppTheme.primaryColor.withValues(alpha: 0.1),
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: Text(
                            _labelForType(widget.studySet.contentType),
                            style: const TextStyle(
                              fontSize: 9,
                              fontWeight: FontWeight.w700,
                              color: AppTheme.primaryColor,
                              letterSpacing: 0.5,
                            ),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Text(
                          'Created ${_formatDate(widget.studySet.createdAt)}',
                          style: const TextStyle(
                              fontSize: 11, color: Color(0xFF9AA0B4)),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              // Tab navigation pill (wide screens)
              if (isWide)
                Container(
                  padding: const EdgeInsets.all(4),
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.9),
                    borderRadius: BorderRadius.circular(50),
                    border: Border.all(color: const Color(0xFFEEEFF2)),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.06),
                        blurRadius: 16,
                        offset: const Offset(0, 4),
                      ),
                    ],
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: _tabs.asMap().entries.map((e) {
                      final active = _tabIndex == e.key;
                      return GestureDetector(
                        onTap: () => setState(() => _tabIndex = e.key),
                        child: AnimatedContainer(
                          duration: const Duration(milliseconds: 200),
                          padding: const EdgeInsets.symmetric(
                              horizontal: 18, vertical: 10),
                          decoration: BoxDecoration(
                            color: active
                                ? const Color(0xFF1A1A2E)
                                : Colors.transparent,
                            borderRadius: BorderRadius.circular(50),
                          ),
                          child: Row(
                            children: [
                              Icon(
                                e.value.$1,
                                size: 15,
                                color: active
                                    ? Colors.white
                                    : const Color(0xFF9AA0B4),
                              ),
                              const SizedBox(width: 6),
                              Text(
                                e.value.$2,
                                style: TextStyle(
                                  fontSize: 13,
                                  fontWeight: FontWeight.w700,
                                  color: active
                                      ? Colors.white
                                      : const Color(0xFF9AA0B4),
                                ),
                              ),
                            ],
                          ),
                        ),
                      );
                    }).toList(),
                  ),
                ),
            ],
          ),
        ),

        // Mobile tab bar
        if (!isWide)
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
            child: SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: _tabs.asMap().entries.map((e) {
                  final active = _tabIndex == e.key;
                  return GestureDetector(
                    onTap: () => setState(() => _tabIndex = e.key),
                    child: AnimatedContainer(
                      duration: const Duration(milliseconds: 200),
                      margin: const EdgeInsets.only(right: 8),
                      padding: const EdgeInsets.symmetric(
                          horizontal: 14, vertical: 9),
                      decoration: BoxDecoration(
                        color: active
                            ? const Color(0xFF1A1A2E)
                            : Colors.white,
                        borderRadius: BorderRadius.circular(50),
                        border: Border.all(
                          color: active
                              ? Colors.transparent
                              : const Color(0xFFEEEFF2),
                        ),
                      ),
                      child: Text(
                        e.value.$2,
                        style: TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w700,
                          color: active
                              ? Colors.white
                              : const Color(0xFF9AA0B4),
                        ),
                      ),
                    ),
                  );
                }).toList(),
              ),
            ),
          ),

        const SizedBox(height: 12),

        // Tab content
        Expanded(
          child: IndexedStack(
            index: _tabIndex,
            children: [
              NotesTab(
                studySet: widget.studySet,
                onSummaryChanged: (newSummary) {
                  widget.onUpdateSet(widget.studySet.copyWith(summary: newSummary));
                },
              ),
              FlashcardTab(studySet: widget.studySet),
              QuizTab(studySet: widget.studySet),
              ChatTab(
                studySet: widget.studySet,
                geminiService: widget.geminiService,
                onHistoryChanged: (history) {
                  widget.onUpdateSet(
                      widget.studySet.copyWith(chatHistory: history));
                },
              ),
            ],
          ),
        ),
      ],
    );
  }
}
