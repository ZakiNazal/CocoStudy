import 'dart:typed_data';
import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import '../models/study_set.dart';
import '../theme/app_theme.dart';

typedef ProcessCallback = Future<void> Function({
  String? text,
  Uint8List? fileBytes,
  String? fileName,
  String? mimeType,
  required ContentType contentType,
});

class UploadArea extends StatefulWidget {
  final ProcessCallback onProcess;
  final ProcessingStatus status;

  const UploadArea({super.key, required this.onProcess, required this.status});

  @override
  State<UploadArea> createState() => _UploadAreaState();
}

class _UploadAreaState extends State<UploadArea> {
  bool _showTextInput = false;
  final _textController = TextEditingController();
  final bool _isDragging = false;

  @override
  void dispose() {
    _textController.dispose();
    super.dispose();
  }

  bool get _isLoading =>
      widget.status != ProcessingStatus.idle &&
      widget.status != ProcessingStatus.complete &&
      widget.status != ProcessingStatus.error;

  Future<void> _pickFile() async {
    final result = await FilePicker.platform.pickFiles(
      type: FileType.custom,
      allowedExtensions: ['pdf', 'docx', 'pptx', 'doc', 'ppt', 'mp3', 'wav', 'mp4', 'm4a', 'ogg'],
      withData: true,
    );
    if (result == null || result.files.isEmpty) return;
    final file = result.files.first;
    final bytes = file.bytes;
    if (bytes == null) return;
    _processFile(bytes, file.name, file.extension ?? '');
  }

  void _processFile(Uint8List bytes, String name, String ext) {
    final lower = ext.toLowerCase();
    ContentType contentType;
    String mimeType;

    if (['mp3', 'wav', 'm4a', 'ogg', 'aac', 'flac'].contains(lower)) {
      contentType = ContentType.audio;
      mimeType = 'audio/${lower == 'm4a' ? 'mp4' : lower}';
    } else if (['mp4', 'mov', 'avi', 'mkv'].contains(lower)) {
      contentType = ContentType.audio;
      mimeType = 'video/$lower';
    } else if (lower == 'pdf') {
      contentType = ContentType.document;
      mimeType = 'application/pdf';
    } else if (['docx', 'doc'].contains(lower)) {
      contentType = ContentType.document;
      mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    } else if (['pptx', 'ppt'].contains(lower)) {
      contentType = ContentType.document;
      mimeType = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
    } else {
      _showError('Unsupported file type. Please upload PDF, Word, PowerPoint, or audio files.');
      return;
    }

    widget.onProcess(
      fileBytes: bytes,
      fileName: name,
      mimeType: mimeType,
      contentType: contentType,
    );
  }

  void _submitText() {
    final text = _textController.text.trim();
    if (text.isEmpty) return;
    widget.onProcess(text: text, contentType: ContentType.text);
  }

