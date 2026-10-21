# -*- coding: utf-8 -*-
"""Logical ER diagram in the orthogonal template: no crossings, no lines over tables."""
import heapq
import html
import xml.etree.ElementTree as ET
from pathlib import Path

GRID = 16
HEADER = 32
ROW_H = 20
MARGIN = 96

TABLES = {
    "role": [("PK", "role_id"), ("UQ", "role_code"), ("", "role_name"), ("", "description")],
    "role_permission": [("PK", "role_permission_id"), ("FK", "role_id"), ("", "permission_code"), ("", "permission_name")],
    "center": [("PK", "center_id"), ("", "center_name"), ("", "address"), ("", "phone"), ("", "email"), ("", "area_m2"), ("", "description")],
    "room": [("PK", "room_id"), ("FK", "center_id"), ("UQ", "room_code"), ("", "room_name"), ("", "room_type"), ("", "capacity"), ("", "area_m2"), ("", "description"), ("", "image_path")],
    "user": [("PK", "user_id"), ("FK", "role_id"), ("FK", "center_id"), ("", "full_name"), ("UQ", "email"), ("UQ", "phone"), ("", "password_hash"), ("", "date_of_birth"), ("", "gender"), ("", "avatar_url"), ("", "status"), ("", "created_at")],
    "pending_registration": [("PK", "email"), ("", "full_name"), ("UQ", "phone"), ("", "password_hash"), ("", "otp_hash"), ("", "attempts"), ("", "created_at"), ("", "expires_at")],
    "password_reset": [("PK", "email"), ("", "otp_hash"), ("", "attempts"), ("", "created_at"), ("", "expires_at")],
    "sport": [("PK", "sport_id"), ("UQ", "sport_code"), ("", "sport_name"), ("", "category")],
    "course": [("PK", "course_id"), ("FK", "sport_id"), ("UQ", "course_code"), ("", "course_name"), ("", "level_name"), ("", "age_range"), ("", "description"), ("", "price"), ("", "image_path"), ("", "status")],
    "material": [("PK", "material_id"), ("FK", "course_id"), ("", "title"), ("", "material_type"), ("", "file_url"), ("", "description")],
    "training_plan": [("PK", "training_plan_id"), ("FK", "created_by_user_id"), ("", "plan_name"), ("", "description"), ("", "duration_weeks"), ("", "created_at")],
    "class": [("PK", "class_id"), ("FK", "course_id"), ("FK", "training_plan_id"), ("FK", "coach_user_id"), ("FK", "room_id"), ("", "class_name"), ("", "start_date"), ("", "end_date"), ("", "capacity"), ("", "status")],
    "class_enrollment": [("PK", "class_enrollment_id"), ("FK", "class_id"), ("FK", "user_id"), ("", "enrolled_at"), ("", "status")],
    "slot": [("PK", "slot_id"), ("FK", "class_id"), ("FK", "room_id"), ("", "slot_date"), ("", "start_time"), ("", "end_time"), ("", "title"), ("", "registration_limit")],
    "slot_registration": [("PK", "slot_registration_id"), ("FK", "slot_id"), ("FK", "user_id"), ("", "registered_at"), ("", "status")],
    "assignment": [("PK", "assignment_id"), ("FK", "slot_id"), ("", "title"), ("", "description"), ("", "due_at")],
    "attendance": [("PK", "attendance_id"), ("FK", "slot_id"), ("FK", "user_id"), ("", "check_in_at"), ("", "status")],
    "evaluation": [("PK", "evaluation_id"), ("FK", "class_id"), ("FK", "assignment_id"), ("FK", "evaluator_user_id"), ("FK", "evaluated_user_id"), ("FK", "reviewer_user_id"), ("", "score"), ("", "comment"), ("", "evaluated_at")],
    "invoice": [("PK", "invoice_id"), ("FK", "user_id"), ("UQ", "invoice_code"), ("", "issued_at"), ("", "total_amount"), ("", "status")],
    "payment": [("PK", "payment_id"), ("FK", "invoice_id"), ("FK", "user_id"), ("FK", "class_id"), ("", "amount"), ("", "payment_method"), ("", "paid_at"), ("", "status"), ("UQ", "payos_order_code"), ("", "checkout_url"), ("", "payment_link_id"), ("", "qr_code")],
    "payment_history": [("PK", "payment_history_id"), ("FK", "payment_id"), ("", "status"), ("", "note"), ("", "created_at")],
    "membership_package": [("PK", "membership_package_id"), ("UQ", "package_code"), ("", "package_name"), ("", "fee"), ("", "validity_months"), ("", "benefits"), ("", "status"), ("", "created_at"), ("", "updated_at")],
    "membership": [("PK", "membership_id"), ("FK", "user_id"), ("FK", "payment_id"), ("FK", "membership_package_id"), ("", "plan_name"), ("", "start_date"), ("", "end_date"), ("", "status")],
    "support_request": [("PK", "support_request_id"), ("FK", "member_user_id"), ("FK", "assigned_to_user_id"), ("", "title"), ("", "description"), ("", "system_category"), ("", "classification_reason"), ("", "receptionist_category"), ("", "status"), ("", "decision"), ("", "resolution_note"), ("", "created_at"), ("", "resolved_at")],
    "consultation_request": [("PK", "consultation_request_id"), ("FK", "received_by_user_id"), ("", "full_name"), ("", "phone"), ("", "email"), ("", "age"), ("", "interested_sports"), ("", "status"), ("", "created_at")],
    "notification": [("PK", "notification_id"), ("FK", "user_id"), ("", "title"), ("", "content"), ("", "is_read"), ("", "created_at")],
    "audit_log": [("PK", "audit_log_id"), ("FK", "user_id"), ("", "action"), ("", "entity_name"), ("", "entity_id"), ("", "detail"), ("", "created_at")],
    "member_body_metric": [("PK", "body_metric_id"), ("FK", "user_id"), ("", "height_cm"), ("", "weight_kg"), ("", "bmi"), ("", "bmi_category"), ("", "recorded_at")],
    "ai_workout_recommendation": [("PK", "recommendation_id"), ("FK", "user_id"), ("FK", "body_metric_id"), ("FK", "training_plan_id"), ("", "goal"), ("", "sessions_per_week"), ("", "session_minutes"), ("", "change_note"), ("", "revision"), ("", "health_summary"), ("", "training_history_summary"), ("", "analysis_request"), ("", "analysis_summary"), ("", "plan_name"), ("", "duration_weeks"), ("", "preferred_start_time"), ("", "status"), ("", "created_at"), ("", "updated_at")],
    "ai_workout_session": [("PK", "workout_session_id"), ("FK", "recommendation_id"), ("", "day_index"), ("", "weekday_name"), ("", "weekday"), ("", "title"), ("", "duration_minutes"), ("", "intensity"), ("", "exercises")],
    "personal_exercise": [("PK", "personal_exercise_id"), ("FK", "user_id"), ("FK", "recommendation_id"), ("", "exercise_date"), ("", "start_time"), ("", "end_time"), ("", "title"), ("", "detail"), ("", "status")],
    "coach_training_history": [("PK", "training_history_id"), ("FK", "member_user_id"), ("FK", "coach_user_id"), ("FK", "class_id"), ("", "content"), ("", "recorded_at")],
}

