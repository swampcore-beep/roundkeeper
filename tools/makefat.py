#!/usr/bin/env python3
"""Join Mac programs for Intel and Apple Silicon into one universal program, like Apple's lipo.

  python3 tools/makefat.py OUT IN-x86_64 IN-arm64

Each input is a 64-bit Mach-O executable (as `go build` makes for darwin/amd64 and darwin/arm64,
already ad-hoc signed by Go's linker). They are copied unchanged into a "fat" file: a short header
that lists the slices, then each slice at a 16 KB boundary. The Mac runs the slice for its own CPU.
Standard library only, so the release workflow needs nothing extra.
"""
import os, struct, sys

FAT_MAGIC = 0xCAFEBABE
MH_MAGIC_64 = 0xFEEDFACF
ALIGN = 14  # 2**14 = 16 KB, what lipo uses for both kinds


def slice_info(data, path):
    magic, cputype, cpusub = struct.unpack_from("<III", data, 0)
    if magic != MH_MAGIC_64:
        sys.exit(f"makefat: {path} is not a 64-bit Mach-O program")
    return cputype, cpusub & 0x00FFFFFF  # without the capability bits, as lipo writes them


def main():
    if len(sys.argv) < 4:
        sys.exit(__doc__)
    out, ins = sys.argv[1], sys.argv[2:]
    slices = []
    for p in ins:
        with open(p, "rb") as f:
            d = f.read()
        slices.append((p, d) + slice_info(d, p))
    if len({s[2] for s in slices}) != len(slices):
        sys.exit("makefat: two programs for the same CPU")
    head = struct.pack(">II", FAT_MAGIC, len(slices))
    offset = len(head) + 20 * len(slices)
    entries, body = [], []
    for p, d, cputype, cpusub in slices:
        pad = (-offset) % (1 << ALIGN)
        offset += pad
        body.append(b"\0" * pad)
        entries.append(struct.pack(">IIIII", cputype, cpusub, offset, len(d), ALIGN))
        body.append(d)
        offset += len(d)
    with open(out, "wb") as f:
        f.write(head + b"".join(entries) + b"".join(body))
    os.chmod(out, 0o755)  # a program: the zip keeps this, so a double-click can run it
    print(f"makefat: {out} with {len(slices)} slices, {offset:,} bytes")


if __name__ == "__main__":
    main()
