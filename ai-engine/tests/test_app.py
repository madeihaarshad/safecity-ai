"""
Pytest tests for SafeCity AI Flask endpoints.

Tests cover:
1. GET /health - Health check endpoint
2. POST /predict-risk - Risk prediction with valid and invalid data
3. GET /camera-stats - Camera statistics
4. POST /get-safest-route - Route optimization
"""
import pytest
import json


class TestHealthEndpoint:
    """Test suite for /health endpoint."""
    
    def test_health_status_ok(self, client):
        """Test GET /health returns 200 with status 'online'."""
        response = client.get('/health')
        
        assert response.status_code == 200
        data = json.loads(response.data)
        
        assert 'status' in data
        assert data['status'] == 'online'
    
    def test_health_has_required_fields(self, client):
        """Test /health response has all required fields."""
        response = client.get('/health')
        data = json.loads(response.data)
        
        required_fields = [
            'status',
            'model',
            'model_loaded',
            'city_graph_nodes',
            'city_graph_edges',
            'uptime_seconds',
            'endpoints'
        ]
        
        for field in required_fields:
            assert field in data, f"Missing field: {field}"
    
    def test_health_model_is_loaded(self, client):
        """Test that YOLOv8s model is properly loaded."""
        response = client.get('/health')
        data = json.loads(response.data)
        
        assert data['model'] == 'YOLOv8s'
        assert data['model_loaded'] is True
    
    def test_health_city_graph_initialized(self, client):
        """Test that city graph is initialized with nodes and edges."""
        response = client.get('/health')
        data = json.loads(response.data)
        
        assert data['city_graph_nodes'] == 8  # A-H
        assert data['city_graph_edges'] == 11  # Defined edges
    
    def test_health_has_all_endpoints(self, client):
        """Test that all endpoints are listed."""
        response = client.get('/health')
        data = json.loads(response.data)
        
        expected_endpoints = [
            '/detect-frame',
            '/detect-violations',
            '/camera-stats',
            '/reset-stats',
            '/predict-risk',
            '/get-safest-route',
            '/health'
        ]
        
        for endpoint in expected_endpoints:
            assert endpoint in data['endpoints']


