import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class AppTheme {
  static ThemeData light() => _build(Brightness.light);
  static ThemeData dark() => _build(Brightness.dark);

  static ThemeData _build(Brightness b) {
    final scheme = ColorScheme.fromSeed(
      seedColor: const Color(0xFF1B5E20),
      brightness: b,
    );
    final base = b == Brightness.light ? ThemeData.light() : ThemeData.dark();
    final textTheme = GoogleFonts.interTextTheme(base.textTheme).copyWith(
      headlineMedium: GoogleFonts.merriweather(
        textStyle: base.textTheme.headlineMedium,
        fontWeight: FontWeight.w700,
      ),
      titleLarge: GoogleFonts.merriweather(
        textStyle: base.textTheme.titleLarge,
        fontWeight: FontWeight.w600,
      ),
      bodyLarge: GoogleFonts.merriweather(
        textStyle: base.textTheme.bodyLarge?.copyWith(height: 1.6),
      ),
    );
    return base.copyWith(
      useMaterial3: true,
      colorScheme: scheme,
      scaffoldBackgroundColor: scheme.surface,
      textTheme: textTheme,
      appBarTheme: AppBarTheme(
        backgroundColor: scheme.surface,
        foregroundColor: scheme.onSurface,
        elevation: 0,
        centerTitle: false,
      ),
      cardTheme: const CardTheme(
        elevation: 0,
        margin: EdgeInsets.symmetric(vertical: 6, horizontal: 12),
      ),
      dividerTheme: DividerThemeData(color: scheme.outlineVariant),
    );
  }
}
