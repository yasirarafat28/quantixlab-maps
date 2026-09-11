import 'dart:convert';
import 'package:http/http.dart' as http;
import 'models.dart';

class QuantixMapsClient {
  QuantixMapsClient(
      {required this.serverKey,
      this.baseUrl = 'https://maps.quantixlab.dev',
      http.Client? client})
      : _client = client ?? http.Client();
  final String serverKey;
  final String baseUrl;
  final http.Client _client;
  Map<String, String> assetHeaders(String publishableKey) =>
      {'X-Quantix-Maps-Key': publishableKey};

  Future<Map<String, dynamic>> search(String query,
          {String? countryCode, String? language, int limit = 6}) =>
      _get('/v1/geocode/search', {
        'q': query,
        'limit': '$limit',
        if (countryCode != null) 'countryCode': countryCode,
        if (language != null) 'language': language
      });
  Future<Map<String, dynamic>> reverse(MapsCoordinate point,
          {String? language, int radiusMeters = 1000, int limit = 1}) =>
      _get('/v1/geocode/reverse', {
        'latitude': '${point.latitude}',
        'longitude': '${point.longitude}',
        'radiusMeters': '$radiusMeters',
        'limit': '$limit',
        if (language != null) 'language': language
      });
  Future<Map<String, dynamic>> route(
          MapsProfile profile, List<MapsCoordinate> points,
          {String? language}) =>
      _post('/v1/routes', {
        'profile': profile.wireValue,
        'points': points.map((p) => p.toJson()).toList(),
        if (language != null) 'language': language
      });
  Future<Map<String, dynamic>> match(
    MapsProfile profile,
    List<MapsCoordinate> points, {
    double? gpsAccuracyM,
    double? searchRadiusM,
  }) =>
      _post('/v1/matches', {
        'profile': profile.wireValue,
        'points': points.map((p) => p.toJson()).toList(),
        if (gpsAccuracyM != null) 'gpsAccuracyM': gpsAccuracyM,
        if (searchRadiusM != null) 'searchRadiusM': searchRadiusM,
      });
  Future<Map<String, dynamic>> matrix(MapsProfile profile,
          List<MapsCoordinate> sources, List<MapsCoordinate> targets) =>
      _post('/v1/matrices', {
        'profile': profile.wireValue,
        'sources': sources.map((p) => p.toJson()).toList(),
        'targets': targets.map((p) => p.toJson()).toList()
      });

  Future<Map<String, dynamic>> _get(String path, Map<String, String> query) =>
      _send(http.Request(
          'GET', Uri.parse('$baseUrl$path').replace(queryParameters: query)));
  Future<Map<String, dynamic>> _post(String path, Object body) {
    final request = http.Request('POST', Uri.parse('$baseUrl$path'));
    request.body = jsonEncode(body);
    request.headers['Content-Type'] = 'application/json';
    return _send(request);
  }

  Future<Map<String, dynamic>> _send(http.Request request) async {
    request.headers['Authorization'] = 'Bearer $serverKey';
    final response =
        await http.Response.fromStream(await _client.send(request));
    final value = jsonDecode(response.body) as Map<String, dynamic>;
    if (response.statusCode >= 400)
      throw MapsProblem(
          response.statusCode,
          value['title'] as String? ?? 'Maps request failed',
          value['requestId'] as String?);
    return value;
  }

  void close() => _client.close();
}
