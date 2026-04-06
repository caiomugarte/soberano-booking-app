#!/usr/bin/env python3
"""
Convert a barber's .ics calendar file into INSERT SQL for customers + appointments.

Only imports events up to and including today (historical records).

Usage:
    python ics_to_sql.py appointments_joao.ics --barber-id <uuid> [--output out.sql]

Requirements:
    pip install icalendar
"""

import argparse
import hashlib
import re
import sys
import uuid
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

try:
    from icalendar import Calendar
except ImportError:
    print("ERROR: icalendar package not found. Run: pip install icalendar")
    sys.exit(1)


# ---------------------------------------------------------------------------
# SERVICE MAPPING — keyword → (uuid, price_cents)
# Keywords are matched case-insensitively against the event description/summary.
# Longer keywords are tried first, so "cabelo e barba" wins over "cabelo".
# ---------------------------------------------------------------------------
SERVICES: dict[str, tuple[str, int]] = {
    "cabelo, barba e depilacao": ("0be6fffa-303b-46bf-acd4-37c7d44de037", 10000),
    "cabelo, barba e depilação": ("0be6fffa-303b-46bf-acd4-37c7d44de037", 10000),
    "novo de novo":              ("414484c7-884b-4a7e-9217-f7748e6320c9", 12000),
    "cabelo e sobrancelha":      ("7eda7062-90a0-45ef-ae13-9a3988b4c603",  7000),
    "barba e sobrancelha":       ("daa3a00c-1a76-49dd-855a-0d0d1e4faeda",  7000),
    "cabelo e depilacao":        ("ff5bc89d-0887-402f-a1ce-ad87f30991ab",  7000),
    "cabelo e depilação":        ("ff5bc89d-0887-402f-a1ce-ad87f30991ab",  7000),
    "barba e depilacao":         ("9b4efdcc-9852-4004-b0f6-a9302a66b6c4",  7000),
    "barba e depilação":         ("9b4efdcc-9852-4004-b0f6-a9302a66b6c4",  7000),
    "cabelo e barba":            ("bd44b608-24f5-45f4-a8f4-2db93e8399ac",  8000),
    "corte e barba":             ("bd44b608-24f5-45f4-a8f4-2db93e8399ac",  8000),
    "lavagem e penteado":        ("61840fc4-5d0b-4626-8719-e40aa35a8b38",  2000),
    "cabelo":                    ("9ad35d39-d3dd-49b2-ba9d-43012e11b8c8",  5000),
    "corte":                     ("9ad35d39-d3dd-49b2-ba9d-43012e11b8c8",  5000),
    "barba":                     ("961085f8-14f3-45ed-b4d4-65209e86ff73",  5000),
}
# ---------------------------------------------------------------------------


def match_service(text: str) -> tuple[str, int] | None:
    """Returns (service_id, price_cents) or None if no match."""
    text = text.lower()
    for keyword in sorted(SERVICES, key=len, reverse=True):
        if keyword in text:
            return SERVICES[keyword]
    return None


def normalize_phone(raw: str) -> str:
    """Strip everything except digits, remove Brazilian country code (55)."""
    digits = re.sub(r"\D", "", raw)
    if digits.startswith("55") and len(digits) > 11:
        digits = digits[2:]
    return digits[:20]


def parse_customer(summary: str, description: str) -> tuple[str | None, str | None]:
    """
    Extract (name, phone) from event text.
    Tries common patterns like:
      - "Cliente: João / Fone: 11999998888"
      - "Nome: João Silva\nTelefone: (11) 99999-8888"
      - First line = name, second line = phone
    Returns (name, phone) or (None, None) if not found.
    """
    text = summary + "\n" + description

    # Explicit labeled fields
    name_match  = re.search(r"(?:nome|cliente|name)\s*[:\-]\s*(.+)", text, re.IGNORECASE)
    phone_match = re.search(r"(?:fone|telefone|celular|phone|whatsapp|tel)\s*[:\-]\s*([\d\s()\-+]+)", text, re.IGNORECASE)

    name  = name_match.group(1).strip()  if name_match  else None
    phone = phone_match.group(1).strip() if phone_match else None

    # Fallback: look for any 10-11 digit sequence as phone
    if phone is None:
        m = re.search(r"(?<!\d)(\d[\d\s()\-]{8,14}\d)(?!\d)", text)
        if m:
            phone = m.group(1).strip()

    if phone:
        phone = normalize_phone(phone)

    return name, phone


def deterministic_uuid(phone: str) -> str:
    """Generate a stable UUID v5 from a phone number (namespace = DNS)."""
    return str(uuid.uuid5(uuid.NAMESPACE_DNS, f"customer:{phone}"))


def to_date(dt) -> date:
    if isinstance(dt, datetime):
        return dt.date()
    if isinstance(dt, date):
        return dt
    raise ValueError(f"Cannot convert {type(dt)}")


