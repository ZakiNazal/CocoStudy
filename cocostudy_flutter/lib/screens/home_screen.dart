import 'dart:typed_data';
import 'package:flutter/material.dart';
import '../models/study_set.dart';
import '../services/gemini_service.dart';
import '../services/storage_service.dart';
import '../theme/app_theme.dart';
import '../widgets/sidebar_widget.dart';
import '../widgets/upload_area.dart';
import 'study_session_screen.dart';

class HomeScreen extends StatefulWidget {
  final String apiKey;
  final void Function(String newKey) onApiKeyChanged;

  const HomeScreen({
    super.key,
    required this.apiKey,
    required this.onApiKeyChanged,
  });

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  List<StudySet> _savedSets = [];
  String? _activeSetId;
  ProcessingStatus _status = ProcessingStatus.idle;
  bool _isSidebarOpen = false;
  late GeminiService _geminiService;

  @override
  void initState() {
    super.initState();
    _geminiService = GeminiService(widget.apiKey);
    _loadSets();
  }

  @override
  void didUpdateWidget(HomeScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.apiKey != widget.apiKey) {
      _geminiService = GeminiService(widget.apiKey);
    }
  }

  Future<void> _loadSets() async {
    final sets = await StorageService.loadStudySets();
    if (mounted) setState(() => _savedSets = sets);
  }

  Future<void> _saveSets() async {
    await StorageService.saveStudySets(_savedSets);
  }

  StudySet? get _activeSet =>
      _savedSets.cast<StudySet?>().firstWhere(
        (s) => s?.id == _activeSetId,
        orElse: () => null,
      );

  void _updateSet(StudySet updated) {
    setState(() {
      _savedSets = _savedSets.map((s) => s.id == updated.id ? updated : s).toList();
    });
    _saveSets();
  }

  Future<void> _processContent({
    String? text,
    Uint8List? fileBytes,
    String? fileName,
    String? mimeType,
    required ContentType contentType,
  }) async {
    if (widget.apiKey.isEmpty) {
      _showApiKeyDialog();
      return;
    }

    setState(() => _status = ProcessingStatus.analyzing);

    try {
      String summary;
      String? originalContent;

      if (fileBytes != null && mimeType != null) {
        final lowerName = fileName?.toLowerCase() ?? '';

        if (lowerName.endsWith('.docx') || lowerName.endsWith('.doc')) {
          originalContent = await GeminiService.extractTextFromDocx(fileBytes);
          summary = await _geminiService.generateSummary(text: originalContent);
        } else if (lowerName.endsWith('.pptx') || lowerName.endsWith('.ppt')) {
          originalContent = await GeminiService.extractTextFromPptx(fileBytes);
          summary = await _geminiService.generateSummary(text: originalContent);
        } else {
          summary = await _geminiService.generateSummary(
            fileBytes: fileBytes,
            mimeType: mimeType,
          );
        }
      } else if (text != null) {
        originalContent = text;
        summary = await _geminiService.generateSummary(text: text);
      } else {
        throw Exception('No content provided.');
      }

      setState(() => _status = ProcessingStatus.generatingFlashcards);
      final flashcards = await _geminiService.generateFlashcards(summary);

      setState(() => _status = ProcessingStatus.generatingQuiz);
      final quiz = await _geminiService.generateQuiz(summary);

      final newSet = StudySet(
        id: DateTime.now().millisecondsSinceEpoch.toString(),
        title: GeminiService.extractTitleFromMarkdown(summary),
        createdAt: DateTime.now(),
        summary: summary,
        flashcards: flashcards,
        quiz: quiz,
        originalContent: originalContent,
        contentType: contentType,
        chatHistory: const [],
        images: const [],
      );

      setState(() {
        _savedSets = [newSet, ..._savedSets];
        _activeSetId = newSet.id;
        _status = ProcessingStatus.complete;
      });
      await _saveSets();
    } catch (e) {
      setState(() => _status = ProcessingStatus.error);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error: ${e.toString()}'),
            backgroundColor: Colors.red[400],
            duration: const Duration(seconds: 5),
          ),
        );
        setState(() => _status = ProcessingStatus.idle);
      }
    }
  }

  void _showApiKeyDialog() {
    final controller = TextEditingController(text: widget.apiKey);
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text(
          'Gemini API Key',
          style: TextStyle(fontWeight: FontWeight.w800),
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Enter your Google Gemini API key to use CocoStudy AI.',
              style: TextStyle(fontSize: 13, color: Color(0xFF6B7280)),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: controller,
              obscureText: true,
              decoration: const InputDecoration(
                labelText: 'API Key',
                prefixIcon: Icon(Icons.key_rounded),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () async {
              final key = controller.text.trim();
              if (key.isNotEmpty) {
                await StorageService.saveApiKey(key);
                widget.onApiKeyChanged(key);
              }
              if (context.mounted) Navigator.pop(context);
            },
            style: FilledButton.styleFrom(
                backgroundColor: const Color(0xFF1A1A2E)),
            child: const Text('Save'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isWide = MediaQuery.of(context).size.width > 700;
    final activeSet = _activeSet;

    return Scaffold(
      backgroundColor: AppTheme.backgroundColor,
      body: Stack(
        children: [
          Row(
            children: [
              // Sidebar (wide screens only)
              if (isWide)
                SidebarWidget(
                  savedSets: _savedSets,
                  activeSetId: _activeSetId,
                  onSelectSet: (id) => setState(() => _activeSetId = id),
                  onNewSet: () => setState(() => _activeSetId = null),
                ),
              // Main content
              Expanded(
                child: Column(
                  children: [
                    // Top bar with menu + settings
                    Padding(
                      padding: EdgeInsets.fromLTRB(
                          isWide ? 24 : 16, 16, 16, 0),
                      child: Row(
                        children: [
                          if (!isWide)
                            IconButton(
                              onPressed: () =>
                                  setState(() => _isSidebarOpen = true),
                              icon: const Icon(Icons.menu_rounded),
                              color: const Color(0xFF6B7280),
                            ),
                          if (!isWide) const Spacer(),
                          // API key indicator
                          if (widget.apiKey.isEmpty)
                            TextButton.icon(
                              onPressed: _showApiKeyDialog,
                              icon: const Icon(Icons.warning_amber_rounded,
                                  size: 16, color: Colors.orange),
                              label: const Text(
                                'Set API Key',
                                style: TextStyle(
                                    color: Colors.orange, fontSize: 13),
                              ),
                            )
                          else
                            const Spacer(),
                          IconButton(
                            onPressed: _showApiKeyDialog,
                            icon: const Icon(Icons.settings_rounded, size: 20),
                            color: const Color(0xFF9AA0B4),
                            tooltip: 'Settings / API Key',
                          ),
                        ],
                      ),
                    ),
                    // Page content
                    Expanded(
                      child: activeSet != null
                          ? StudySessionScreen(
                              studySet: activeSet,
                              geminiService: _geminiService,
                              onBack: () =>
                                  setState(() => _activeSetId = null),
                              onUpdateSet: _updateSet,
                            )
                          : UploadArea(
                              onProcess: _processContent,
                              status: _status,
                            ),
                    ),
                  ],
                ),
              ),
            ],
          ),

          // Mobile drawer overlay
          if (!isWide && _isSidebarOpen) ...[
            GestureDetector(
              onTap: () => setState(() => _isSidebarOpen = false),
              child: Container(
                color: Colors.black.withValues(alpha: 0.3),
              ),
            ),
            AnimatedSlide(
              duration: const Duration(milliseconds: 280),
              offset: Offset.zero,
              curve: Curves.easeOut,
              child: SidebarWidget(
                savedSets: _savedSets,
                activeSetId: _activeSetId,
                onSelectSet: (id) {
                  setState(() {
                    _activeSetId = id;
                    _isSidebarOpen = false;
                  });
                },
                onNewSet: () {
                  setState(() {
                    _activeSetId = null;
                    _isSidebarOpen = false;
                  });
                },
              ),
            ),
          ],
        ],
      ),
    );
  }
}
