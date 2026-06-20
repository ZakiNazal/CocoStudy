import 'package:flutter/material.dart';
import '../models/study_set.dart';
import '../theme/app_theme.dart';

class SidebarWidget extends StatelessWidget {
  final List<StudySet> savedSets;
  final String? activeSetId;
  final void Function(String id) onSelectSet;
  final VoidCallback onNewSet;

  const SidebarWidget({
    super.key,
    required this.savedSets,
    required this.activeSetId,
    required this.onSelectSet,
    required this.onNewSet,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 260,
      height: double.infinity,
      decoration: const BoxDecoration(
        color: Colors.white,
        border: Border(right: BorderSide(color: Color(0xFFEEEFF2), width: 1)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 24, 20, 20),
            child: Row(
              children: [
                Container(
                  width: 36,
                  height: 36,
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                      colors: [AppTheme.primaryColor, AppTheme.secondaryColor],
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                    ),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: const Icon(Icons.school_rounded, color: Colors.white, size: 20),
                ),
                const SizedBox(width: 10),
                const Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'CocoStudy',
                      style: TextStyle(
                        fontWeight: FontWeight.w800,
                        fontSize: 16,
                        color: Color(0xFF1A1A2E),
                        letterSpacing: -0.3,
                      ),
                    ),
                    Text(
                      'AI Study Companion',
                      style: TextStyle(fontSize: 10, color: Color(0xFF9AA0B4)),
                    ),
                  ],
                ),
              ],
            ),
          ),

          // New Set Button
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 4),
            child: InkWell(
              onTap: onNewSet,
              borderRadius: BorderRadius.circular(12),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                decoration: BoxDecoration(
                  color: AppTheme.primaryColor.withValues(alpha: 0.08),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Row(
                  children: [
                    Icon(Icons.add_circle_outline_rounded,
                        color: AppTheme.primaryColor, size: 18),
                    SizedBox(width: 10),
                    Text(
                      'New Study Set',
                      style: TextStyle(
                        color: AppTheme.primaryColor,
                        fontWeight: FontWeight.w700,
                        fontSize: 14,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),

          const SizedBox(height: 16),

          // Library Label
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20),
            child: Text(
              'LIBRARY',
              style: TextStyle(
                fontSize: 10,
                fontWeight: FontWeight.w700,
                color: Colors.grey[400],
                letterSpacing: 1.2,
              ),
            ),
          ),
          const SizedBox(height: 8),

          // Study Sets List
          Expanded(
            child: savedSets.isEmpty
                ? Padding(
                    padding: const EdgeInsets.all(20),
                    child: Text(
                      'No study sets yet.\nUpload something to get started.',
                      style: TextStyle(
                        color: Colors.grey[400],
                        fontSize: 12,
                        height: 1.5,
                      ),
                    ),
                  )
                : ListView.builder(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    itemCount: savedSets.length,
                    itemBuilder: (context, index) {
                      final set = savedSets[index];
                      final isActive = set.id == activeSetId;
                      return Padding(
                        padding: const EdgeInsets.symmetric(vertical: 2),
                        child: InkWell(
                          onTap: () => onSelectSet(set.id),
                          borderRadius: BorderRadius.circular(10),
                          child: AnimatedContainer(
                            duration: const Duration(milliseconds: 200),
                            padding: const EdgeInsets.symmetric(
                                horizontal: 14, vertical: 10),
                            decoration: BoxDecoration(
                              color: isActive
                                  ? const Color(0xFF1A1A2E)
                                  : Colors.transparent,
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: Row(
                              children: [
                                Icon(
                                  _iconForType(set.contentType),
                                  size: 14,
                                  color: isActive
                                      ? Colors.white60
                                      : Colors.grey[400],
                                ),
                                const SizedBox(width: 10),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        set.title,
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                        style: TextStyle(
                                          fontSize: 13,
                                          fontWeight: FontWeight.w600,
                                          color: isActive
                                              ? Colors.white
                                              : const Color(0xFF1A1A2E),
                                        ),
                                      ),
                                      const SizedBox(height: 1),
                                      Text(
                                        _formatDate(set.createdAt),
                                        style: TextStyle(
                                          fontSize: 10,
                                          color: isActive
                                              ? Colors.white38
                                              : Colors.grey[400],
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      );
                    },
                  ),
          ),
        ],
      ),
    );
  }

  IconData _iconForType(ContentType type) {
    switch (type) {
      case ContentType.audio:
        return Icons.music_note_rounded;
      case ContentType.document:
        return Icons.description_rounded;
      case ContentType.text:
        return Icons.text_snippet_rounded;
    }
  }

  String _formatDate(DateTime dt) {
    final months = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];
    return '${months[dt.month - 1]} ${dt.day}, ${dt.year}';
  }
}
