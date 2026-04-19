class ArticleDraft {
  final int sourceId;
  final String url;
  final String title;
  final String? author;
  final DateTime? publishedAt;
  final String? summary;
  final String? contentHtml;
  final String? contentText;
  final String? originalLang;
  final String? translatedTitle;
  final String? translatedContent;
  final String? imageUrl;

  const ArticleDraft({
    required this.sourceId,
    required this.url,
    required this.title,
    this.author,
    this.publishedAt,
    this.summary,
    this.contentHtml,
    this.contentText,
    this.originalLang,
    this.translatedTitle,
    this.translatedContent,
    this.imageUrl,
  });

  ArticleDraft copyWith({
    String? title,
    String? author,
    DateTime? publishedAt,
    String? summary,
    String? contentHtml,
    String? contentText,
    String? originalLang,
    String? translatedTitle,
    String? translatedContent,
    String? imageUrl,
  }) =>
      ArticleDraft(
        sourceId: sourceId,
        url: url,
        title: title ?? this.title,
        author: author ?? this.author,
        publishedAt: publishedAt ?? this.publishedAt,
        summary: summary ?? this.summary,
        contentHtml: contentHtml ?? this.contentHtml,
        contentText: contentText ?? this.contentText,
        originalLang: originalLang ?? this.originalLang,
        translatedTitle: translatedTitle ?? this.translatedTitle,
        translatedContent: translatedContent ?? this.translatedContent,
        imageUrl: imageUrl ?? this.imageUrl,
      );
}
