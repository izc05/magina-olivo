#!/usr/bin/env python3
import re
import subprocess
import sys
import xml.etree.ElementTree as ET


def texts(root):
    return {item.attrib.get("text", "") for item in root.iter("node")}


def tap_text(xml_path, target_text):
    root = ET.parse(xml_path).getroot()
    node = next(
        (
            item
            for item in root.iter("node")
            if item.attrib.get("text") == target_text
        ),
        None,
    )
    if node is None:
        raise SystemExit(f"UI_TEXT_NOT_FOUND:{target_text}")

    bounds = node.attrib.get("bounds", "")
    match = re.fullmatch(r"\[(\d+),(\d+)\]\[(\d+),(\d+)\]", bounds)
    if match is None:
        raise SystemExit(f"INVALID_UI_BOUNDS:{bounds}")

    x1, y1, x2, y2 = map(int, match.groups())
    subprocess.run(
        [
            "adb",
            "shell",
            "input",
            "tap",
            str((x1 + x2) // 2),
            str((y1 + y2) // 2),
        ],
        check=True,
    )


def assert_texts(xml_path, required):
    root = ET.parse(xml_path).getroot()
    missing = sorted(set(required) - texts(root))
    if missing:
        raise SystemExit("UI_TEXTS_MISSING:" + ",".join(missing))


def main():
    if len(sys.argv) < 4:
        raise SystemExit(
            "USAGE: android-smoke-ui.py <tap|assert> <xml-path> <text...>"
        )

    command = sys.argv[1]
    xml_path = sys.argv[2]
    values = sys.argv[3:]

    if command == "tap":
        if len(values) != 1:
            raise SystemExit("TAP_REQUIRES_ONE_TEXT")
        tap_text(xml_path, values[0])
    elif command == "assert":
        assert_texts(xml_path, values)
    else:
        raise SystemExit(f"UNKNOWN_COMMAND:{command}")


if __name__ == "__main__":
    main()
