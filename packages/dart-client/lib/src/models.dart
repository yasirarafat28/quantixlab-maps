enum MapsProfile {
  driving('DRIVING'),
  bicycle('BICYCLE'),
  walking('WALKING');

  const MapsProfile(this.wireValue);
  final String wireValue;
}

class MapsCoordinate {
  const MapsCoordinate({required this.latitude, required this.longitude});
  final double latitude;
  final double longitude;
  Map<String, dynamic> toJson() =>
      {'latitude': latitude, 'longitude': longitude};
}

class MapsRoutePoint extends MapsCoordinate {
  const MapsRoutePoint({
    required super.latitude,
    required super.longitude,
    this.headingDegrees,
    this.headingToleranceDegrees,
    this.radiusMeters,
  });
  final double? headingDegrees;
  final double? headingToleranceDegrees;
  final double? radiusMeters;
  @override
  Map<String, dynamic> toJson() => {
        ...super.toJson(),
        if (headingDegrees != null) 'headingDegrees': headingDegrees,
        if (headingToleranceDegrees != null)
          'headingToleranceDegrees': headingToleranceDegrees,
        if (radiusMeters != null) 'radiusMeters': radiusMeters,
      };
}

class MapsTracePoint extends MapsCoordinate {
  const MapsTracePoint({
    required super.latitude,
    required super.longitude,
    this.timestampSeconds,
  });
  final int? timestampSeconds;
  @override
  Map<String, dynamic> toJson() => {
        ...super.toJson(),
        if (timestampSeconds != null) 'timestampSeconds': timestampSeconds,
      };
}

class MapsProblem implements Exception {
  const MapsProblem(this.status, this.title, this.requestId);
  final int status;
  final String title;
  final String? requestId;
  @override
  String toString() => 'MapsProblem($status, $title, requestId: $requestId)';
}