# parent, child, verb, optional
RELATIONS = [
    ("role", "role_permission", "defines", False),
    ("role", "user", "assigned to", False),
    ("center", "room", "includes", False),
    ("center", "user", "locates", True),
    ("sport", "course", "classifies", False),
    ("course", "material", "has", False),
    ("course", "class", "is offered as", False),
    ("user", "training_plan", "creates", False),
    ("training_plan", "class", "follows", False),
    ("user", "class", "teaches", False),
    ("room", "class", "hosts", True),
    ("user", "class_enrollment", "enrols", False),
    ("class", "class_enrollment", "enrols", False),
    ("class", "slot", "consists of", False),
    ("room", "slot", "hosts", True),
    ("user", "slot_registration", "registers", False),
    ("slot", "slot_registration", "registers", False),
    ("slot", "assignment", "has", False),
    ("slot", "attendance", "check in", False),
    ("user", "attendance", "check in", False),
    ("class", "evaluation", "is assessed through", False),
    ("assignment", "evaluation", "evaluates", True),
    ("user", "evaluation", "evaluates", False),
    ("user", "evaluation", "evaluated in", False),
    ("user", "evaluation", "reviews", True),
    ("user", "invoice", "issued to", False),
    ("invoice", "payment", "generates", False),
    ("user", "payment", "pays", False),
    ("class", "payment", "pays for", True),
    ("payment", "payment_history", "records", False),
    ("user", "membership", "makes", False),
    ("payment", "membership", "issues", True),
    ("membership_package", "membership", "selects", True),
    ("user", "audit_log", "writes", True),
    ("user", "consultation_request", "receives", True),
    ("user", "notification", "receives", False),
    ("user", "support_request", "submits", False),
    ("user", "support_request", "assigned to", True),
    ("user", "member_body_metric", "records", False),
    ("user", "ai_workout_recommendation", "requests", False),
    ("member_body_metric", "ai_workout_recommendation", "based on", False),
    ("training_plan", "ai_workout_recommendation", "saves as", True),
    ("ai_workout_recommendation", "ai_workout_session", "contains", False),
    ("user", "personal_exercise", "schedules", False),
    ("ai_workout_recommendation", "personal_exercise", "schedules", False),
    ("user", "coach_training_history", "trains", False),
    ("user", "coach_training_history", "coaches", False),
    ("class", "coach_training_history", "for class", False),
]