class TestPredictRiskEndpoint:
    """Test suite for POST /predict-risk endpoint."""
    
    def test_predict_risk_valid_input(self, client):
        """Test POST /predict-risk with valid input returns 200 with risk_score and level."""
        payload = {
            'hour': 14,
            'weather': 'Rain',
            'congestion': 'Moderate',
            'speed_avg': 72,
            'incident_count': 2
        }
        
        response = client.post('/predict-risk', json=payload)
        
        assert response.status_code == 200
        data = json.loads(response.data)
        
        assert 'risk_score' in data
        assert 'level' in data
        assert isinstance(data['risk_score'], (int, float))
        assert data['level'] in ['Low', 'Moderate', 'High', 'Critical']
    
    def test_predict_risk_response_structure(self, client):
        """Test that risk prediction response has all expected fields."""
        payload = {
            'hour': 14,
            'weather': 'Rain',
            'congestion': 'Moderate',
            'speed_avg': 72,
            'incident_count': 2
        }
        
        response = client.post('/predict-risk', json=payload)
        data = json.loads(response.data)
        
        required_fields = [
            'status',
            'risk_score',
            'level',
            'breakdown',
            'recommendation',
            'raw_score',
            'max_score'
        ]
        
        for field in required_fields:
            assert field in data, f"Missing field: {field}"
    
    def test_predict_risk_breakdown_details(self, client):
        """Test that breakdown contains detailed risk component analysis."""
        payload = {
            'hour': 14,
            'weather': 'Rain',
            'congestion': 'Moderate',
            'speed_avg': 72,
            'incident_count': 2
        }
        
        response = client.post('/predict-risk', json=payload)
        data = json.loads(response.data)
        
        breakdown_keys = ['time', 'weather', 'congestion', 'speed', 'incidents']
        
        for key in breakdown_keys:
            assert key in data['breakdown'], f"Missing breakdown component: {key}"
            assert 'points' in data['breakdown'][key]
    
    def test_predict_risk_night_hours(self, client):
        """Test that night hours (0-5, 20-24) increase risk."""
        # Test night hour (0)
        payload = {
            'hour': 0,
            'weather': 'Clear',
            'congestion': 'Light',
            'speed_avg': 60,
            'incident_count': 0
        }
        
        response = client.post('/predict-risk', json=payload)
        data = json.loads(response.data)
        
        assert data['breakdown']['time']['points'] == 20
        assert data['breakdown']['time']['label'] == 'Night'
    
    def test_predict_risk_rush_hour(self, client):
        """Test that rush hours increase risk."""
        # Test rush hour (8)
        payload = {
            'hour': 8,
            'weather': 'Clear',
            'congestion': 'Light',
            'speed_avg': 60,
            'incident_count': 0
        }
        
        response = client.post('/predict-risk', json=payload)
        data = json.loads(response.data)
        
        assert data['breakdown']['time']['points'] == 15
        assert data['breakdown']['time']['label'] == 'Rush Hour'
    
    def test_predict_risk_weather_impact(self, client):
        """Test that different weather conditions impact risk correctly."""
        weather_scores = {
            'Clear': 0,
            'Rain': 20,
            'Fog': 25,
            'Storm': 35
        }
        
        for weather, expected_points in weather_scores.items():
            payload = {
                'hour': 12,
                'weather': weather,
                'congestion': 'Light',
                'speed_avg': 60,
                'incident_count': 0
            }
            
            response = client.post('/predict-risk', json=payload)
            data = json.loads(response.data)
            
            assert data['breakdown']['weather']['points'] == expected_points
            assert data['breakdown']['weather']['condition'] == weather
    
    def test_predict_risk_congestion_impact(self, client):
        """Test that congestion levels impact risk correctly."""
        congestion_scores = {
            'Free Flow': 0,
            'Light': 5,
            'Moderate': 15,
            'Severe': 25
        }
        
        for congestion, expected_points in congestion_scores.items():
            payload = {
                'hour': 12,
                'weather': 'Clear',
                'congestion': congestion,
                'speed_avg': 60,
                'incident_count': 0
            }
            
            response = client.post('/predict-risk', json=payload)
            data = json.loads(response.data)
            
            assert data['breakdown']['congestion']['points'] == expected_points
    
    def test_predict_risk_speed_excessive(self, client):
        """Test that excessive speed increases risk."""
        payload = {
            'hour': 12,
            'weather': 'Clear',
            'congestion': 'Light',
            'speed_avg': 120,
            'incident_count': 0
        }
        
        response = client.post('/predict-risk', json=payload)
        data = json.loads(response.data)
        
        assert data['breakdown']['speed']['points'] == 20
        assert data['breakdown']['speed']['label'] == 'Excessive'
    
    def test_predict_risk_incidents(self, client):
        """Test that incident count impacts risk (8 points per incident, capped at 40)."""
        payload = {
            'hour': 12,
            'weather': 'Clear',
            'congestion': 'Light',
            'speed_avg': 60,
            'incident_count': 3
        }
        
        response = client.post('/predict-risk', json=payload)
        data = json.loads(response.data)
        
        # 3 incidents * 8 = 24 points
        assert data['breakdown']['incidents']['points'] == 24
        assert data['breakdown']['incidents']['count'] == 3
    
    def test_predict_risk_risk_level_critical(self, client):
        """Test that high risk combinations result in Critical level."""
        # Combine multiple risk factors for Critical level (>=75)
        payload = {
            'hour': 2,  # Night: +20
            'weather': 'Storm',  # +35
            'congestion': 'Severe',  # +25
            'speed_avg': 120,  # +20
            'incident_count': 3  # +24
        }
        
        response = client.post('/predict-risk', json=payload)
        data = json.loads(response.data)
        
        assert data['level'] == 'Critical'
        assert data['risk_score'] >= 75
    
    def test_predict_risk_risk_level_low(self, client):
        """Test that favorable conditions result in Low level."""
        payload = {
            'hour': 12,  # Normal: +0
            'weather': 'Clear',  # +0
            'congestion': 'Light',  # +5
            'speed_avg': 60,  # +0
            'incident_count': 0  # +0
        }
        
        response = client.post('/predict-risk', json=payload)
        data = json.loads(response.data)
        
        assert data['level'] == 'Low'
        assert data['risk_score'] < 25
    
    def test_predict_risk_missing_fields_defaults(self, client):
        """Test that missing fields use default values gracefully."""
        # Send empty payload - should use defaults
        payload = {}
        
        response = client.post('/predict-risk', json=payload)
        
        assert response.status_code == 200
        data = json.loads(response.data)
        
        # Should have defaults: hour=12, weather='Clear', congestion='Light', speed_avg=60, incident_count=0
        assert 'risk_score' in data
        assert 'level' in data
        assert data['level'] == 'Low'  # Should be low with all defaults
    
    def test_predict_risk_partial_fields(self, client):
        """Test that request with partial fields uses defaults for missing ones."""
        payload = {
            'hour': 8,
            'weather': 'Rain'
            # Missing: congestion, speed_avg, incident_count
        }
        
        response = client.post('/predict-risk', json=payload)
        
        assert response.status_code == 200
        data = json.loads(response.data)
        
        assert 'risk_score' in data
        assert data['breakdown']['time']['label'] == 'Rush Hour'
        assert data['breakdown']['weather']['condition'] == 'Rain'
    
    def test_predict_risk_score_normalized_to_100(self, client):
        """Test that risk_score is normalized to 0-100 range."""
        payload = {
            'hour': 0,
            'weather': 'Storm',
            'congestion': 'Severe',
            'speed_avg': 120,
            'incident_count': 5
        }
        
        response = client.post('/predict-risk', json=payload)
        data = json.loads(response.data)
        
        assert 0 <= data['risk_score'] <= 100
    
    def test_predict_risk_recommendation_provided(self, client):
        """Test that recommendation is provided based on risk level."""
        payload = {
            'hour': 12,
            'weather': 'Clear',
            'congestion': 'Light',
            'speed_avg': 60,
            'incident_count': 0
        }
        
        response = client.post('/predict-risk', json=payload)
        data = json.loads(response.data)
        
        assert 'recommendation' in data
        assert isinstance(data['recommendation'], str)
        assert len(data['recommendation']) > 0


