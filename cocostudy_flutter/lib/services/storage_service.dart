import 'package:shared_preferences/shared_preferences.dart';
import '../models/study_set.dart';

class StorageService {
  static const _setsKey = 'coco_study_sets';
  static const _apiKeyKey = 'gemini_api_key';

  static Future<List<StudySet>> loadStudySets() async {
    final prefs = await SharedPreferences.getInstance();
    final json = prefs.getString(_setsKey);
    if (json == null || json.isEmpty) return [];
    try {
      return StudySet.listFromJson(json);
    } catch (_) {
      return [];
    }
  }

  static Future<void> saveStudySets(List<StudySet> sets) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_setsKey, StudySet.listToJson(sets));
  }

  static Future<String> loadApiKey() async {
    final prefs = await SharedPreferences.getInstance();
    final stored = prefs.getString(_apiKeyKey) ?? '';
    if (stored.isNotEmpty) return stored;
    return const String.fromEnvironment('API_KEY', defaultValue: '');
  }

  static Future<void> saveApiKey(String key) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_apiKeyKey, key);
  }
}