# Rows keep related tables beside each other so most wires are short, like the template.
ROWS = [
    ["invoice", "payment", "payment_history", "membership", "membership_package"],
    ["room", "center", "user", "role", "role_permission", "notification", "audit_log", "consultation_request", "support_request"],
    ["assignment", "evaluation", "attendance", "slot_registration", "slot", "class_enrollment", "class", "training_plan", "member_body_metric", "ai_workout_recommendation", "ai_workout_session", "personal_exercise", "coach_training_history"],
    ["material", "course", "sport", "pending_registration", "password_reset"],
]


def snap_up(value):
    return int((value + GRID - 1) // GRID * GRID)


def table_size(name):
    labels = [col for _key, col in TABLES[name]]
    longest = max(len(item) for item in labels)
    width = snap_up(max(176, 44 + longest * 7 + 12))
    if name == "user":
        width = max(width, 352)
    height = snap_up(HEADER + ROW_H * len(TABLES[name]))
    return width, height


def layout():
    bounds = {}
    row_of = {}
    y = 80
    for row_index, names in enumerate(ROWS):
        x = 80
        row_h = 0
        for name in names:
            w, h = table_size(name)
            bounds[name] = (x, y, w, h)
            row_of[name] = row_index
            x += w + 64
            row_h = max(row_h, h)
        y += row_h + 416
    return bounds, row_of


def overlaps(bounds):
    names = list(bounds)
    hits = []
    for i, a in enumerate(names):
        ax, ay, aw, ah = bounds[a]
        for b in names[i + 1 :]:
            bx, by, bw, bh = bounds[b]
            if ax < bx + bw and ax + aw > bx and ay < by + bh and ay + ah > by:
                hits.append((a, b))
    return hits


SIDES = ("east", "west", "south", "north")


def side_facing(src, dst):
    sx, sy, sw, sh = src
    dx, dy, dw, dh = dst
    scx, scy = sx + sw / 2, sy + sh / 2
    dcx, dcy = dx + dw / 2, dy + dh / 2
    if abs(dcx - scx) >= abs(dcy - scy):
        return "east" if dcx >= scx else "west"
    return "south" if dcy >= scy else "north"


def port_pixel(bounds, side, slot, count):
    x, y, w, h = bounds
    if side in ("east", "west"):
        room = max(1, (h // GRID) - 1)
        index = min(slot, room - 1)
        py = y + GRID * (index + 1)
        return (x + w if side == "east" else x), py
    room = max(1, (w // GRID) - 1)
    index = min(slot, room - 1)
    px = x + GRID * (index + 1)
    return px, (y + h if side == "south" else y)


def outside(bounds, side, px, py):
    x, y, w, h = bounds
    if side == "east":
        return px + GRID, py
    if side == "west":
        return px - GRID, py
    if side == "south":
        return px, py + GRID
    return px, py - GRID


def exit_pair(bounds, side, px, py):
    x, y, w, h = bounds
    if side == "east":
        return 1, (py - y) / h
    if side == "west":
        return 0, (py - y) / h
    if side == "south":
        return (px - x) / w, 1
    return (px - x) / w, 0


def point_blocked_by_table(px, py, bounds):
    for x, y, w, h in bounds.values():
        if x <= px <= x + w and y <= py <= y + h:
            return True
    return False


def astar(start, goal, blocked, limit, expansion_limit=250000):
    if start in blocked or goal in blocked:
        return None
    if start == goal:
        return [start]
    sx, sy = start
    gx, gy = goal
    heap = [(0, 0, sx, sy, 0, 0)]
    best = {}
    parent = {}
    expansions = 0
    while heap:
        cost, _turns, x, y, pdx, pdy = heapq.heappop(heap)
        state = (x, y, pdx, pdy)
        if state in best and best[state] <= cost:
            continue
        best[state] = cost
        if (x, y) == goal:
            path = [(x, y)]
            cursor = state
            while cursor in parent:
                cursor = parent[cursor]
                path.append((cursor[0], cursor[1]))
            path.reverse()
            return path
        expansions += 1
        if expansions > expansion_limit:
            return None
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nx, ny = x + dx * GRID, y + dy * GRID
            if (nx, ny) in blocked:
                continue
            if nx < 0 or ny < 0 or nx > limit or ny > limit:
                continue
            turn = 0 if (pdx, pdy) in ((0, 0), (dx, dy)) else 1
            ncost = cost + 1 + turn * 8
            nstate = (nx, ny, dx, dy)
            if nstate in best and best[nstate] <= ncost:
                continue
            parent[nstate] = state
            heuristic = abs(gx - nx) // GRID + abs(gy - ny) // GRID
            heapq.heappush(heap, (ncost + heuristic, 0, nx, ny, dx, dy))
    return None


def cells_on(path):
    covered = set()
    for (x1, y1), (x2, y2) in zip(path, path[1:]):
        if x1 == x2:
            step = GRID if y2 >= y1 else -GRID
            y = y1
            covered.add((x1, y1))
            while y != y2:
                y += step
                covered.add((x1, y))
        elif y1 == y2:
            step = GRID if x2 >= x1 else -GRID
            x = x1
            covered.add((x1, y1))
            while x != x2:
                x += step
                covered.add((x, y1))
        else:
            raise RuntimeError("diagonal wire")
    return covered


def simplify(points):
    if len(points) < 3:
        return points
    out = [points[0]]
    for i in range(1, len(points) - 1):
        ax, ay = out[-1]
        bx, by = points[i]
        cx, cy = points[i + 1]
        if (ax == bx == cx) or (ay == by == cy):
            continue
        out.append(points[i])
    out.append(points[-1])
    return out


def is_adjacent(a, b, bounds, row_of):
    if row_of[a] != row_of[b]:
        return False
    left, right = (a, b) if bounds[a][0] <= bounds[b][0] else (b, a)
    gap_left = bounds[left][0] + bounds[left][2]
    gap_right = bounds[right][0]
    for name, (x, _y, w, _h) in bounds.items():
        if name in (left, right) or row_of[name] != row_of[a]:
            continue
        if x < gap_right and x + w > gap_left:
            return False
    return True


def direct_segment(bounds, parent, child, slot, count):
    ax, ay, aw, ah = bounds[parent]
    bx, by, bw, bh = bounds[child]
    top = max(ay, by) + GRID
    bot = min(ay + ah, by + bh) - GRID
    if bot <= top:
        top = max(ay, by) + 8
        bot = min(ay + ah, by + bh) - 8
    span = max(bot - top, 1)
    y = int(round((top + (slot + 1) * span / (count + 1)) / GRID) * GRID)
    y = min(max(y, int(top)), int(bot))
    if ax + aw <= bx:
        return ("east", ax + aw, y, "west", bx, y, [(ax + aw, y), (bx, y)])
    if bx + bw <= ax:
        return ("west", ax, y, "east", bx + bw, y, [(ax, y), (bx + bw, y)])
    return None


def route_gutter(bounds, row_of, gutter_row, rels):
    lower = [name for name, row in row_of.items() if row == gutter_row]
    upper = [name for name, row in row_of.items() if row == gutter_row - 1]
    lower_top = min(bounds[name][1] for name in lower)
    upper_bottom = max((bounds[name][1] + bounds[name][3] for name in upper), default=0)
    usage = {}
    for rel in rels:
        for end, table in (("p", rel[0]), ("c", rel[1])):
            side = "north" if row_of[table] == gutter_row else "south"
            usage.setdefault((table, side), []).append((rel, end))
    ports = {}
    for (table, side), items in usage.items():
        for index, (rel, end) in enumerate(items):
            px, py = port_pixel(bounds[table], side, index, len(items))
            ports[(rel, end)] = (side, px, py)
    ordered = sorted(rels, key=lambda rel: (min(ports[(rel, "p")][1], ports[(rel, "c")][1]), rel[2], rel[0], rel[1]))
    routed = []
    failed = []
    for lane, rel in enumerate(ordered):
        ly = lower_top - (lane + 1) * GRID
        if ly <= upper_bottom:
            failed.append(rel[2] + " " + rel[0] + "->" + rel[1])
            continue
        side_p, px, py = ports[(rel, "p")]
        side_c, qx, qy = ports[(rel, "c")]
        path = simplify([(px, py), (px, ly), (qx, ly), (qx, qy)])
        routed.append((rel, path, (side_p, px, py, side_c, qx, qy)))
    return routed, failed


def route_skip(bounds, row_of, rel, lane):
    """One wire around the left margin, outside every table."""
    parent, child = rel[0], rel[1]
    upper, lower = (parent, child) if row_of[parent] < row_of[child] else (child, parent)
    ux, uy, uw, uh = bounds[upper]
    lx, ly, lw, lh = bounds[lower]
    hx = 16 + lane * GRID
    # Leave the upper table through its top, the lower table through its top,
    # and keep the vertical run in the left margin.
    up = (ux + uw // 2 // GRID * GRID, uy)
    if up[0] <= ux:
        up = (ux + GRID, uy)
    low = (lx + GRID, ly)
    top_y = 16 + lane * GRID
    path = simplify([up, (up[0], top_y), (hx, top_y), (hx, low[1] - GRID), (low[0], low[1] - GRID), low])
    side_u, side_l = "north", "north"
    if parent == upper:
        chosen = (side_u, up[0], up[1], side_l, low[0], low[1])
    else:
        chosen = (side_l, low[0], low[1], side_u, up[0], up[1])
        path = list(reversed(path))
    return rel, path, chosen


def route_all(bounds, row_of):
    routed = []
    failed = []
    direct_groups = {}
    gutters = {}
    skips = []
    for rel in RELATIONS:
        parent, child = rel[0], rel[1]
        rp, rc = row_of[parent], row_of[child]
        if rp == rc and is_adjacent(parent, child, bounds, row_of):
            direct_groups.setdefault(tuple(sorted((parent, child))), []).append(rel)
        elif abs(rp - rc) <= 1:
            gutters.setdefault(max(rp, rc), []).append(rel)
        else:
            skips.append(rel)

    for rels in direct_groups.values():
        for slot, rel in enumerate(rels):
            segment = direct_segment(bounds, rel[0], rel[1], slot, len(rels))
            if segment is None:
                failed.append(rel[2] + " " + rel[0] + "->" + rel[1])
                continue
            side_p, px, py, side_c, qx, qy, path = segment
            routed.append((rel, path, (side_p, px, py, side_c, qx, qy)))

    for gutter_row, rels in gutters.items():
        part, bad = route_gutter(bounds, row_of, gutter_row, rels)
        routed.extend(part)
        failed.extend(bad)

    for index, rel in enumerate(skips):
        routed.append(route_skip(bounds, row_of, rel, index))
    return routed, failed, 0, 0


def orient(ax, ay, bx, by):
    if ax == bx:
        return (ax, min(ay, by), ax, max(ay, by))
    return (min(ax, bx), ay, max(ax, bx), by)


def segments_of(path):
    return [orient(path[i][0], path[i][1], path[i + 1][0], path[i + 1][1]) for i in range(len(path) - 1)]


def proper_cross(a, b):
    ax1, ay1, ax2, ay2 = a
    bx1, by1, bx2, by2 = b
    a_h = ay1 == ay2
    b_h = by1 == by2
    if a_h == b_h:
        if a_h and ay1 == by1 and ax1 < bx2 and bx1 < ax2:
            return True
        if not a_h and ax1 == bx1 and ay1 < by2 and by1 < ay2:
            return True
        return False
    if a_h:
        return ax1 < bx1 < ax2 and by1 < ay1 < by2
    return bx1 < ax1 < bx2 and ay1 < by1 < ay2


def hits_table(seg, bounds):
    x1, y1, x2, y2 = seg
    for x, y, w, h in bounds.values():
        ix1, iy1, ix2, iy2 = x + 1, y + 1, x + w - 1, y + h - 1
        if y1 == y2:
            if iy1 < y1 < iy2 and x1 < ix2 and ix1 < x2:
                return True
        elif ix1 < x1 < ix2 and y1 < iy2 and iy1 < y2:
            return True
    return False


def validate(bounds, routed):
    problems = []
    all_segs = []
    for rel, path, _chosen in routed:
        segs = segments_of(path)
        for seg in segs:
            if hits_table(seg, bounds):
                problems.append("covers " + rel[2])
        all_segs.append((rel, segs))
    for i, (rel_a, segs_a) in enumerate(all_segs):
        for rel_b, segs_b in all_segs[i + 1 :]:
            for a in segs_a:
                for b in segs_b:
                    if proper_cross(a, b):
                        problems.append("cross " + rel_a[2] + " / " + rel_b[2])
    return problems


def label_box(text, cx, cy):
    width = len(text) * 6.4 + 10
    height = 16
    return cx - width / 2, cy - height / 2, width, height


def place_labels(bounds, routed):
    used = []
    labels = []
    for rel, path, _chosen in routed:
        text = rel[2]
        segs = []
        for i in range(len(path) - 1):
            ax, ay = path[i]
            bx, by = path[i + 1]
            segs.append((abs(bx - ax) + abs(by - ay), ax, ay, bx, by))
        segs.sort(reverse=True)
        placed = None
        for length, ax, ay, bx, by in segs:
            mx, my = (ax + bx) / 2, (ay + by) / 2
            shifts = (0, 18, -18, 36, -36)
            slides = (0, 28, -28, 56, -56)
            for shift in shifts:
                for slide in slides:
                    if ax == bx:
                        cx, cy = mx + shift, my + slide
                    else:
                        cx, cy = mx + slide, my + shift
                    box = label_box(text, cx, cy)
                    if box_bad(box, bounds, used):
                        continue
                    placed = (text, cx, cy, box)
                    break
                if placed:
                    break
            if placed:
                break
        if not placed:
            ax, ay = path[0]
            bx, by = path[-1]
            cx, cy = (ax + bx) / 2, (ay + by) / 2
            box = label_box(text, cx, cy)
            placed = (text, cx, cy, box)
        used.append(placed[3])
        labels.append(placed)
    return labels


def box_bad(box, bounds, used):
    x, y, w, h = box
    for tx, ty, tw, th in bounds.values():
        if x < tx + tw and x + w > tx and y < ty + th and y + h > ty:
            return True
    for ux, uy, uw, uh in used:
        if x < ux + uw and x + w > ux and y < uy + uh and y + h > uy:
            return True
    # Stay on the page.
    if x < 8 or y < 8:
        return True
    return False


def drawio(bounds, routed, labels, page_w, page_h):
    parts = []
    next_id = 2

    def cell(value, style, parent="1", vertex=True, edge=False, source=None, target=None, geo=""):
        nonlocal next_id
        cid = str(next_id)
        next_id += 1
        attrs = f' id="{cid}" value="{html.escape(value, quote=True)}" style="{style}" parent="{parent}"'
        if vertex:
            attrs += ' vertex="1"'
        if edge:
            attrs += ' edge="1"'
        if source:
            attrs += f' source="{source}"'
        if target:
            attrs += f' target="{target}"'
        parts.append(f"<mxCell{attrs}>{geo}</mxCell>")
        return cid

    ids = {}
    for name, (x, y, w, h) in bounds.items():
        tid = cell(
            name,
            "shape=table;startSize=32;container=1;collapsible=0;childLayout=tableLayout;fixedRows=1;rowLines=0;fontStyle=1;align=center;resizeLast=1;html=1;fillColor=#FFFFFF;strokeColor=#000000;fontColor=#000000;fontSize=13;",
            geo=f'<mxGeometry x="{x}" y="{y}" width="{w}" height="{h}" as="geometry" />',
        )
        ids[name] = tid
        for index, (key, col) in enumerate(TABLES[name]):
            rid = cell(
                "",
                "shape=tableRow;horizontal=0;startSize=0;swimlaneHead=0;swimlaneBody=0;fillColor=#FFFFFF;collapsible=0;dropTarget=0;points=[[0,0.5],[1,0.5],[0.5,0],[0.5,1]];portConstraint=none;top=0;left=0;right=0;bottom=0;html=1;strokeColor=#000000;",
                parent=tid,
                geo=f'<mxGeometry x="0" y="{HEADER + index * ROW_H}" width="{w}" height="{ROW_H}" as="geometry" />',
            )
            name_style = "shape=partialRectangle;connectable=0;fillColor=none;top=0;left=0;bottom=0;right=0;align=left;spacingLeft=4;overflow=hidden;html=1;fontSize=11;strokeColor=none;fontColor=#000000;"
            if key == "PK":
                name_style += "fontStyle=5;"
            elif key == "FK":
                name_style += "fontStyle=1;"
            cell(
                key,
                "shape=partialRectangle;connectable=0;fillColor=none;top=0;left=0;bottom=0;right=0;align=center;fontStyle=1;overflow=hidden;html=1;fontSize=10;strokeColor=none;fontColor=#000000;",
                parent=rid,
                geo=f'<mxGeometry x="0" y="0" width="28" height="{ROW_H}" as="geometry" />',
            )
            cell(
                col,
                name_style,
                parent=rid,
                geo=f'<mxGeometry x="28" y="0" width="{w - 28}" height="{ROW_H}" as="geometry" />',
            )

    for (parent, child, _verb, optional), path, chosen in routed:
        sp, px, py, sc, qx, qy = chosen
        ex, ey = exit_pair(bounds[parent], sp, px, py)
        tx, ty = exit_pair(bounds[child], sc, qx, qy)
        start = "ERzeroToOne" if optional else "ERmandOne"
        points = "".join(f'<mxPoint x="{x}" y="{y}" />' for x, y in path[1:-1])
        geo = (
            f'<mxGeometry relative="1" as="geometry">'
            f'<Array as="points">{points}</Array>'
            f"</mxGeometry>"
        )
        style = (
            "rounded=0;html=1;orthogonalLoop=1;jettySize=0;endFill=0;startFill=0;"
            f"endArrow=ERzeroToMany;startArrow={start};strokeColor=#000000;strokeWidth=1;"
            "endSize=8;startSize=8;fontSize=11;fontColor=#000000;"
            f"exitX={ex:.4f};exitY={ey:.4f};entryX={tx:.4f};entryY={ty:.4f};"
        )
        cell("", style, vertex=False, edge=True, source=ids[parent], target=ids[child], geo=geo)

    for text, cx, cy, box in labels:
        _x, _y, w, h = box
        cell(
            text,
            "text;html=1;strokeColor=none;fillColor=#FFFFFF;align=center;verticalAlign=middle;fontStyle=4;fontSize=11;fontColor=#000000;",
            geo=f'<mxGeometry x="{cx - w / 2:.1f}" y="{cy - h / 2:.1f}" width="{w:.1f}" height="{h:.1f}" as="geometry" />',
        )

    body = "\n        ".join(parts)
    return f"""<mxfile host="app.diagrams.net" agent="AnhDuySport" version="22.1.0" type="device">
  <diagram id="logical" name="Logical">
    <mxGraphModel dx="1400" dy="900" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="{page_w}" pageHeight="{page_h}" math="0" shadow="0" background="#FFFFFF">
      <root>
        <mxCell id="0" />
        <mxCell id="1" parent="0" />
        {body}
      </root>
    </mxGraphModel>
  </diagram>
</mxfile>
"""


def svg_of(bounds, routed, labels, page_w, page_h):
    parts = [
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{page_w}" height="{page_h}" style="background:#fff;font-family:Arial,sans-serif">'
    ]
    for rel, path, _chosen in routed:
        optional = rel[3]
        pts = " ".join(f"{x},{y}" for x, y in path)
        parts.append(f'<polyline points="{pts}" fill="none" stroke="#000" stroke-width="1.2"/>')
        # Crow's foot is drawn by draw.io; mark the many end with a small tick so the preview shows direction.
        x2, y2 = path[-1]
        x1, y1 = path[-2]
        parts.append(f'<circle cx="{x2}" cy="{y2}" r="2.2" fill="{"#fff" if optional else "#000"}" stroke="#000"/>')
    for name, (x, y, w, h) in bounds.items():
        parts.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="#fff" stroke="#000"/>')
        parts.append(f'<line x1="{x}" y1="{y + HEADER}" x2="{x + w}" y2="{y + HEADER}" stroke="#000"/>')
        parts.append(f'<text x="{x + w / 2}" y="{y + 21}" text-anchor="middle" font-size="13" font-weight="700">{name}</text>')
        for index, (key, col) in enumerate(TABLES[name]):
            yy = y + HEADER + index * ROW_H + 14
            deco = ' text-decoration="underline" font-weight="700"' if key == "PK" else (' font-weight="700"' if key == "FK" else "")
            parts.append(f'<text x="{x + 4}" y="{yy}" font-size="11"{deco}>{key} {col}</text>')
    for text, cx, cy, box in labels:
        x, y, w, h = box
        parts.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="#fff"/>')
        parts.append(f'<text x="{cx}" y="{cy + 4}" text-anchor="middle" font-size="11" text-decoration="underline">{text}</text>')
    parts.append("</svg>")
    return "".join(parts)


def main():
    bounds, row_of = layout()
    hit = overlaps(bounds)
    if hit:
        raise SystemExit("table overlap " + str(hit))
    routed, failed, max_x, max_y = route_all(bounds, row_of)
    problems = validate(bounds, routed)
    labels = place_labels(bounds, routed)
    page_w = int(max(max_x, max(x + w for x, y, w, h in bounds.values()) + MARGIN))
    page_h = int(max(max_y, max(y + h for x, y, w, h in bounds.values()) + MARGIN))
    # Page only needs to cover content, not the router's search limit.
    content_r = max((max(p[0] for p in path) for _rel, path, _c in routed), default=0)
    content_b = max((max(p[1] for p in path) for _rel, path, _c in routed), default=0)
    page_w = int(max(content_r, max(x + w for x, y, w, h in bounds.values())) + 48)
    page_h = int(max(content_b, max(y + h for x, y, w, h in bounds.values())) + 48)
    out = Path(__file__).with_name("logical-anhduysport.drawio")
    xml = drawio(bounds, routed, labels, page_w, page_h)
    out.write_text(xml, encoding="utf-8")
    ET.parse(out)
    Path(__file__).with_name("_logical_preview.svg").write_text(svg_of(bounds, routed, labels, page_w, page_h), encoding="utf-8")
    print(f"routed={len(routed)} failed={len(failed)} problems={len(problems)} page={page_w}x{page_h}")
    for item in failed:
        print("FAIL", item)
    for item in problems[:40]:
        print("PROBLEM", item)


if __name__ == "__main__":
    main()
