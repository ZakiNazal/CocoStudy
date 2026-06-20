import 'package:flutter/material.dart';
import '../../models/study_set.dart';

class QuizTab extends StatefulWidget {
  final StudySet studySet;

  const QuizTab({super.key, required this.studySet});

  @override
  State<QuizTab> createState() => _QuizTabState();
}

class _QuizTabState extends State<QuizTab> {
  late List<int> _answers;
  bool _showResults = false;

  @override
  void initState() {
    super.initState();
    _resetQuiz();
  }

  @override
  void didUpdateWidget(QuizTab oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.studySet.id != widget.studySet.id) {
      _resetQuiz();
    }
  }

  void _resetQuiz() {
    _answers = List.filled(widget.studySet.quiz.length, -1);
    _showResults = false;
  }

  int get _score => _answers.asMap().entries
      .where((e) => e.value == widget.studySet.quiz[e.key].correctAnswerIndex)
      .length;

  bool get _allAnswered => !_answers.contains(-1);

  @override
  Widget build(BuildContext context) {
    final quiz = widget.studySet.quiz;
    if (quiz.isEmpty) {
      return const Center(
        child: Text('No quiz available.',
            style: TextStyle(color: Color(0xFF9AA0B4))),
      );
    }

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        if (_showResults) _buildResultsBanner(quiz.length),
        ...quiz.asMap().entries.map((e) => _buildQuestion(e.key, e.value)),
        if (!_showResults)
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 16),
            child: ElevatedButton(
              onPressed: _allAnswered
                  ? () => setState(() => _showResults = true)
                  : null,
              child: const Text('Submit Answers'),
            ),
          ),
        const SizedBox(height: 40),
      ],
    );
  }

  Widget _buildResultsBanner(int total) {
    final pct = (_score / total * 100).round();
    final isGood = pct >= 60;

    return Container(
      margin: const EdgeInsets.only(bottom: 20),
      padding: const EdgeInsets.all(28),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: isGood
              ? [const Color(0xFFECFDF5), const Color(0xFFD1FAE5)]
              : [const Color(0xFFFFF7ED), const Color(0xFFFEE2CC)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: isGood ? const Color(0xFF6EE7B7) : const Color(0xFFFBBF24),
        ),
      ),
      child: Column(
        children: [
          Container(
            width: 72,
            height: 72,
            decoration: BoxDecoration(
              color: Colors.white,
              shape: BoxShape.circle,
              boxShadow: [
                BoxShadow(
                  color: (isGood ? Colors.green : Colors.orange)
                      .withValues(alpha: 0.2),
                  blurRadius: 12,
                )
              ],
            ),
            child: Icon(
              Icons.school_rounded,
              size: 36,
              color: isGood ? Colors.green[600] : Colors.orange[700],
            ),
          ),
          const SizedBox(height: 16),
          const Text(
            'Quiz Complete!',
            style: TextStyle(
              fontSize: 24,
              fontWeight: FontWeight.w800,
              color: Color(0xFF1A1A2E),
            ),
          ),
          const SizedBox(height: 8),
          RichText(
            text: TextSpan(
              style: const TextStyle(fontSize: 15, color: Color(0xFF6B7280)),
              children: [
                const TextSpan(text: 'You scored '),
                TextSpan(
                  text: '$_score',
                  style: TextStyle(
                    fontWeight: FontWeight.w800,
                    fontSize: 22,
                    color: isGood ? Colors.green[700] : Colors.orange[700],
                  ),
                ),
                TextSpan(text: ' / $total ($pct%)'),
              ],
            ),
          ),
          const SizedBox(height: 20),
          OutlinedButton.icon(
            onPressed: () => setState(_resetQuiz),
            icon: const Icon(Icons.refresh_rounded, size: 16),
            label: const Text('Retry Quiz'),
            style: OutlinedButton.styleFrom(
              foregroundColor: isGood ? Colors.green[700] : Colors.orange[700],
              side: BorderSide(
                  color: isGood ? Colors.green[400]! : Colors.orange[400]!),
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildQuestion(int qIdx, QuizQuestion question) {
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.04),
            blurRadius: 12,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 32,
                height: 32,
                margin: const EdgeInsets.only(right: 12, top: 2),
                decoration: BoxDecoration(
                  color: const Color(0xFF1A1A2E),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Center(
                  child: Text(
                    '${qIdx + 1}',
                    style: const TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.w700,
                      fontSize: 13,
                    ),
                  ),
                ),
              ),
              Expanded(
                child: Text(
                  question.question,
                  style: const TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w700,
                    color: Color(0xFF1A1A2E),
                    height: 1.5,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          ...question.options.asMap().entries.map(
            (opt) => _buildOption(qIdx, opt.key, opt.value, question),
          ),
          if (_showResults)
            Container(
              margin: const EdgeInsets.only(top: 12),
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: const Color(0xFFEFF6FF),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: const Color(0xFFBFDBFE)),
              ),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Icon(Icons.lightbulb_rounded,
                      size: 18, color: Color(0xFF3B82F6)),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Explanation',
                          style: TextStyle(
                            fontWeight: FontWeight.w700,
                            fontSize: 12,
                            color: Color(0xFF3B82F6),
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          question.explanation,
                          style: const TextStyle(
                            fontSize: 13,
                            color: Color(0xFF1E40AF),
                            height: 1.5,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildOption(
      int qIdx, int oIdx, String option, QuizQuestion question) {
    final selected = _answers[qIdx] == oIdx;
    final correct = oIdx == question.correctAnswerIndex;

    Color borderColor = const Color(0xFFDDE0E8);
    Color bgColor = Colors.white;
    Color textColor = const Color(0xFF374151);
    Widget? trailing;

    if (_showResults) {
      if (correct) {
        borderColor = const Color(0xFF34D399);
        bgColor = const Color(0xFFECFDF5);
        textColor = const Color(0xFF065F46);
        trailing = const Icon(Icons.check_circle_rounded,
            color: Color(0xFF34D399), size: 18);
      } else if (selected) {
        borderColor = const Color(0xFFF87171);
        bgColor = const Color(0xFFFEF2F2);
        textColor = const Color(0xFF991B1B);
        trailing = const Icon(Icons.cancel_rounded,
            color: Color(0xFFF87171), size: 18);
      } else {
        textColor = const Color(0xFF9AA0B4);
      }
    } else if (selected) {
      borderColor = const Color(0xFF1A1A2E);
      bgColor = const Color(0xFF1A1A2E);
      textColor = Colors.white;
    }

    return GestureDetector(
      onTap: _showResults
          ? null
          : () => setState(() => _answers[qIdx] = oIdx),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        margin: const EdgeInsets.symmetric(vertical: 4),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        decoration: BoxDecoration(
          color: bgColor,
          border: Border.all(color: borderColor, width: 2),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Row(
          children: [
            Expanded(
              child: Text(
                option,
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w500,
                  color: textColor,
                ),
              ),
            ),
            if (trailing != null) trailing,
          ],
        ),
      ),
    );
  }
}
