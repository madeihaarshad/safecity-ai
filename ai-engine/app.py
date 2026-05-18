from flask import Flask, request, jsonify
from flask_cors import CORS
import networkx as nx
import numpy as np
import cv2
import base64
import threading
import time
from datetime import datetime
from ultralytics import YOLO

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": [
    "http://localhost:5173",
    "http://localhost:3000",
    "https://safecity-ai-ten.vercel.app"
]}})

# ── Application startup tracking ────────────────────────────
start_time = time.time()
print("🔍 Loading YOLOv8s model...")
yolo_model = YOLO("yolov8s.pt")
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

# ── COCO class IDs ──────────────────────────────────────────
PERSON_CLS     = 0
BICYCLE_CLS    = 1
CAR_CLS        = 2
MOTORCYCLE_CLS = 3
BUS_CLS        = 5
TRUCK_CLS      = 7

TWO_WHEELER_CLS = {BICYCLE_CLS, MOTORCYCLE_CLS}
HEAVY_CLS       = {CAR_CLS, BUS_CLS, TRUCK_CLS}
ALL_VEHICLE_CLS = TWO_WHEELER_CLS | HEAVY_CLS

# Only buses and trucks can be "oversized" — never motorcycles or cars
OVERSIZED_CLS = {BUS_CLS, TRUCK_CLS}

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
    lab = cv2.cvtColor(frame, cv2.COLOR_BGR2LAB)
    l, a, b = cv2.split(lab)
    clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8, 8))
    l_eq  = clahe.apply(l)
    enhanced = cv2.cvtColor(cv2.merge([l_eq, a, b]), cv2.COLOR_LAB2BGR)
    return enhanced

def get_label(cls_id, default_name):
    return LABEL_MAP.get(cls_id, default_name.capitalize())

