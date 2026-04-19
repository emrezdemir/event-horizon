import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

Dio buildDio() {
  final dio = Dio(
    BaseOptions(
      connectTimeout: const Duration(seconds: 12),
      receiveTimeout: const Duration(seconds: 20),
      followRedirects: true,
      maxRedirects: 5,
      headers: {
        'User-Agent':
            'Mozilla/5.0 (Mobile; NewsApp) AppleWebKit/605.1.15 (KHTML, like Gecko)',
        'Accept': '*/*',
        'Accept-Language': 'tr-TR,tr;q=0.9,en;q=0.8',
      },
      validateStatus: (s) => s != null && s >= 200 && s < 400,
      responseType: ResponseType.plain,
    ),
  );
  return dio;
}

final httpClientProvider = Provider<Dio>((ref) => buildDio());
