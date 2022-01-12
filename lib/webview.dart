import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart' show rootBundle;
import 'package:webview_flutter/webview_flutter.dart';

class WebViewAsyncSsiTest extends StatefulWidget {
  const WebViewAsyncSsiTest({Key? key}) : super(key: key);

  @override
  _WebViewAsyncSsiTestState createState() => _WebViewAsyncSsiTestState();
}

class _WebViewAsyncSsiTestState extends State<WebViewAsyncSsiTest> {
  late Set<JavascriptChannel> _channels;
  late WebViewController _controller;

  @override
  void initState() {
    _channels = {
      JavascriptChannel(
        name: '_ssiChannel',
        onMessageReceived: _onMessageReceived,
      )
    };
    super.initState();
  }

  @override
  Widget build(BuildContext context) {
    return WebView(
      javascriptMode: JavascriptMode.unrestricted,
      onWebViewCreated: _onWebViewCreated,
      onPageFinished: _onPageFinished,
      javascriptChannels: _channels,
    );
  }

  Future<void> _onWebViewCreated(WebViewController controller) async {
    _controller = controller;
    await _controller.loadFlutterAsset('assets/sample.html');
  }

  Future<void> _onPageFinished(String s) async {
    await _controller.runJavascript(await rootBundle.loadString('assets/api.js'));
  }

  Future<void> _onMessageReceived(JavascriptMessage message) async {
    final env = jsonDecode(message.message);
    final command = env['command'] as String;
    final id = env['id'] as int;
    switch (command) {
      case 'someFunc':
        _complete(id, data: {"json-test": "testing JSON serialization", "single-quote-test": "It's show time!"});
        break;
      default:
        _complete(id, error: 'Unknown command.');
    }
  }

  Future<void> _complete(int id, {dynamic data, String? error}) async {
    String script;
    if (error != null) {
      script = "_ssiGlue._complete($id, null, '${_escapeSingleQuote(error)}')";
    } else if (data != null) {
      script = "_ssiGlue._complete($id, '${_escapeSingleQuote(jsonEncode(data))}')";
    } else {
      script = "_ssiGlue._complete($id, null)";
    }
    await _controller.runJavascript(script);
  }

  static String _escapeSingleQuote(String str) => str.replaceAll('\'', '\\\'');
}
