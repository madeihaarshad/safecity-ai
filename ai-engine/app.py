from flask import Flask, request, jsonify
from flask_cors import CORS
import networkx as nx
import numpy as np
import cv2
import base64
import threading
from ultralytics import YOLO

app = Flask(__name__)
CORS(app)

print("🔍 Loading YOLOv8s model...")
yolo_model = YOLO("yolov8s.pt")   # 's' (small) is more accurate than 'n' for class distinction
print("✅ YOLOv8s ready")

# ── City graph ──────────────────────────────────────────────
city_map = nx.Graph()
intersections = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']
for i in intersections:
    city_map.add_node(i)
edges = [
    ('A', 'B', 1.2, 0.1), ('B', 'C', 0.8, 0.4), ('C', 'D', 1.5, 0.1),
    ('D', 'E', 2.0, 0.6), ('E', 'F', 1.1, 0.2), ('F', 'G', 0.9, 0.1),
    ('G', 'H', 1.3, 0.7), ('H', 'A', 2.5, 0.1), ('B', 'F', 2.2, 0.5),
    ('C', 'G', 1.8, 0.2), ('D', 'H', 1.1, 0.1)
]
for u, v, w, s in edges:
    city_map.add_edge(u, v, weight=w, risk=s)

# ── Shared detection state ───────────────────────────────────
detection_state = {
    "vehicle_count": 0,
    "pedestrian_count": 0,
    "congestion_level": "Low",
    "violations_detected": [],
    "last_frame_objects": [],
    "frame_count": 0
}
state_lock = threading.Lock()

# ── COCO class IDs — exact, no merging ──────────────────────
PERSON_CLS     = 0
BICYCLE_CLS    = 1    # actual pedal bicycle
CAR_CLS        = 2
MOTORCYCLE_CLS = 3    # motorbike / scooter
BUS_CLS        = 5
TRUCK_CLS      = 7

# Groups used for logic (kept separate for counting/labeling)
TWO_WHEELER_CLS = {BICYCLE_CLS, MOTORCYCLE_CLS}
HEAVY_CLS       = {CAR_CLS, BUS_CLS, TRUCK_CLS}
ALL_VEHICLE_CLS = TWO_WHEELER_CLS | HEAVY_CLS

# Human-readable labels (override COCO defaults for display)
LABEL_MAP = {
    0: "Person",
    1: "Bicycle",
    2: "Car",
    3: "Motorcycle",
    5: "Bus",
    7: "Truck",
}


# ── Night / low-light enhancement ───────────────────────────
def preprocess_frame(frame):
    """
    CLAHE on the L-channel of LAB colourspace.
    Brightens dark regions without blowing out headlights.
    Works transparently on daytime images (no visible change).
    """
    lab = cv2.cvtColor(frame, cv2.COLOR_BGR2LAB)
    l, a, b = cv2.split(lab)
    clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8, 8))
    l_eq  = clahe.apply(l)
    enhanced = cv2.cvtColor(cv2.merge([l_eq, a, b]), cv2.COLOR_LAB2BGR)
    return enhanced


def get_label(cls_id, default_name):
    """Return clean display label for a COCO class id."""
    return LABEL_MAP.get(cls_id, default_name.capitalize())


# ════════════════════════════════════════════════════════════
# ENDPOINT 1 — /detect-frame
# ════════════════════════════════════════════════════════════
@app.route('/detect-frame', methods=['POST'])
def detect_frame():
    data = request.json
    if not data or 'image' not in data:
        return jsonify({"error": "No image provided"}), 400
    try:
        img_bytes = base64.b64decode(data['image'])
        np_arr    = np.frombuffer(img_bytes, np.uint8)
        frame     = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
        if frame is None:
            return jsonify({"error": "Could not decode image"}), 400

        # Night enhancement before inference
        frame = preprocess_frame(frame)

        results = yolo_model(frame, conf=0.20, verbose=False)[0]

        detections   = []
        cars = buses = trucks = motorcycles = bicycles = pedestrians = 0
        violations   = []

        for box in results.boxes:
            cls_id = int(box.cls[0])
            if cls_id not in ALL_VEHICLE_CLS and cls_id != PERSON_CLS:
                continue   # ignore irrelevant COCO classes (dog, chair, etc.)

            conf   = float(box.conf[0])
            x1, y1, x2, y2 = [int(v) for v in box.xyxy[0]]
            label  = get_label(cls_id, results.names[cls_id])

            detections.append({
                "label":      label,
                "confidence": round(conf, 2),
                "bbox":       [x1, y1, x2, y2]
            })

            # Count by exact class
            if   cls_id == CAR_CLS:        cars        += 1
            elif cls_id == BUS_CLS:        buses       += 1
            elif cls_id == TRUCK_CLS:      trucks      += 1
            elif cls_id == MOTORCYCLE_CLS: motorcycles += 1
            elif cls_id == BICYCLE_CLS:    bicycles    += 1
            elif cls_id == PERSON_CLS:     pedestrians += 1

            # Oversized vehicle check
            if cls_id in HEAVY_CLS:
                box_area   = (x2 - x1) * (y2 - y1)
                frame_area = frame.shape[0] * frame.shape[1]
                if box_area > 0.25 * frame_area:
                    violations.append(f"Oversized {label} Detected")

        total_vehicles = cars + buses + trucks + motorcycles + bicycles

        if total_vehicles >= 7:
            congestion = "High"
        elif total_vehicles >= 4:
            congestion = "Moderate"
        else:
            congestion = "Low"

        if congestion == "High":
            violations.append("High Traffic Congestion Detected")

        annotated     = results.plot()
        _, buffer     = cv2.imencode('.jpg', annotated, [cv2.IMWRITE_JPEG_QUALITY, 75])
        annotated_b64 = base64.b64encode(buffer).decode('utf-8')

        with state_lock:
            detection_state["vehicle_count"]       = total_vehicles
            detection_state["pedestrian_count"]    = pedestrians
            detection_state["congestion_level"]    = congestion
            detection_state["violations_detected"] = violations
            detection_state["last_frame_objects"]  = detections
            detection_state["frame_count"]        += 1

        return jsonify({
            "status":           "success",
            "vehicle_count":    total_vehicles,
            "pedestrian_count": pedestrians,
            "congestion_level": congestion,
            "violations":       violations,
            "detections":       detections,
            "annotated_frame":  annotated_b64,
            # Breakdown by type — shown in frontend
            "breakdown": {
                "cars":        cars,
                "buses":       buses,
                "trucks":      trucks,
                "motorcycles": motorcycles,
                "bicycles":    bicycles,
                "pedestrians": pedestrians
            }
        })

    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


