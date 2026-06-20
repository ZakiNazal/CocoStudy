import 'package:flutter/material.dart';
import 'package:flutter_markdown/flutter_markdown.dart';
import '../../models/study_set.dart';
import '../../theme/app_theme.dart';

class NotesTab extends StatefulWidget {
  final StudySet studySet;
  final void Function(String newSummary) onSummaryChanged;

  const NotesTab({
    super.key,
    required this.studySet,
    required this.onSummaryChanged,
  });

  @override
  State<NotesTab> createState() => _NotesTabState();
}

class _NotesTabState extends State<NotesTab> {
  bool _isEditing = false;
  late TextEditingController _editController;

  @override
  void initState() {
    super.initState();
    _editController = TextEditingController(text: widget.studySet.summary);
  }

  @override
  void didUpdateWidget(NotesTab oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.studySet.id != widget.studySet.id) {
      _editController.text = widget.studySet.summary;
      _isEditing = false;
    }
  }

  @override
  void dispose() {
    _editController.dispose();
    super.dispose();
  }

  void _save() {
    widget.onSummaryChanged(_editController.text);
    setState(() => _isEditing = false);
  }

  void _cancel() {
    _editController.text = widget.studySet.summary;
    setState(() => _isEditing = false);
  }

  void _insertMarkdown(String prefix, [String suffix = '']) {
    final text = _editController.text;
    final sel = _editController.selection;
    final start = sel.baseOffset.clamp(0, text.length);
    final end = sel.extentOffset.clamp(0, text.length);
    final selected = text.substring(start, end);
    final newText = text.substring(0, start) +
        prefix +
        selected +
        suffix +
        text.substring(end);
    _editController.value = TextEditingValue(
      text: newText,
      selection: TextSelection.collapsed(offset: start + prefix.length + selected.length + suffix.length),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.05),
            blurRadius: 20,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      clipBehavior: Clip.hardEdge,
      child: Column(
        children: [
          // Top accent bar
          Container(
            height: 3,
            decoration: const BoxDecoration(
              gradient: LinearGradient(
                colors: [AppTheme.primaryColor, AppTheme.secondaryColor],
              ),
            ),
          ),
          // Toolbar
          Padding(
            padding: const EdgeInsets.fromLTRB(24, 20, 24, 0),
            child: Row(
              children: [
                const Text(
                  'Study Notes',
                  style: TextStyle(
                    fontSize: 22,
                    fontWeight: FontWeight.w800,
                    color: Color(0xFF1A1A2E),
                    letterSpacing: -0.5,
                  ),
                ),
                const Spacer(),
                if (_isEditing) ...[
                  _toolbarButton(Icons.format_bold, () => _insertMarkdown('**', '**'), 'Bold'),
                  _toolbarButton(Icons.format_italic, () => _insertMarkdown('*', '*'), 'Italic'),
                  _toolbarButton(Icons.format_list_bulleted, () => _insertMarkdown('\n- '), 'List'),
                  _toolbarButton(Icons.check_box_outline_blank, () => _insertMarkdown('\n- [ ] '), 'Checkbox'),
                  const SizedBox(width: 8),
                  TextButton(
                    onPressed: _cancel,
                    child: const Text('Cancel', style: TextStyle(color: Color(0xFF6B7280))),
                  ),
                  const SizedBox(width: 8),
                  FilledButton.icon(
                    onPressed: _save,
                    icon: const Icon(Icons.save_rounded, size: 16),
                    label: const Text('Save'),
                    style: FilledButton.styleFrom(
                      backgroundColor: const Color(0xFF1A1A2E),
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                    ),
                  ),
                ] else ...[
                  OutlinedButton.icon(
                    onPressed: () => setState(() => _isEditing = true),
                    icon: const Icon(Icons.edit_rounded, size: 15),
                    label: const Text('Edit'),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: const Color(0xFF6B7280),
                      side: const BorderSide(color: Color(0xFFDDE0E8)),
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                    ),
                  ),
                ],
              ],
            ),
          ),
          const SizedBox(height: 16),
          const Divider(height: 1, color: Color(0xFFEEEFF2)),
          // Content
          Expanded(
            child: _isEditing
                ? Padding(
                    padding: const EdgeInsets.all(20),
                    child: TextField(
                      controller: _editController,
                      maxLines: null,
                      expands: true,
                      textAlignVertical: TextAlignVertical.top,
                      style: const TextStyle(
                        fontFamily: 'monospace',
                        fontSize: 13,
                        height: 1.7,
                        color: Color(0xFF374151),
                      ),
                      decoration: InputDecoration(
                        hintText: 'Start typing your notes...',
                        filled: true,
                        fillColor: const Color(0xFFF7F8FA),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                          borderSide: BorderSide.none,
                        ),
                        focusedBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                          borderSide:
                              const BorderSide(color: AppTheme.primaryColor, width: 2),
                        ),
                        contentPadding: const EdgeInsets.all(16),
                      ),
                    ),
                  )
                : Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
                    child: Markdown(
                      data: widget.studySet.summary,
                      selectable: true,
                      styleSheet: MarkdownStyleSheet(
                        h1: const TextStyle(
                          fontSize: 26,
                          fontWeight: FontWeight.w800,
                          color: Color(0xFF1A1A2E),
                          height: 1.3,
                        ),
                        h2: const TextStyle(
                          fontSize: 20,
                          fontWeight: FontWeight.w700,
                          color: Color(0xFF1A1A2E),
                          height: 1.4,
                        ),
                        h3: const TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w700,
                          color: Color(0xFF374151),
                        ),
                        p: const TextStyle(
                          fontSize: 14,
                          color: Color(0xFF4B5563),
                          height: 1.7,
                        ),
                        listBullet: const TextStyle(
                          fontSize: 14,
                          color: Color(0xFF4B5563),
                          height: 1.7,
                        ),
                        strong: const TextStyle(
                          fontWeight: FontWeight.w700,
                          color: AppTheme.primaryColor,
                        ),
                        code: const TextStyle(
                          fontFamily: 'monospace',
                          fontSize: 12,
                          backgroundColor: Color(0xFFF0F4FF),
                          color: AppTheme.primaryDark,
                        ),
                        codeblockDecoration: BoxDecoration(
                          color: const Color(0xFFF0F4FF),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        blockquoteDecoration: BoxDecoration(
                          border: const Border(
                            left: BorderSide(
                              color: AppTheme.primaryColor,
                              width: 4,
                            ),
                          ),
                          color: const Color(0xFFF7F9FF),
                          borderRadius: const BorderRadius.only(
                            topRight: Radius.circular(8),
                            bottomRight: Radius.circular(8),
                          ),
                        ),
                      ),
                    ),
                  ),
          ),
        ],
      ),
    );
  }

  Widget _toolbarButton(IconData icon, VoidCallback onTap, String tooltip) {
    return Tooltip(
      message: tooltip,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(8),
        child: Padding(
          padding: const EdgeInsets.all(8),
          child: Icon(icon, size: 18, color: const Color(0xFF6B7280)),
        ),
      ),
    );
  }
}