class TestCameraStatsEndpoint:
    """Test suite for GET /camera-stats endpoint."""
    
    def test_camera_stats_ok(self, client):
        """Test GET /camera-stats returns 200."""
        response = client.get('/camera-stats')
        
        assert response.status_code == 200
    
    def test_camera_stats_has_required_fields(self, client):
        """Test /camera-stats response has vehicle_count and pedestrian_count."""
        response = client.get('/camera-stats')
        data = json.loads(response.data)
        
        required_fields = [
            'status',
            'camera_id',
            'vehicle_count',
            'pedestrian_count',
            'congestion_level',
            'violations_count',
            'recent_violations',
            'frames_processed',
            'last_updated'
        ]
        
        for field in required_fields:
            assert field in data, f"Missing field: {field}"
    
    def test_camera_stats_vehicle_and_pedestrian_counts(self, client):
        """Test that vehicle_count and pedestrian_count are integers."""
        response = client.get('/camera-stats')
        data = json.loads(response.data)
        
        assert isinstance(data['vehicle_count'], int)
        assert isinstance(data['pedestrian_count'], int)
        assert data['vehicle_count'] >= 0
        assert data['pedestrian_count'] >= 0
    
    def test_camera_stats_congestion_level_valid(self, client):
        """Test that congestion_level is one of the valid values."""
        response = client.get('/camera-stats')
        data = json.loads(response.data)
        
        valid_levels = ['Low', 'Moderate', 'High']
        assert data['congestion_level'] in valid_levels
    
    def test_camera_stats_recent_violations_format(self, client):
        """Test that recent_violations is a list."""
        response = client.get('/camera-stats')
        data = json.loads(response.data)
        
        assert isinstance(data['recent_violations'], list)
        assert data['violations_count'] >= 0