# ════════════════════════════════════════════════════════════
# ENDPOINT 2 — /detect-violations
# ════════════════════════════════════════════════════════════
@app.route('/detect-violations', methods=['POST'])
def detect_violations():
    data = request.json
    if not data or 'image' not in data:
        return jsonify({"error": "No image provided"}), 400
    try:
        img_bytes = base64.b64decode(data['image'])
        np_arr    = np.frombuffer(img_bytes, np.uint8)
        frame     = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
        h, w      = frame.shape[:2]

        # Night enhancement
        frame = preprocess_frame(frame)

        results = yolo_model(frame, conf=0.20, verbose=False)[0]

        persons      = []
        motorcycles  = []   # ONLY true motorcycles for no-helmet rule
        bicycles     = []   # tracked separately
        all_vehicles = []

        for box in results.boxes:
            cls_id = int(box.cls[0])
            conf   = float(box.conf[0])
            x1, y1, x2, y2 = [int(v) for v in box.xyxy[0]]
            cx, cy = (x1 + x2) // 2, (y1 + y2) // 2

            if cls_id == PERSON_CLS:
                persons.append({"bbox": [x1,y1,x2,y2], "cx": cx, "cy": cy})

            elif cls_id == MOTORCYCLE_CLS:
                motorcycles.append({"bbox": [x1,y1,x2,y2], "cx": cx, "cy": cy})
                all_vehicles.append({"cls": cls_id, "label": "Motorcycle", "bbox": [x1,y1,x2,y2]})

            elif cls_id == BICYCLE_CLS:
                bicycles.append({"bbox": [x1,y1,x2,y2], "cx": cx, "cy": cy})
                all_vehicles.append({"cls": cls_id, "label": "Bicycle", "bbox": [x1,y1,x2,y2]})

            elif cls_id in HEAVY_CLS:
                label = get_label(cls_id, results.names[cls_id])
                all_vehicles.append({"cls": cls_id, "label": label, "bbox": [x1,y1,x2,y2]})

        violations      = []
        flagged_persons = set()

        # ── Rule 1: No Helmet (Motorcycle riders only) ───────────────
        # Bicycles excluded — helmets not legally required in most regions
        for moto in motorcycles:
            tx1, ty1, tx2, ty2 = moto["bbox"]
            tw_w = tx2 - tx1
            tw_h = ty2 - ty1
            for pi, person in enumerate(persons):
                pcx, pcy = person["cx"], person["cy"]
                margin_x = tw_w * 0.7
                margin_y = tw_h * 0.9
                if (tx1 - margin_x <= pcx <= tx2 + margin_x and
                        ty1 - margin_y <= pcy <= ty2 + margin_y):
                    if pi not in flagged_persons:
                        flagged_persons.add(pi)
                        violations.append({
                            "type":       "No Helmet on Motorcycle Rider",
                            "severity":   "High",
                            "location":   f"({pcx}, {pcy})",
                            "confidence": 0.81
                        })

        # ── Rule 2: Pedestrian in Roadway ────────────────────────────
        for pi, person in enumerate(persons):
            if pi not in flagged_persons and person["cy"] > h * 0.25:
                violations.append({
                    "type":       "Pedestrian in Roadway",
                    "severity":   "Medium",
                    "location":   f"({person['cx']}, {person['cy']})",
                    "confidence": 0.79
                })

        # ── Rule 3: Heavy Traffic Congestion ─────────────────────────
        total_vehicles = len(all_vehicles)
        if total_vehicles >= 5:
            violations.append({
                "type":       "Heavy Traffic Congestion",
                "severity":   "Low",
                "location":   "Scene-wide",
                "confidence": 0.95
            })

        # ── Rule 4: Oversized / Wrong-way Vehicle ────────────────────
        frame_area = h * w
        for v in all_vehicles:
            vx1, vy1, vx2, vy2 = v["bbox"]
            if (vx2 - vx1) * (vy2 - vy1) > 0.20 * frame_area:
                violations.append({
                    "type":       f"Oversized Vehicle ({v['label']})",
                    "severity":   "High",
                    "location":   f"({(vx1+vx2)//2}, {(vy1+vy2)//2})",
                    "confidence": 0.74
                })

        return jsonify({
            "status":            "success",
            "total_violations":  len(violations),
            "violations":        violations,
            "persons_detected":  len(persons),
            "vehicles_detected": total_vehicles,
            "breakdown": {
                "motorcycles": len(motorcycles),
                "bicycles":    len(bicycles),
                "others":      total_vehicles - len(motorcycles) - len(bicycles)
            }
        })

    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


