# -*- coding: utf-8 -*-
"""Logical ER diagram: orthogonal wires, no crossings, no wires over tables."""
import heapq
import xml.etree.ElementTree as ET
from pathlib import Path

GRID = 16

_ns = {"__name__": "logical_gen"}
exec(Path(__file__).with_name("_gen_logical_drawio.py").read_text(encoding="utf-8").split("if __name__")[0], _ns)
TABLES = _ns["TABLES"]
RELATIONS = _ns["RELATIONS"]
validate = _ns["validate"]
place_labels = _ns["place_labels"]
drawio = _ns["drawio"]
svg_of = _ns["svg_of"]


def snap(value):
    return int(round(value / GRID) * GRID)


def size(name):
    longest = max(len(col) for _key, col in TABLES[name])
    width = int((max(176, 48 + longest * 7) + GRID - 1) // GRID * GRID)
    if name == "user":
        width = max(width, USER_W)
    height = int((32 + 20 * len(TABLES[name]) + GRID - 1) // GRID * GRID)
    return width, height


def put(bounds, name, x, y):
    width, height = size(name)
    bounds[name] = (snap(x), snap(y), width, height)
    return bounds[name]


def row(bounds, names, x, y, gap):
    for name in names:
        box = put(bounds, name, x, y)
        x = box[0] + box[2] + gap
    return x


def port(bounds, name, side, slot=1):
    x, y, width, height = bounds[name]
    slot = max(1, slot)
    if side == "north":
        return (min(x + GRID * slot, x + width - GRID), y)
    if side == "south":
        return (min(x + GRID * slot, x + width - GRID), y + height)
    if side == "west":
        return (x, min(y + GRID * slot, y + height - GRID))
    return (x + width, min(y + GRID * slot, y + height - GRID))


def simplify(points):
    out = [points[0]]
    for pt in points[1:]:
        if pt == out[-1]:
            continue
        if len(out) >= 2:
            ax, ay = out[-2]
            bx, by = out[-1]
            if (ax == bx == pt[0]) or (ay == by == pt[1]):
                out[-1] = pt
                continue
        out.append(pt)
    return out


def add(routed, rel, path, side_a, side_b):
    path = simplify(path)
    start, end = path[0], path[-1]
    routed.append((rel, path, (side_a, start[0], start[1], side_b, end[0], end[1])))


def straight(bounds, rel, horizontal):
    parent, child = rel[0], rel[1]
    ax, ay, aw, ah = bounds[parent]
    bx, by, bw, bh = bounds[child]
    if horizontal:
        y = snap((max(ay, by) + min(ay + ah, by + bh)) / 2)
        y = min(max(y, max(ay, by) + GRID), min(ay + ah, by + bh) - GRID)
        if ax + aw <= bx:
            path = [(ax + aw, y), (bx, y)]
            sides = ("east", "west")
        else:
            path = [(ax, y), (bx + bw, y)]
            sides = ("west", "east")
    else:
        x = snap((max(ax, bx) + min(ax + aw, bx + bw)) / 2)
        x = min(max(x, max(ax, bx) + GRID), min(ax + aw, bx + bw) - GRID)
        if ay + ah <= by:
            path = [(x, ay + ah), (x, by)]
            sides = ("south", "north")
        else:
            path = [(x, ay), (x, by + bh)]
            sides = ("north", "south")
    return rel, path, (sides[0], path[0][0], path[0][1], sides[1], path[-1][0], path[-1][1])


def south_drops(bounds, hub, rels):
    """Pure verticals. Each target x sits on the hub's bottom, so nothing bends and nothing crosses."""
    ux, uy, uw, uh = bounds[hub]
    routed = []
    used = {}
    ordered = []
    for rel in rels:
        other = rel[1] if rel[0] == hub else rel[0]
        ox, oy, ow, oh = bounds[other]
        slot = used.get(other, 0) + 1
        used[other] = slot
        px = min(ox + GRID * slot, ox + ow - GRID)
        ordered.append((px, rel, other, oy if oy > uy else oy + oh))
    ordered.sort()
    for px, rel, other, edge_y in ordered:
        if not (ux + GRID <= px <= ux + uw - GRID):
            raise SystemExit(f"south drop {rel[2]} x={px} is outside {hub}")
        hub_pt = (px, uy + uh)
        other_pt = (px, edge_y)
        path = [hub_pt, other_pt]
        if rel[0] == hub:
            add(routed, rel, path, "south", "north")
        else:
            add(routed, rel, list(reversed(path)), "north", "south")
    return routed


def north_drops(bounds, hub, rels):
    ux, uy, uw, uh = bounds[hub]
    routed = []
    used = {}
    ordered = []
    for rel in rels:
        other = rel[1] if rel[0] == hub else rel[0]
        ox, oy, ow, oh = bounds[other]
        slot = used.get(other, 0) + 1
        used[other] = slot
        px = min(ox + GRID * slot, ox + ow - GRID)
        ordered.append((px, rel, oy + oh))
    for px, rel, bottom in ordered:
        if not (ux + GRID <= px <= ux + uw - GRID):
            raise SystemExit(f"north drop {rel[2]} x={px} is outside {hub}")
        hub_pt = (px, uy)
        other_pt = (px, bottom)
        path = [hub_pt, other_pt]
        if rel[0] == hub:
            add(routed, rel, path, "north", "south")
        else:
            add(routed, rel, list(reversed(path)), "south", "north")
    return routed


def east_bus(bounds, hub, rels):
    """Targets stand to the east. Split above/below the hub center; lane order keeps elbows apart."""
    ux, uy, uw, uh = bounds[hub]
    mid = uy + uh / 2
    used = {}
    items = []
    for rel in rels:
        other = rel[1] if rel[0] == hub else rel[0]
        ox, oy, ow, oh = bounds[other]
        slot = used.get(other, 0) + 1
        used[other] = slot
        py = min(oy + GRID * slot, oy + oh - GRID)
        items.append((py, rel, other, ox, py))
    above = [item for item in items if item[0] < mid]
    below = [item for item in items if item[0] >= mid]
    above.sort()
    below.sort()
    routed = []

    def emit(group, above_group):
        count = len(group)
        for index, (_py, rel, other, ox, py) in enumerate(group):
            if above_group:
                k = index + 1
                hy = uy + GRID * (index + 1)
            else:
                k = len(above) + (count - index)
                hy = uy + uh - GRID * (count - index)
            hy = min(max(hy, uy + GRID), uy + uh - GRID)
            lane = ux + uw + GRID * k
            hub_pt = (ux + uw, hy)
            other_pt = (ox, py)
            path = [hub_pt, (lane, hy), (lane, py), other_pt]
            if rel[0] == hub:
                add(routed, rel, path, "east", "west")
            else:
                add(routed, rel, list(reversed(path)), "west", "east")

    emit(above, True)
    emit(below, False)
    return routed


def channel(bounds, rels, side):
    """Same-row elbows. Shortest span takes the lane nearest the tables; nested spans then stay apart."""
    tables = [table for rel in rels for table in rel[:2]]
    if side == "south":
        base = max(bounds[table][1] + bounds[table][3] for table in tables)
        sign = 1
    else:
        base = min(bounds[table][1] for table in tables)
        sign = -1
    usage = {}
    for rel in rels:
        for end, table in (("p", rel[0]), ("c", rel[1])):
            usage.setdefault(table, []).append((rel, end))
    ports = {}
    for table, items in usage.items():
        x, y, width, height = bounds[table]
        for index, (rel, end) in enumerate(items):
            px = min(x + GRID * (index + 1), x + width - GRID)
            py = y + height if side == "south" else y
            ports[(rel, end)] = (px, py)

    def span(rel):
        return abs(ports[(rel, "p")][0] - ports[(rel, "c")][0])

    routed = []
    for index, rel in enumerate(sorted(rels, key=span)):
        px, py = ports[(rel, "p")]
        qx, qy = ports[(rel, "c")]
        lane = base + sign * GRID * (index + 1)
        path = [(px, py), (px, lane), (qx, lane), (qx, qy)]
        add(routed, rel, path, side, side)
    return routed


def layout():
    bounds = {}
    # Finance sits on top of user so the three user wires are straight verticals.
    # history is above payment, in its own band, so "records" does not enter that gap.
    user_w, user_h = size("user")
    pay_w, pay_h = size("payment")
    hist_w, hist_h = size("payment_history")
    inv_w, inv_h = size("invoice")
    mem_w, mem_h = size("membership")
    pkg_w, pkg_h = size("membership_package")
    room_w, room_h = size("room")
    center_w, center_h = size("center")

    user_x, user_y = 880, 0  # user_y filled after the finance row
    finance_y = hist_h + 64
    gap_x = 32
    cursor = user_x
    for name, width in (
        ("invoice", inv_w),
        ("payment", pay_w),
        ("membership", mem_w),
        ("membership_package", pkg_w),
    ):
        put(bounds, name, cursor, finance_y)
        cursor += width + gap_x
    finance_right = cursor - gap_x
    if finance_right - user_x > user_w:
        raise SystemExit("user is narrower than the finance row")
    pay_x = bounds["payment"][0]
    put(bounds, "payment_history", pay_x, 32)

    user_y = finance_y + pay_h + 16 * 6
    put(bounds, "user", user_x, user_y)
    ux, uy, uw, uh = bounds["user"]

    put(bounds, "center", ux - gap_x - center_w, uy)
    cx = bounds["center"][0]
    put(bounds, "room", cx - gap_x - room_w, uy)

    # East stack. The gap holds one elbow lane per east wire.
    east_names = [
        "role",
        "role_permission",
        "notification",
        "audit_log",
        "consultation_request",
        "support_request",
        "member_body_metric",
        "ai_workout_recommendation",
        "personal_exercise",
        "coach_training_history",
    ]
    east_x = ux + uw + 16 * 14
    east_y = uy
    for name in east_names:
        box = put(bounds, name, east_x, east_y)
        east_y = box[1] + box[3] + 20
    put(bounds, "ai_workout_session", east_x + bounds["ai_workout_recommendation"][2] + 28, bounds["ai_workout_recommendation"][1])

    # Class row, entirely underneath user, so every user wire there is a vertical.
    south_names = [
        "attendance",
        "slot",
        "slot_registration",
        "evaluation",
        "class",
        "class_enrollment",
        "training_plan",
    ]
    south_gap = 32
    south_width = sum(size(name)[0] for name in south_names) + south_gap * (len(south_names) - 1)
    south_x = ux + max(0, (uw - south_width) // 2)
    south_x = snap(south_x)
    south_y = uy + uh + 16 * 4
    row(bounds, south_names, south_x, south_y, south_gap)
    south_bottom = max(bounds[name][1] + bounds[name][3] for name in south_names)

    # assignment sits under evaluation so "evaluates" is a short vertical.
    ev = bounds["evaluation"]
    put(bounds, "assignment", ev[0], south_bottom + 32)
    assign_bottom = bounds["assignment"][1] + bounds["assignment"][3]
    # course sits under class, below assignment, so that vertical misses assignment.
    cl = bounds["class"]
    course_y = assign_bottom + 32
    sport_w = size("sport")[0]
    put(bounds, "sport", cl[0] - sport_w - 24, course_y)
    put(bounds, "course", cl[0], course_y)
    put(bounds, "material", cl[0] + size("course")[0] + 24, course_y)

    course_bottom = max(bounds[name][1] + bounds[name][3] for name in ("assignment", "course", "sport", "material"))
    tail_y = course_bottom + 48
    row(bounds, ["pending_registration", "password_reset"], bounds["room"][0], tail_y, 28)
    return bounds


# Set after the class row is measured. Placeholder replaced in main via layout width check.
USER_W = 1680


def measure_user_width():
    names = [
        "attendance",
        "slot",
        "slot_registration",
        "evaluation",
        "class",
        "class_enrollment",
        "training_plan",
    ]
    total = sum(size(name)[0] for name in names) + 32 * (len(names) - 1)
    finance = (
        size("invoice")[0]
        + size("payment")[0]
        + size("membership")[0]
        + size("membership_package")[0]
        + 32 * 3
    )
    return max(total + 64, finance + 32, 1680)


def route(bounds):
    routed = []
    pairs = [
        ("role", "role_permission", False),
        ("center", "room", True),
        ("center", "user", True),
        ("invoice", "payment", True),
        ("payment", "membership", True),
        ("membership_package", "membership", True),
        ("sport", "course", True),
        ("course", "material", True),
        ("payment", "payment_history", False),
        ("slot", "attendance", True),
        ("slot", "slot_registration", True),
        ("class", "class_enrollment", True),
        ("class", "evaluation", True),
        ("assignment", "evaluation", False),
        ("course", "class", False),
        ("member_body_metric", "ai_workout_recommendation", False),
        ("ai_workout_recommendation", "personal_exercise", False),
        ("ai_workout_recommendation", "ai_workout_session", True),
    ]
    used = set()
    for parent, child, horizontal in pairs:
        rel = next(item for item in RELATIONS if item[0] == parent and item[1] == child and item not in used)
        routed.append(straight(bounds, rel, horizontal))
        used.add(rel)

    def take(parent, child):
        rel = next(item for item in RELATIONS if item[0] == parent and item[1] == child and item not in used)
        used.add(rel)
        return rel

    routed.extend(north_drops(bounds, "user", [
        take("user", "invoice"),
        take("user", "payment"),
        take("user", "membership"),
    ]))
    routed.extend(south_drops(bounds, "user", [
        take("user", "attendance"),
        take("user", "slot_registration"),
        take("user", "evaluation"),
        take("user", "evaluation"),
        take("user", "evaluation"),
        take("user", "class"),
        take("user", "class_enrollment"),
        take("user", "training_plan"),
    ]))
    routed.extend(east_bus(bounds, "user", [
        take("role", "user"),
        take("user", "notification"),
        take("user", "audit_log"),
        take("user", "consultation_request"),
        take("user", "support_request"),
        take("user", "support_request"),
        take("user", "member_body_metric"),
        take("user", "ai_workout_recommendation"),
        take("user", "personal_exercise"),
        take("user", "coach_training_history"),
        take("user", "coach_training_history"),
    ]))
    routed.extend(astar_rest(bounds, routed, used))
    missing = [rel for rel in RELATIONS if rel not in used]
    return routed, missing


def cells_on(path):
    cells = set()
    for (x1, y1), (x2, y2) in zip(path, path[1:]):
        if x1 == x2:
            step = GRID if y2 >= y1 else -GRID
            y = y1
            cells.add((x1, y1))
            while y != y2:
                y += step
                cells.add((x1, y))
        else:
            step = GRID if x2 >= x1 else -GRID
            x = x1
            cells.add((x1, y1))
            while x != x2:
                x += step
                cells.add((x, y1))
    return cells


def blocked_cells(bounds, routed):
    blocked = set()
    for x, y, width, height in bounds.values():
        gx = x
        while gx <= x + width:
            gy = y
            while gy <= y + height:
                blocked.add((gx, gy))
                gy += GRID
            gx += GRID
    for _rel, path, _chosen in routed:
        blocked |= cells_on(path)
    return blocked


def astar_path(start, goal, blocked):
    blocked = set(blocked)
    blocked.discard(start)
    blocked.discard(goal)
    if start == goal:
        return [start]
    limit = 4200

    def h(pt):
        return abs(pt[0] - goal[0]) + abs(pt[1] - goal[1])

    heap = [(h(start), 0, start)]
    dist = {start: 0}
    prev = {}
    seen = 0
    while heap:
        _score, cost, cur = heapq.heappop(heap)
        if cost != dist.get(cur):
            continue
        if cur == goal:
            path = [cur]
            while cur in prev:
                cur = prev[cur]
                path.append(cur)
            path.reverse()
            return path
        seen += 1
        if seen > 250000:
            return None
        cx, cy = cur
        for nxt in ((cx + GRID, cy), (cx - GRID, cy), (cx, cy + GRID), (cx, cy - GRID)):
            nx, ny = nxt
            if nx < 0 or ny < 0 or nx > limit or ny > limit or nxt in blocked:
                continue
            ncost = cost + 1
            if ncost < dist.get(nxt, 10**9):
                dist[nxt] = ncost
                prev[nxt] = cur
                heapq.heappush(heap, (ncost + h(nxt), ncost, nxt))
    return None


def astar_rest(bounds, routed, used):
    """The few long wires walk the open grid around tables and wires already placed."""
    pending = [
        ("room", "slot", "west", "west"),
        ("room", "class", "south", "south"),
        ("class", "slot", "south", "south"),
        ("training_plan", "class", "south", "south"),
        ("slot", "assignment", "south", "west"),
        ("class", "payment", "south", "west"),
        ("training_plan", "ai_workout_recommendation", "east", "south"),
        ("class", "coach_training_history", "east", "south"),
    ]
    blocked = blocked_cells(bounds, routed)
    found = []
    for parent, child, pside, cside in pending:
        rel = next(item for item in RELATIONS if item[0] == parent and item[1] == child and item not in used)
        # Pick a free port. Several slots are tried so a busy border can still be left.
        path = None
        start_side = pside
        end_side = cside
        for slot in range(1, 8):
            start = port(bounds, parent, pside, slot)
            goal = port(bounds, child, cside, slot + 3)
            path = astar_path(start, goal, blocked)
            if path:
                break
        if not path:
            # Try the opposite sides before giving up.
            for alt_a, alt_b in (("north", "north"), ("south", "south"), ("west", "west"), ("east", "east")):
                start = port(bounds, parent, alt_a, 2)
                goal = port(bounds, child, alt_b, 4)
                path = astar_path(start, goal, blocked)
                if path:
                    start_side, end_side = alt_a, alt_b
                    break
        if not path:
            start = port(bounds, parent, pside, 1)
            print("FAIL", rel[2], parent, child, "start", start, "blocked-near",
                  [n for n in ((start[0]+GRID, start[1]), (start[0]-GRID, start[1]), (start[0], start[1]+GRID), (start[0], start[1]-GRID)) if n in blocked])
            continue
        used.add(rel)
        add(found, rel, path, start_side, end_side)
        blocked |= cells_on(path)
    return found


def overlaps(bounds):
    names = list(bounds)
    hits = []
    for i, left in enumerate(names):
        ax, ay, aw, ah = bounds[left]
        for right in names[i + 1 :]:
            bx, by, bw, bh = bounds[right]
            if ax < bx + bw and ax + aw > bx and ay < by + bh and ay + ah > by:
                hits.append((left, right))
    return hits


def main():
    global USER_W
    USER_W = measure_user_width()
    bounds = layout()
    for name in sorted(bounds, key=lambda n: (bounds[n][1], bounds[n][0])):
        x, y, w, h = bounds[name]
        print(f"{name:28} ({x:4},{y:4}) {w:4}x{h:<4} r {x+w:4} b {y+h}")
    hit = overlaps(bounds)
    if hit:
        raise SystemExit(f"overlap {hit}")
    routed, missing = route(bounds)
    problems = validate(bounds, routed)
    labels = place_labels(bounds, routed)
    xs = [x + w for x, y, w, h in bounds.values()]
    ys = [y + h for x, y, w, h in bounds.values()]
    for _rel, path, _chosen in routed:
        xs.extend(point[0] for point in path)
        ys.extend(point[1] for point in path)
    page_w = int(max(xs) + 80)
    page_h = int(max(ys) + 80)
    out = Path(__file__).with_name("logical-anhduysport.drawio")
    out.write_text(drawio(bounds, routed, labels, page_w, page_h), encoding="utf-8")
    ET.parse(out)
    Path(__file__).with_name("_logical_preview.svg").write_text(
        svg_of(bounds, routed, labels, page_w, page_h), encoding="utf-8"
    )
    print(f"routed={len(routed)} missing={len(missing)} problems={len(problems)} page={page_w}x{page_h}")
    for rel in missing:
        print("MISSING", rel[2], rel[0], rel[1])
    shown = 0
    for rel, path, _chosen in routed:
        for seg in _ns["segments_of"](path):
            if _ns["hits_table"](seg, bounds):
                print("COVER", rel[2], rel[0], rel[1], seg)
                shown += 1
                break
        if shown >= 12:
            break
    for item in problems[:40]:
        print("PROBLEM", item)


if __name__ == "__main__":
    main()