def parse_ics(path: Path, barber_id: str, date_from: date, date_to: date, utc_offset: int = 0) -> tuple[list[dict], list[dict]]:
    """Returns (customers, appointments) lists — only for events within [date_from, date_to]."""
    with open(path, "rb") as f:
        cal = Calendar.from_ical(f.read())

    customers: dict[str, dict] = {}  # phone → customer row (deduped)
    appointments: list[dict] = []
    skipped = 0

    for component in cal.walk():
        if component.name != "VEVENT":
            continue

        dtstart = component.get("DTSTART")
        if dtstart is None:
            continue

        event_date = to_date(dtstart.dt)
        if not (date_from <= event_date <= date_to):
            skipped += 1
            continue

        summary     = str(component.get("SUMMARY", ""))
        description = str(component.get("DESCRIPTION", ""))
        dtend       = component.get("DTEND")

        dt_start   = dtstart.dt
        dt_end     = dtend.dt if dtend else None

        if isinstance(dt_start, date) and not isinstance(dt_start, datetime):
            dt_start = datetime(dt_start.year, dt_start.month, dt_start.day)
        if dt_end and isinstance(dt_end, date) and not isinstance(dt_end, datetime):
            dt_end = datetime(dt_end.year, dt_end.month, dt_end.day)

        # Apply UTC offset to convert stored UTC times to local time
        if utc_offset:
            offset = timedelta(hours=utc_offset)
            dt_start = dt_start + offset
            if dt_end:
                dt_end = dt_end + offset

        # Re-evaluate event_date after offset (appointment might shift to previous/next day)
        event_date = dt_start.date()

        start_time = dt_start.strftime("%H:%M")
        end_time   = dt_end.strftime("%H:%M") if dt_end else "00:00"

        match = match_service(summary + " " + description)
        if match is None:
            print(f"WARNING: no service matched for '{summary}' on {event_date} — skipping", file=sys.stderr)
            continue
        service_id, price_cents = match

        name, phone = parse_customer(summary, description)
        if not phone:
            print(f"WARNING: no phone found for '{summary}' on {event_date} — skipping", file=sys.stderr)
            continue
        if not name:
            name = summary.strip() or "Importado"

        customer_id = deterministic_uuid(phone)
        if phone not in customers:
            customers[phone] = {"id": customer_id, "name": name, "phone": phone}

        cancel_token = hashlib.sha256(
            f"{barber_id}:{event_date.isoformat()}:{start_time}".encode()
        ).hexdigest()

        appointments.append({
            "barber_id":    barber_id,
            "service_id":   service_id,
            "customer_id":  customer_id,
            "date":         event_date.isoformat(),
            "start_time":   start_time,
            "end_time":     end_time,
            "price_cents":  price_cents,
            "status":       "completed",
            "cancel_token": cancel_token,
            "summary":      summary,
        })

    print(f"Parsed {len(appointments)} events ({date_from} → {date_to}), skipped {skipped} out of range.", file=sys.stderr)
    return list(customers.values()), appointments


def esc(s: str) -> str:
    return s.replace("'", "''")


def generate_sql(customers: list[dict], appointments: list[dict]) -> str:
    lines = [
        "-- Generated by ics_to_sql.py",
        f"-- {len(customers)} customer(s), {len(appointments)} appointment(s)",
        "",
        "-- CUSTOMERS (upsert by phone — preserves existing records)",
    ]

    for c in customers:
        lines.append(
            f"INSERT INTO customers (id, name, phone) VALUES ("
            f"'{c['id']}', '{esc(c['name'])}', '{esc(c['phone'])}') "
            f"ON CONFLICT (phone) DO NOTHING;"
        )

    lines += ["", "-- APPOINTMENTS"]

    for a in appointments:
        lines.append(f"-- {a['summary']}")
        lines.append(
            f"INSERT INTO appointments "
            f"(id, barber_id, service_id, customer_id, date, start_time, end_time, price_cents, status, cancel_token) VALUES ("
            f"gen_random_uuid(), "
            f"'{a['barber_id']}', "
            f"'{a['service_id']}', "
            f"'{a['customer_id']}', "
            f"'{a['date']}', "
            f"'{a['start_time']}', "
            f"'{a['end_time']}', "
            f"{a['price_cents']}, "
            f"'{a['status']}', "
            f"'{a['cancel_token']}'"
            f");"
        )
        lines.append("")

    return "\n".join(lines)


def main():
    parser = argparse.ArgumentParser(description="Convert a barber's .ics to appointment SQL")
    parser.add_argument("ics_file",    help="Path to the .ics file")
    parser.add_argument("--barber-id", required=True, help="UUID of the barber from the barbers table")
    parser.add_argument("--from", dest="date_from", metavar="YYYY-MM-DD", help="Start date (inclusive), default: no lower bound")
    parser.add_argument("--to",   dest="date_to",   metavar="YYYY-MM-DD", help="End date (inclusive), default: today")
    parser.add_argument("--utc-offset", type=int, default=0, metavar="HOURS", help="UTC offset of the barbershop (e.g. -4 for UTC-4). Default: 0")
    parser.add_argument("--output", "-o", help="Output .sql file (default: stdout)")
    args = parser.parse_args()

    path = Path(args.ics_file)
    if not path.exists():
        print(f"ERROR: file not found: {path}", file=sys.stderr)
        sys.exit(1)

    try:
        date_from = date.fromisoformat(args.date_from) if args.date_from else date.min
        date_to   = date.fromisoformat(args.date_to)   if args.date_to   else date.today()
    except ValueError as e:
        print(f"ERROR: invalid date — {e}", file=sys.stderr)
        sys.exit(1)

    customers, appointments = parse_ics(path, args.barber_id, date_from, date_to, args.utc_offset)

    sql = generate_sql(customers, appointments)

    if args.output:
        Path(args.output).write_text(sql)
        print(f"Written to {args.output}", file=sys.stderr)
    else:
        print(sql)


if __name__ == "__main__":
    main()