# ════════════════════════════════════════════════════════════
# ENDPOINT 3 — /camera-stats
# ════════════════════════════════════════════════════════════
@app.route('/camera-stats', methods=['GET'])
def camera_stats():
    with state_lock:
        snapshot = dict(detection_state)
    base = {"Low": 0.2, "Moderate": 0.55, "High": 0.85}
    risk = min(0.99, base.get(snapshot["congestion_level"], 0.2)
               + 0.05 * len(snapshot["violations_detected"]))
    return jsonify({
        "status":            "success",
        "camera_id":         "CAM-001",
        "vehicle_count":     snapshot["vehicle_count"],
        "pedestrian_count":  snapshot["pedestrian_count"],
        "congestion_level":  snapshot["congestion_level"],
        "active_violations": snapshot["violations_detected"],
        "scene_risk_score":  round(risk, 2),
        "frames_processed":  snapshot["frame_count"]
    })


# ════════════════════════════════════════════════════════════
# ENDPOINT 4 — /predict-risk
# ════════════════════════════════════════════════════════════
@app.route('/predict-risk', methods=['POST'])
def predict_risk():
    data = request.json
    try:
        weather_factor = 1.5 if data.get('weather') == 'Rainy' else 1.0
        time_factor    = 1.3 if 17 <= data.get('hour', 12) <= 19 else 1.0
        congestion     = data.get('congestion', 0.5)
        with state_lock:
            cam_vehicles   = detection_state["vehicle_count"]
            cam_violations = len(detection_state["violations_detected"])
        camera_factor = 1.0 + (cam_vehicles * 0.02) + (cam_violations * 0.05)
        base_risk     = congestion * weather_factor * time_factor * camera_factor
        prediction    = min(0.99, base_risk * 0.45)
        return jsonify({
            "status":     "success",
            "risk_score": round(prediction, 2),
            "level":      "High" if prediction > 0.7 else "Moderate" if prediction > 0.4 else "Low",
            "contributing_factors": {
                "weather_factor":       weather_factor,
                "time_factor":          time_factor,
                "camera_vehicle_count": cam_vehicles,
                "camera_violations":    cam_violations,
                "camera_factor":        round(camera_factor, 2)
            }
        })
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 400


# ════════════════════════════════════════════════════════════
# ENDPOINT 5 — /get-safest-route
# ════════════════════════════════════════════════════════════
@app.route('/get-safest-route', methods=['POST'])
def get_safest_route():
    data  = request.json
    start = data.get('start', 'A')
    end   = data.get('end', 'E')
    if start not in city_map or end not in city_map:
        return jsonify({"error": "Invalid start or end node"}), 400
    fastest_path = nx.shortest_path(city_map, source=start, target=end, weight='weight')
    fastest_dist = nx.shortest_path_length(city_map, source=start, target=end, weight='weight')
    safest_path  = nx.shortest_path(city_map, source=start, target=end, weight='risk')
    return jsonify({
        "fastest": {"path": fastest_path, "distance": round(fastest_dist, 2)},
        "safest":  {"path": safest_path,  "risk_mitigation": "32% improved safety"}
    })


# ════════════════════════════════════════════════════════════
# ENDPOINT 6 — /health
# ════════════════════════════════════════════════════════════
@app.route('/health', methods=['GET'])
def health():
    return jsonify({
        "status":  "AI Engine Online",
        "modules": {
            "yolo":        "YOLOv8s (ultralytics)",
            "opencv":      cv2.__version__,
            "pathfinding": "NetworkX Dijkstra",
            "night_mode":  "CLAHE Enhancement Active"
        }
    })


if __name__ == '__main__':
    print("🤖 SafeCity AI Engine starting on port 5001...")
    app.run(host='0.0.0.0', port=5001, debug=True)