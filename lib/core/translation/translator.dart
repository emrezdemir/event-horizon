import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_mlkit_language_id/google_mlkit_language_id.dart';
import 'package:google_mlkit_translation/google_mlkit_translation.dart';

/// MLKit ile cihaz üstü çeviri. Model yoksa otomatik indirir (ilk kullanımda
/// ~30MB). Hedef dil sabit: Türkçe.
class Translator {
  final _languageId = LanguageIdentifier(confidenceThreshold: 0.5);
  final _modelManager = OnDeviceTranslatorModelManager();
  final Map<String, OnDeviceTranslator> _cache = {};

  static const _target = TranslateLanguage.turkish;

  Future<String?> identifyLanguage(String text) async {
    if (text.trim().isEmpty) return null;
    final code = await _languageId.identifyLanguage(text);
    if (code == 'und') return null;
    return code;
  }

  /// Dili tespit eder, Türkçe değilse çevirir. Model hazır değilse
  /// [downloadIfMissing] true ise indirir; false ise null döner.
  Future<TranslationResult> translateToTurkish(
    String text, {
    bool downloadIfMissing = true,
    bool requireWifi = true,
  }) async {
    final trimmed = text.trim();
    if (trimmed.isEmpty) return const TranslationResult(source: null, text: null);

    final code = await identifyLanguage(trimmed);
    if (code == null) return const TranslationResult(source: null, text: null);
    if (code == 'tr') {
      return TranslationResult(source: 'tr', text: trimmed);
    }

    final sourceLang = BCP47Code.fromRawValue(code);
    if (sourceLang == null) return TranslationResult(source: code, text: null);

    final key = '$code->tr';
    var translator = _cache[key];
    if (translator == null) {
      final downloaded = await _modelManager.isModelDownloaded(sourceLang.bcpCode);
      if (!downloaded) {
        if (!downloadIfMissing) {
          return TranslationResult(source: code, text: null, needsModel: true);
        }
        await _modelManager.downloadModel(sourceLang.bcpCode, isWifiRequired: requireWifi);
      }
      translator = OnDeviceTranslator(
        sourceLanguage: sourceLang,
        targetLanguage: _target,
      );
      _cache[key] = translator;
    }

    final translated = await translator.translateText(trimmed);
    return TranslationResult(source: code, text: translated);
  }

  Future<bool> isTurkishModelReady() async {
    return _modelManager.isModelDownloaded(TranslateLanguage.turkish.bcpCode);
  }

  Future<void> ensureTurkishModel({bool requireWifi = true}) async {
    final has = await isTurkishModelReady();
    if (!has) {
      await _modelManager.downloadModel(
        TranslateLanguage.turkish.bcpCode,
        isWifiRequired: requireWifi,
      );
    }
  }

  Future<void> dispose() async {
    for (final t in _cache.values) {
      await t.close();
    }
    _cache.clear();
    await _languageId.close();
  }
}

class TranslationResult {
  final String? source;
  final String? text;
  final bool needsModel;
  const TranslationResult({
    required this.source,
    required this.text,
    this.needsModel = false,
  });
}

final translatorProvider = Provider<Translator>((ref) {
  final t = Translator();
  ref.onDispose(t.dispose);
  return t;
});
