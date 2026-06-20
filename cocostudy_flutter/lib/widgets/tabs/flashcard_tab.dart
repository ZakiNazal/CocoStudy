import 'dart:math' as math;
import 'package:flutter/material.dart';
import '../../models/study_set.dart';
import '../../theme/app_theme.dart';

class FlashcardTab extends StatefulWidget {
  final StudySet studySet;

  const FlashcardTab({super.key, required this.studySet});

  @override
  State<FlashcardTab> createState() => _FlashcardTabState();
}

class _FlashcardTabState extends State<FlashcardTab>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _flipAnimation;
  bool _isFront = true;
  int _currentIndex = 0;
  bool _isAnimating = false;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 600),
    );
    _flipAnimation = Tween<double>(begin: 0, end: 1).animate(
      CurvedAnimation(parent: _controller, curve: Curves.easeInOut),
    );
  }

  @override
  void didUpdateWidget(FlashcardTab oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.studySet.id != widget.studySet.id) {
      setState(() {
        _currentIndex = 0;
        _isFront = true;
      });
      _controller.reset();
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _flip() {
    if (_isAnimating) return;
    _isAnimating = true;
    if (_isFront) {
      _controller.forward().then((_) {
        setState(() => _isFront = false);
        _isAnimating = false;
      });
    } else {
      _controller.reverse().then((_) {
        setState(() => _isFront = true);
        _isAnimating = false;
      });
    }
  }

  void _navigate(int direction) {
    if (_isAnimating) return;
    final cards = widget.studySet.flashcards;
    if (cards.isEmpty) return;
    // Reset flip
    _controller.reset();
    setState(() {
      _isFront = true;
      _currentIndex =
          (_currentIndex + direction + cards.length) % cards.length;
    });
  }

  @override
  Widget build(BuildContext context) {
    final cards = widget.studySet.flashcards;
    if (cards.isEmpty) {
      return const Center(
        child: Text('No flashcards available.',
            style: TextStyle(color: Color(0xFF9AA0B4))),
      );
    }

    final card = cards[_currentIndex];

    return Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        // Card counter
        Text(
          '${_currentIndex + 1} / ${cards.length}',
          style: const TextStyle(
            fontSize: 13,
            color: Color(0xFF9AA0B4),
            fontWeight: FontWeight.w600,
          ),
        ),
        const SizedBox(height: 24),

        // Stack effect + Card
        ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 580),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 24),
            child: Stack(
              alignment: Alignment.center,
              children: [
                // Shadow cards behind
                Positioned(
                  top: 12,
                  child: Container(
                    width: MediaQuery.of(context).size.width * 0.7,
                    height: 260,
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.5),
                      borderRadius: BorderRadius.circular(24),
                    ),
                  ),
                ),
                Positioned(
                  top: 6,
                  child: Container(
                    width: MediaQuery.of(context).size.width * 0.8,
                    height: 260,
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.7),
                      borderRadius: BorderRadius.circular(24),
                    ),
                  ),
                ),
                // Main card with 3D flip
                GestureDetector(
                  onTap: _flip,
                  child: AnimatedBuilder(
                    animation: _flipAnimation,
                    builder: (context, child) {
                      final angle = _flipAnimation.value * math.pi;
                      final isFrontVisible = angle < math.pi / 2;

                      return Transform(
                        alignment: Alignment.center,
                        transform: Matrix4.identity()
                          ..setEntry(3, 2, 0.001)
                          ..rotateY(angle),
                        child: isFrontVisible
                            ? _buildFrontFace(card)
                            : Transform(
                                alignment: Alignment.center,
                                transform: Matrix4.rotationY(math.pi),
                                child: _buildBackFace(card),
                              ),
                      );
                    },
                  ),
                ),
              ],
            ),
          ),
        ),

        const SizedBox(height: 12),
        Text(
          'Tap card to reveal answer',
          style: TextStyle(fontSize: 12, color: Colors.grey[400]),
        ),
        const SizedBox(height: 32),

        // Navigation controls
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(50),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.08),
                blurRadius: 20,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              _navButton(Icons.arrow_back_rounded, () => _navigate(-1)),
              const SizedBox(width: 32),
              Text(
                '${_currentIndex + 1}',
                style: const TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w800,
                  color: Color(0xFF1A1A2E),
                ),
              ),
              Text(
                ' / ${cards.length}',
                style: const TextStyle(
                  fontSize: 14,
                  color: Color(0xFF9AA0B4),
                ),
              ),
              const SizedBox(width: 32),
              _navButton(Icons.arrow_forward_rounded, () => _navigate(1)),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildFrontFace(Flashcard card) {
    return Container(
      width: double.infinity,
      height: 260,
      padding: const EdgeInsets.all(36),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.08),
            blurRadius: 32,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              color: AppTheme.primaryColor.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(12),
            ),
            child: const Icon(Icons.lightbulb_outline_rounded,
                color: AppTheme.primaryColor, size: 22),
          ),
          const SizedBox(height: 20),
          Text(
            card.front,
            textAlign: TextAlign.center,
            style: const TextStyle(
              fontSize: 22,
              fontWeight: FontWeight.w700,
              color: Color(0xFF1A1A2E),
              height: 1.4,
            ),
          ),
          const Spacer(),
          Text(
            'QUESTION',
            style: TextStyle(
              fontSize: 9,
              fontWeight: FontWeight.w700,
              color: Colors.grey[300],
              letterSpacing: 2,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildBackFace(Flashcard card) {
    return Container(
      width: double.infinity,
      height: 260,
      padding: const EdgeInsets.all(36),
      decoration: BoxDecoration(
        color: const Color(0xFF1A1A2E),
        borderRadius: BorderRadius.circular(24),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.2),
            blurRadius: 32,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(12),
            ),
            child: const Icon(Icons.check_circle_outline_rounded,
                color: Colors.white70, size: 22),
          ),
          const SizedBox(height: 20),
          Text(
            card.back,
            textAlign: TextAlign.center,
            style: const TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.w500,
              color: Colors.white,
              height: 1.5,
            ),
          ),
          const Spacer(),
          Text(
            'ANSWER',
            style: TextStyle(
              fontSize: 9,
              fontWeight: FontWeight.w700,
              color: Colors.white.withValues(alpha: 0.2),
              letterSpacing: 2,
            ),
          ),
        ],
      ),
    );
  }

  Widget _navButton(IconData icon, VoidCallback onTap) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(50),
      child: Padding(
        padding: const EdgeInsets.all(8),
        child: Icon(icon, color: const Color(0xFF6B7280), size: 24),
      ),
    );
  }
}