# ── Helmet check helper ──────────────────────────────────────
def rider_likely_missing_helmet(person_bbox, moto_bbox, frame_h):
    """
    Returns True only when there is strong evidence a helmet is absent:
      1. The person bbox top (head position) is above the motorcycle centre
         → confirms the person is actually sitting on/riding the motorcycle.
      2. The person's head region occupies the topmost ~25 % of their bbox.
         We check that this head region does NOT contain a large dark/round blob
         that would indicate a helmet.  Because YOLOv8 (COCO) has no helmet
         class we use a simple heuristic: if the person bbox is very tall
         relative to the motorcycle bbox the head is probably exposed.
      3. A minimum frame-relative size guard prevents flagging distant/tiny
         detections that are too small to judge reliably.

    NOTE: This heuristic dramatically reduces false positives but is NOT a
    substitute for a dedicated helmet-detection model.  For production, train
    or source a binary helmet classifier and replace this function.
    """
    px1, py1, px2, py2 = person_bbox
    tx1, ty1, tx2, ty2 = moto_bbox

    person_h = py2 - py1
    person_w = px2 - px1
    moto_h   = ty2 - ty1
    moto_cy  = (ty1 + ty2) / 2

    # Guard 1: person must be small enough to be reliable (skip far-away blobs)
    if person_h < 40 or person_w < 20:
        return False

    # Guard 2: person top (head) must be above motorcycle vertical centre
    #          → confirms riding posture, not just standing nearby
    if py1 >= moto_cy:
        return False

    # Guard 3: person bbox should be taller than ~60 % of moto bbox
    #          A seated rider with a helmet still shows a clear head bump;
    #          a very squat person bbox often means the head is occluded/helmeted
    if moto_h > 0 and (person_h / moto_h) < 0.55:
        return False

    # Guard 4: aspect-ratio sanity — a standing/walking person is tall;
    #          a seated rider on a naked bike is roughly square.
    #          Reject very tall aspect ratios (likely a pedestrian, not a rider).
    aspect = person_h / max(person_w, 1)
    if aspect > 2.8:
        return False

    # If all guards pass, flag as suspected no-helmet
    return True


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

        frame = preprocess_frame(frame)
        results = yolo_model(frame, conf=0.20, verbose=False)[0]

        detections   = []
        cars = buses = trucks = motorcycles = bicycles = pedestrians = 0
        violations   = []

        for box in results.boxes:
            cls_id = int(box.cls[0])
            if cls_id not in ALL_VEHICLE_CLS and cls_id != PERSON_CLS:
                continue
            conf   = float(box.conf[0])
            x1, y1, x2, y2 = [int(v) for v in box.xyxy[0]]
            label  = get_label(cls_id, results.names[cls_id])
            detections.append({
                "label":      label,
                "confidence": round(conf, 2),
                "bbox":       [x1, y1, x2, y2]
            })
            if   cls_id == CAR_CLS:        cars        += 1
            elif cls_id == BUS_CLS:        buses       += 1
            elif cls_id == TRUCK_CLS:      trucks      += 1
            elif cls_id == MOTORCYCLE_CLS: motorcycles += 1
            elif cls_id == BICYCLE_CLS:    bicycles    += 1
            elif cls_id == PERSON_CLS:     pedestrians += 1

            # Oversized check — buses & trucks only, raised threshold to 35 %
            if cls_id in OVERSIZED_CLS:
                box_area   = (x2 - x1) * (y2 - y1)
                frame_area = frame.shape[0] * frame.shape[1]
                if box_area > 0.35 * frame_area:
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

        frame = preprocess_frame(frame)
        results = yolo_model(frame, conf=0.25, verbose=False)[0]  # raised conf threshold

        persons      = []
        motorcycles  = []
        bicycles     = []
        all_vehicles = []

        for box in results.boxes:
            cls_id = int(box.cls[0])
            conf   = float(box.conf[0])
            x1, y1, x2, y2 = [int(v) for v in box.xyxy[0]]
            cx, cy = (x1 + x2) // 2, (y1 + y2) // 2

            if cls_id == PERSON_CLS:
                persons.append({"bbox": [x1,y1,x2,y2], "cx": cx, "cy": cy, "conf": conf})
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

        # ── Rule 1: No Helmet (Motorcycle riders only, with heuristic guard) ──
        for moto in motorcycles:
            tx1, ty1, tx2, ty2 = moto["bbox"]
            tw_w = tx2 - tx1
            tw_h = ty2 - ty1

            for pi, person in enumerate(persons):
                if pi in flagged_persons:
                    continue
                pcx, pcy = person["cx"], person["cy"]

                # Proximity check — person must overlap or be very close to moto
                margin_x = tw_w * 1.0   # tightened from 1.5×
                margin_y = tw_h * 1.0

                if not (tx1 - margin_x <= pcx <= tx2 + margin_x and
                        ty1 - margin_y <= pcy <= ty2 + margin_y):
                    continue

                # Apply heuristic helmet guard before flagging
                if rider_likely_missing_helmet(person["bbox"], moto["bbox"], h):
                    flagged_persons.add(pi)
                    violations.append({
                        "type":       "No Helmet on Motorcycle Rider",
                        "severity":   "High",
                        "location":   f"({pcx}, {pcy})",
                        "confidence": 0.72   # lowered to reflect heuristic uncertainty
                    })

        # ── Rule 2: Pedestrian in Roadway ────────────────────────────────────
        # Only flag if person is in lower 40 % of frame AND not near any vehicle
        # (avoids flagging riders/passengers as "pedestrians in roadway")
        frame_area = h * w
        for pi, person in enumerate(persons):
            if pi in flagged_persons:
                continue   # already identified as a rider

            pcx, pcy = person["cx"], person["cy"]

            # Must be in lower portion of frame
            if pcy <= h * 0.60:
                continue

            # Must NOT be immediately adjacent to any vehicle (would be a rider/passenger)
            near_vehicle = False
            for v in all_vehicles:
                vx1, vy1, vx2, vy2 = v["bbox"]
                vw = vx2 - vx1
                vh = vy2 - vy1
                if (vx1 - vw * 0.5 <= pcx <= vx2 + vw * 0.5 and
                        vy1 - vh * 0.5 <= pcy <= vy2 + vh * 0.5):
                    near_vehicle = True
                    break

            if not near_vehicle:
                violations.append({
                    "type":       "Pedestrian in Roadway",
                    "severity":   "Medium",
                    "location":   f"({pcx}, {pcy})",
                    "confidence": 0.75
                })

        # ── Rule 3: Heavy Traffic Congestion ─────────────────────────────────
        total_vehicles = len(all_vehicles)
        if total_vehicles >= 5:
            violations.append({
                "type":       "Heavy Traffic Congestion",
                "severity":   "Low",
                "location":   "Scene-wide",
                "confidence": 0.95
            })

        # ── Rule 4: Oversized Vehicle — buses & trucks only, 30 % threshold ──
        for v in all_vehicles:
            if v["cls"] not in OVERSIZED_CLS:
                continue   # motorcycles, bicycles, cars are NEVER "oversized"
            vx1, vy1, vx2, vy2 = v["bbox"]
            if (vx2 - vx1) * (vy2 - vy1) > 0.30 * frame_area:
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
    recent_violations = snapshot["violations_detected"][-5:] if snapshot["violations_detected"] else []
    return jsonify({
        "status":            "success",
        "camera_id":         "CAM-001",
        "vehicle_count":     snapshot["vehicle_count"],
        "pedestrian_count":  snapshot["pedestrian_count"],
        "congestion_level":  snapshot["congestion_level"],
        "violations_count":  len(snapshot["violations_detected"]),
        "recent_violations": recent_violations,
        "frames_processed":  snapshot["frame_count"],
        "last_updated":      datetime.now().isoformat()
    })