  void _showError(String msg) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(msg), backgroundColor: Colors.red[400]),
    );
  }

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      child: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 760),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 48),
            child: Column(
              children: [
                // Header
                _buildHeader(),
                const SizedBox(height: 40),
                // Main Card
                _buildMainCard(),
                const SizedBox(height: 48),
                // Feature Highlights
                _buildFeatureHighlights(),
                const SizedBox(height: 32),
                Text(
                  'Powered by Google Gemini AI • CocoStudy AI',
                  style: TextStyle(fontSize: 12, color: Colors.grey[400]),
                ),
                const SizedBox(height: 32),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildHeader() {
    return Column(
      children: [
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(24),
            border: Border.all(color: const Color(0xFFEEEFF2)),
          ),
          child: const Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(Icons.auto_awesome_rounded, size: 14, color: AppTheme.primaryColor),
              SizedBox(width: 6),
              Text(
                'AI-Powered Study Companion',
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w700,
                  color: Color(0xFF6B7280),
                  letterSpacing: 0.5,
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 20),
        RichText(
          textAlign: TextAlign.center,
          text: const TextSpan(
            style: TextStyle(
              fontSize: 36,
              fontWeight: FontWeight.w800,
              color: Color(0xFF1A1A2E),
              height: 1.2,
              letterSpacing: -1,
            ),
            children: [
              TextSpan(text: 'What are we\n'),
              TextSpan(
                text: 'mastering',
                style: TextStyle(color: AppTheme.primaryColor),
              ),
              TextSpan(text: ' today?'),
            ],
          ),
        ),
        const SizedBox(height: 16),
        const Text(
          'Upload your lecture notes, recordings, or slides.\nGemini AI will transform them into summaries, quizzes, and flashcards.',
          textAlign: TextAlign.center,
          style: TextStyle(
            fontSize: 15,
            color: Color(0xFF6B7280),
            height: 1.6,
          ),
        ),
      ],
    );
  }

  Widget _buildMainCard() {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.06),
            blurRadius: 32,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Column(
        children: [
          // Tab switcher
          Padding(
            padding: const EdgeInsets.all(8),
            child: Container(
              decoration: BoxDecoration(
                color: const Color(0xFFF3F4F6),
                borderRadius: BorderRadius.circular(16),
              ),
              child: Row(
                children: [
                  _tabButton('Upload File', Icons.upload_file_rounded, !_showTextInput, () {
                    setState(() => _showTextInput = false);
                  }),
                  _tabButton('Paste Text', Icons.text_fields_rounded, _showTextInput, () {
                    setState(() => _showTextInput = true);
                  }),
                ],
              ),
            ),
          ),
          // Content
          Padding(
            padding: const EdgeInsets.fromLTRB(24, 8, 24, 24),
            child: _isLoading ? _buildLoadingState() : _buildInputContent(),
          ),
        ],
      ),
    );
  }

  Widget _tabButton(String label, IconData icon, bool active, VoidCallback onTap) {
    return Expanded(
      child: GestureDetector(
        onTap: onTap,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 200),
          margin: const EdgeInsets.all(4),
          padding: const EdgeInsets.symmetric(vertical: 12),
          decoration: BoxDecoration(
            color: active ? Colors.white : Colors.transparent,
            borderRadius: BorderRadius.circular(12),
            boxShadow: active
                ? [BoxShadow(color: Colors.black.withValues(alpha: 0.06), blurRadius: 8)]
                : null,
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(icon, size: 16, color: active ? AppTheme.primaryColor : Colors.grey[500]),
              const SizedBox(width: 8),
              Text(
                label,
                style: TextStyle(
                  fontWeight: FontWeight.w700,
                  fontSize: 13,
                  color: active ? const Color(0xFF1A1A2E) : Colors.grey[500],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildLoadingState() {
    String message;
    switch (widget.status) {
      case ProcessingStatus.analyzing:
        message = 'Reading your materials...';
        break;
      case ProcessingStatus.generatingFlashcards:
        message = 'Creating flashcards...';
        break;
      case ProcessingStatus.generatingQuiz:
        message = 'Drafting the final quiz...';
        break;
      default:
        message = 'Processing...';
    }
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 48),
      child: Column(
        children: [
          SizedBox(
            width: 64,
            height: 64,
            child: Stack(
              alignment: Alignment.center,
              children: [
                const CircularProgressIndicator(
                  color: AppTheme.primaryColor,
                  strokeWidth: 3,
                ),
                const Icon(Icons.auto_awesome_rounded,
                    color: AppTheme.primaryColor, size: 24),
              ],
            ),
          ),
          const SizedBox(height: 24),
          Text(
            message,
            style: const TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.w700,
              color: Color(0xFF1A1A2E),
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'This usually takes about 10–20 seconds.',
            style: TextStyle(fontSize: 13, color: Colors.grey[500]),
          ),
        ],
      ),
    );
  }

  Widget _buildInputContent() {
    if (_showTextInput) return _buildTextInput();
    return _buildDropZone();
  }

  Widget _buildDropZone() {
    return GestureDetector(
      onTap: _pickFile,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(vertical: 48, horizontal: 24),
        decoration: BoxDecoration(
          color: _isDragging
              ? AppTheme.primaryColor.withValues(alpha: 0.04)
              : const Color(0xFFFAFAFC),
          border: Border.all(
            color: _isDragging
                ? AppTheme.primaryColor
                : const Color(0xFFDDE0E8),
            width: 2,
            strokeAlign: BorderSide.strokeAlignInside,
          ),
          borderRadius: BorderRadius.circular(18),
        ),
        child: Column(
          children: [
            Container(
              width: 72,
              height: 72,
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [
                    AppTheme.primaryColor.withValues(alpha: 0.1),
                    AppTheme.secondaryColor.withValues(alpha: 0.1),
                  ],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.upload_file_rounded,
                  size: 36, color: AppTheme.primaryColor),
            ),
            const SizedBox(height: 20),
            const Text(
              'Click to upload a file',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w700,
                color: Color(0xFF1A1A2E),
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'Supports PDF, PowerPoint, Word, and Audio files',
              style: TextStyle(fontSize: 13, color: Colors.grey[500]),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 24),
            Wrap(
              alignment: WrapAlignment.center,
              spacing: 8,
              runSpacing: 8,
              children: [
                _fileChip('PDF', Icons.picture_as_pdf_rounded, Colors.red),
                _fileChip('MP3', Icons.music_note_rounded, Colors.purple),
                _fileChip('DOCX', Icons.description_rounded, Colors.blue),
                _fileChip('PPTX', Icons.slideshow_rounded, Colors.orange),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _fileChip(String label, IconData icon, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: const Color(0xFFEEEFF2)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.04),
            blurRadius: 4,
          )
        ],
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 13, color: color),
          const SizedBox(width: 5),
          Text(label,
              style: const TextStyle(
                  fontSize: 12, fontWeight: FontWeight.w600, color: Color(0xFF6B7280))),
        ],
      ),
    );
  }

  Widget _buildTextInput() {
    return Column(
      children: [
        TextField(
          controller: _textController,
          maxLines: 8,
          style: const TextStyle(fontSize: 14, height: 1.6),
          decoration: InputDecoration(
            hintText: 'Paste your notes here...\n\nOr any text you want to learn from. Markdown is supported.',
            hintStyle: TextStyle(color: Colors.grey[400], fontSize: 14, height: 1.6),
            filled: true,
            fillColor: const Color(0xFFF7F8FA),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(16),
              borderSide: BorderSide.none,
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(16),
              borderSide:
                  const BorderSide(color: AppTheme.primaryColor, width: 2),
            ),
            contentPadding: const EdgeInsets.all(20),
          ),
        ),
        const SizedBox(height: 16),
        SizedBox(
          width: double.infinity,
          child: ElevatedButton(
            onPressed: _submitText,
            child: const Text('Generate Study Set'),
          ),
        ),
      ],
    );
  }

  Widget _buildFeatureHighlights() {
    return Row(
      children: [
        _featureCard(
          Icons.auto_awesome_rounded,
          'Smart Summaries',
          'Converts clutter into clear, structured notes.',
          Colors.green,
        ),
        const SizedBox(width: 16),
        _featureCard(
          Icons.school_rounded,
          'Active Recall',
          'Auto-generated flashcards for better retention.',
          Colors.purple,
        ),
        const SizedBox(width: 16),
        _featureCard(
          Icons.file_present_rounded,
          'Multi-Format',
          'Upload slides, docs, or audio lectures.',
          Colors.orange,
        ),
      ],
    );
  }

  Widget _featureCard(IconData icon, String title, String desc, Color color) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(18),
        decoration: BoxDecoration(
          color: Colors.white.withValues(alpha: 0.7),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: const Color(0xFFEEEFF2)),
        ),
        child: Column(
          children: [
            Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                color: color.withValues(alpha: 0.12),
                shape: BoxShape.circle,
              ),
              child: Icon(icon, size: 18, color: color),
            ),
            const SizedBox(height: 10),
            Text(
              title,
              textAlign: TextAlign.center,
              style: const TextStyle(
                fontWeight: FontWeight.w700,
                fontSize: 13,
                color: Color(0xFF1A1A2E),
              ),
            ),
            const SizedBox(height: 4),
            Text(
              desc,
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 11, color: Colors.grey[500], height: 1.4),
            ),
          ],
        ),
      ),
    );
  }
}
