enum MapsProfile { driving('DRIVING'), bicycle('BICYCLE'), walking('WALKING');
  const MapsProfile(this.wireValue); final String wireValue;
}

class MapsCoordinate {
  const MapsCoordinate({required this.latitude, required this.longitude});
  final double latitude; final double longitude;
  Map<String, dynamic> toJson() => {'latitude': latitude, 'longitude': longitude};
}

class MapsProblem implements Exception {
  const MapsProblem(this.status, this.title, this.requestId);
  final int status; final String title; final String? requestId;
  @override String toString() => 'MapsProblem($status, $title, requestId: $requestId)';
}
