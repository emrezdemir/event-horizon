import 'package:html/dom.dart' as dom;
import 'package:html/parser.dart' as html_parser;
import 'package:html_unescape/html_unescape.dart';

final _unescape = HtmlUnescape();

String stripHtml(String? input) {
  if (input == null || input.isEmpty) return '';
  final doc = html_parser.parse(input);
  final text = doc.body?.text ?? '';
  return _unescape.convert(text).replaceAll(RegExp(r'\s+'), ' ').trim();
}

String sanitizeHtml(String? input) {
  if (input == null || input.isEmpty) return '';
  final doc = html_parser.parseFragment(input);
  _removeDisallowed(doc);
  return doc.outerHtml;
}

const _disallowedTags = {
  'script',
  'style',
  'iframe',
  'noscript',
  'form',
  'input',
  'button',
  'svg',
  'canvas',
  'nav',
  'aside',
  'footer',
  'header',
};

void _removeDisallowed(dom.Node node) {
  final toRemove = <dom.Element>[];
  for (final child in node.nodes.whereType<dom.Element>()) {
    if (_disallowedTags.contains(child.localName?.toLowerCase())) {
      toRemove.add(child);
    } else {
      _removeDisallowed(child);
    }
  }
  for (final el in toRemove) {
    el.remove();
  }
}