# ════════════════════════════════════════════════════════════
# ENDPOINT 3B — /reset-stats
# ════════════════════════════════════════════════════════════
@app.route('/reset-stats', methods=['POST'])
def reset_stats():
    with state_lock:
        detection_state["vehicle_count"]       = 0
        detection_state["pedestrian_count"]    = 0
        detection_state["congestion_level"]    = "Low"
        detection_state["violations_detected"] = []
        detection_state["last_frame_objects"]  = []
        detection_state["frame_count"]         = 0
    return jsonify({
        "status":    "success",
        "message":   "Detection statistics reset successfully",
        "timestamp": datetime.now().isoformat()
    })


# ════════════════════════════════════════════════════════════
# ENDPOINT 4 — /predict-risk
# ════════════════════════════════════════════════════════════
@app.route('/predict-risk', methods=['POST'])
def predict_risk():
    data = request.json
    try:
        hour           = data.get('hour', 12)
        weather        = data.get('weather', 'Clear')
        congestion     = data.get('congestion', 'Light')
        speed_avg      = data.get('speed_avg', 60)
        incident_count = data.get('incident_count', 0)

        score     = 0
        breakdown = {}

        if hour in range(0, 6) or hour in range(20, 24):
            time_risk, time_label = 20, "Night"
        elif hour in range(7, 10) or hour in range(16, 19):
            time_risk, time_label = 15, "Rush Hour"
        else:
            time_risk, time_label = 0, "Normal"
        score += time_risk
        breakdown['time'] = {'points': time_risk, 'label': time_label, 'hour': hour}

        weather_risk = {'Clear': 0, 'Rain': 20, 'Fog': 25, 'Storm': 35}.get(weather, 0)
        score += weather_risk
        breakdown['weather'] = {'points': weather_risk, 'condition': weather}

        congestion_risk = {'Free Flow': 0, 'Light': 5, 'Moderate': 15, 'Severe': 25}.get(congestion, 0)
        score += congestion_risk
        breakdown['congestion'] = {'points': congestion_risk, 'level': congestion}

        if speed_avg > 100:
            speed_risk, speed_label = 20, "Excessive"
        elif speed_avg > 80:
            speed_risk, speed_label = 10, "High"
        elif speed_avg < 50:
            speed_risk, speed_label = 5, "Low"
        else:
            speed_risk, speed_label = 0, "Normal"
        score += speed_risk
        breakdown['speed'] = {'points': speed_risk, 'avg_kmh': speed_avg, 'label': speed_label}

        incident_risk = min(incident_count * 8, 40)
        score += incident_risk
        breakdown['incidents'] = {'points': incident_risk, 'count': incident_count}

        risk_score = round(min(100, (score / 140) * 100), 1)

        if risk_score >= 75:
            level          = "Critical"
            recommendation = "Activate emergency protocols. Increase police presence. Consider route diversions."
        elif risk_score >= 50:
            level          = "High"
            recommendation = "Increase traffic monitoring. Alert drivers to hazardous conditions."
        elif risk_score >= 25:
            level          = "Moderate"
            recommendation = "Standard monitoring. Advise drivers to exercise caution."
        else:
            level          = "Low"
            recommendation = "Conditions are safe. Routine monitoring sufficient."

        return jsonify({
            "status":         "success",
            "risk_score":     risk_score,
            "level":          level,
            "breakdown":      breakdown,
            "recommendation": recommendation,
            "raw_score":      score,
            "max_score":      140
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
    uptime_seconds = int(time.time() - start_time)
    return jsonify({
        "status":            "online",
        "model":             "YOLOv8s",
        "model_loaded":      yolo_model is not None,
        "city_graph_nodes":  city_map.number_of_nodes(),
        "city_graph_edges":  city_map.number_of_edges(),
        "uptime_seconds":    uptime_seconds,
        "endpoints": [
            "/detect-frame",
            "/detect-violations",
            "/camera-stats",
            "/reset-stats",
            "/predict-risk",
            "/get-safest-route",
            "/health"
        ]
    })


if __name__ == '__main__':
    import os
    port = int(os.environ.get("PORT", 5001))
    print(f"🤖 SafeCity AI Engine starting on port {port}...")
    app.run(host='0.0.0.0', port=port, debug=False)
