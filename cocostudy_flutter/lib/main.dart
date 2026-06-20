import 'package:flutter/material.dart';
import 'screens/home_screen.dart';
import 'services/storage_service.dart';
import 'theme/app_theme.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  final apiKey = await StorageService.loadApiKey();
  runApp(CocoStudyApp(initialApiKey: apiKey));
}

class CocoStudyApp extends StatefulWidget {
  final String initialApiKey;
  const CocoStudyApp({super.key, required this.initialApiKey});

  @override
  State<CocoStudyApp> createState() => _CocoStudyAppState();
}

class _CocoStudyAppState extends State<CocoStudyApp> {
  late String _apiKey;

  @override
  void initState() {
    super.initState();
    _apiKey = widget.initialApiKey;
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'CocoStudy AI',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.theme,
      home: HomeScreen(
        apiKey: _apiKey,
        onApiKeyChanged: (key) => setState(() => _apiKey = key),
      ),
    );
  }
}
