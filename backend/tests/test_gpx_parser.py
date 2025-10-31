from datetime import datetime, timedelta

from services.gpx_parser import calculate_best_efforts


def test_calculate_best_efforts_interpolation():
    base_time = datetime(2023, 1, 1, 6, 0, 0)
    distance_time_series = [
        {"distance": 0.0, "time": 0.0, "timestamp": base_time},
        {"distance": 200.0, "time": 50.0, "timestamp": base_time + timedelta(seconds=50)},
        {"distance": 700.0, "time": 200.0, "timestamp": base_time + timedelta(seconds=200)},
    ]

    efforts = calculate_best_efforts(distance_time_series, targets=[("500m", 0.5), ("1km", 1.0)])

    assert "500m" in efforts
    effort_500 = efforts["500m"]

    assert abs(effort_500["time_seconds"] - 140.0) < 1e-6
    assert abs(effort_500["pace_seconds_per_km"] - 280.0) < 1e-6
    assert effort_500["start_timestamp"] == base_time
    assert effort_500["end_timestamp"] == base_time + timedelta(seconds=140)

    assert "1km" not in efforts