class TestGetSafeestRouteEndpoint:
    """Test suite for POST /get-safest-route endpoint."""
    
    def test_get_safest_route_valid_nodes(self, client):
        """Test POST /get-safest-route with valid start and end nodes."""
        payload = {
            'start': 'A',
            'end': 'H'
        }
        
        response = client.post('/get-safest-route', json=payload)
        
        assert response.status_code == 200
        data = json.loads(response.data)
        
        assert 'fastest' in data
        assert 'safest' in data
    
    def test_get_safest_route_path_structure(self, client):
        """Test that route response has path and distance/risk."""
        payload = {
            'start': 'A',
            'end': 'H'
        }
        
        response = client.post('/get-safest-route', json=payload)
        data = json.loads(response.data)
        
        # Check fastest path
        assert 'path' in data['fastest']
        assert 'distance' in data['fastest']
        assert isinstance(data['fastest']['path'], list)
        assert isinstance(data['fastest']['distance'], (int, float))
        
        # Check safest path
        assert 'path' in data['safest']
        assert isinstance(data['safest']['path'], list)
    
    def test_get_safest_route_paths_contain_nodes(self, client):
        """Test that returned paths contain valid node identifiers."""
        payload = {
            'start': 'A',
            'end': 'E'
        }
        
        response = client.post('/get-safest-route', json=payload)
        data = json.loads(response.data)
        
        valid_nodes = {'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'}
        
        for node in data['fastest']['path']:
            assert node in valid_nodes
        
        for node in data['safest']['path']:
            assert node in valid_nodes
    
    def test_get_safest_route_start_end_in_path(self, client):
        """Test that start node is first and end node is last in both paths."""
        payload = {
            'start': 'B',
            'end': 'G'
        }
        
        response = client.post('/get-safest-route', json=payload)
        data = json.loads(response.data)
        
        assert data['fastest']['path'][0] == 'B'
        assert data['fastest']['path'][-1] == 'G'
        
        assert data['safest']['path'][0] == 'B'
        assert data['safest']['path'][-1] == 'G'
    
    def test_get_safest_route_distance_positive(self, client):
        """Test that distance is a positive number."""
        payload = {
            'start': 'C',
            'end': 'F'
        }
        
        response = client.post('/get-safest-route', json=payload)
        data = json.loads(response.data)
        
        assert data['fastest']['distance'] > 0
    
    def test_get_safest_route_same_start_end(self, client):
        """Test route when start and end are the same."""
        payload = {
            'start': 'A',
            'end': 'A'
        }
        
        response = client.post('/get-safest-route', json=payload)
        
        assert response.status_code == 200
        data = json.loads(response.data)
        
        # Path should just contain the single node
        assert data['fastest']['path'] == ['A']
        assert data['fastest']['distance'] == 0
    
    def test_get_safest_route_invalid_start_node(self, client):
        """Test that invalid start node returns 400."""
        payload = {
            'start': 'Z',  # Invalid node
            'end': 'A'
        }
        
        response = client.post('/get-safest-route', json=payload)
        
        assert response.status_code == 400
        data = json.loads(response.data)
        assert 'error' in data
    
    def test_get_safest_route_invalid_end_node(self, client):
        """Test that invalid end node returns 400."""
        payload = {
            'start': 'A',
            'end': 'Z'  # Invalid node
        }
        
        response = client.post('/get-safest-route', json=payload)
        
        assert response.status_code == 400
        data = json.loads(response.data)
        assert 'error' in data
    
    def test_get_safest_route_uses_defaults(self, client):
        """Test that missing start/end uses defaults (A to E)."""
        payload = {}
        
        response = client.post('/get-safest-route', json=payload)
        
        assert response.status_code == 200
        data = json.loads(response.data)
        
        # Should route from A to E (default values)
        assert data['fastest']['path'][0] == 'A'
        assert data['fastest']['path'][-1] == 'E'
    
    def test_get_safest_route_multiple_paths(self, client):
        """Test different start-end combinations to verify routing works."""
        routes = [
            ('A', 'B'),
            ('C', 'G'),
            ('E', 'H'),
            ('F', 'D')
        ]
        
        for start, end in routes:
            payload = {'start': start, 'end': end}
            response = client.post('/get-safest-route', json=payload)
            
            assert response.status_code == 200
            data = json.loads(response.data)
            
            assert data['fastest']['path'][0] == start
            assert data['fastest']['path'][-1] == end


class TestIntegration:
    """Integration tests combining multiple endpoints."""
    
    def test_health_then_stats(self, client):
        """Test health check followed by camera stats."""
        # First check health
        health_response = client.get('/health')
        assert health_response.status_code == 200
        
        # Then get camera stats
        stats_response = client.get('/camera-stats')
        assert stats_response.status_code == 200
        
        stats_data = json.loads(stats_response.data)
        assert stats_data['vehicle_count'] >= 0
    
    def test_risk_assessment_workflow(self, client):
        """Test complete risk assessment workflow."""
        # Get camera stats
        stats_response = client.get('/camera-stats')
        stats_data = json.loads(stats_response.data)
        
        # Use camera data in risk prediction
        risk_payload = {
            'hour': 14,
            'weather': 'Clear',
            'congestion': stats_data['congestion_level'],
            'speed_avg': 70,
            'incident_count': stats_data['violations_count']
        }
        
        risk_response = client.post('/predict-risk', json=risk_payload)
        
        assert risk_response.status_code == 200
        risk_data = json.loads(risk_response.data)
        assert 'risk_score' in risk_data
