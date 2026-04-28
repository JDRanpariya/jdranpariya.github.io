"""Hand-drawn SVG illustrations for notecard corners.

Each draw_* function returns a raw SVG <g>...</g> string sized to fit
within a ~260x220 bounding box, anchored at (0, 0). The caller translates
the group into position on the card canvas.

Style contract (read before touching):
  * single-color line art (caller supplies `ink`)
  * primary strokes 2.5–3 px, detail strokes 1–1.8 px
  * rounded caps + joins everywhere (hand-drawn feel)
  * fills only as ink @ fill-opacity 0.08–0.18, never solid
  * no text baked into the motif — it would drift when ink changes
  * no circles of radius > ~30 (reads as a button, not a doodle)

Add a new motif:
  1. Write a `draw_<name>(ink: str) -> str` returning '<g>...</g>'
  2. Register it in the RECIPES table in scripts/build-notecards.py
"""

from __future__ import annotations


def _line_style(ink: str) -> str:
    """Common attributes every motif's root <g> should carry."""
    return (
        f'fill="none" stroke="{ink}" '
        f'stroke-linecap="round" stroke-linejoin="round"'
    )


# ---------------------------------------------------------------------------
# Fox — curled sleeping fox
# ---------------------------------------------------------------------------
def draw_fox(ink: str) -> str:
    """Side-view fox curled with tail wrapped around, eye closed."""
    return f"""\
<g {_line_style(ink)}>
  <!-- body outline: curled, tail wraps around head -->
  <path d="M 90 180 C 40 180, 10 150, 10 100
           C 10 60, 40 30, 90 25
           C 140 20, 195 30, 230 60
           C 265 90, 275 130, 245 165
           C 270 150, 295 145, 315 165
           C 335 185, 325 215, 295 220
           C 250 225, 210 215, 175 200
           C 140 188, 120 185, 90 180 Z"
        stroke-width="4" fill="{ink}" fill-opacity="0.08"/>
  <!-- back/neck crease separating head from body -->
  <path d="M 45 115 C 80 90, 135 90, 170 105"
        stroke-width="1.6" opacity="0.55"/>
  <!-- sleeping eye -->
  <path d="M 70 105 C 80 98, 95 98, 105 105" stroke-width="2.5"/>
  <!-- snout + nose -->
  <path d="M 28 122 C 20 120, 16 126, 20 133 C 26 136, 38 133, 38 126"
        stroke-width="2.2"/>
  <circle cx="20" cy="126" r="2.6" fill="{ink}" stroke="none"/>
  <!-- ear -->
  <path d="M 112 60 L 128 30 L 145 65 Z"
        stroke-width="2.5" fill="{ink}" fill-opacity="0.18"/>
  <!-- tail tip fluff -->
  <path d="M 305 190 C 315 185, 330 185, 335 195"
        stroke-width="1.6" opacity="0.55"/>
  <!-- paw tucked -->
  <path d="M 170 200 C 168 212, 166 220, 165 226
           M 200 205 C 198 215, 196 222, 196 228"
        stroke-width="1.8" opacity="0.7"/>
  <!-- three sleep-puffs rising -->
  <circle cx="75"  cy="10"  r="1.8" fill="{ink}" stroke="none" opacity="0.5"/>
  <circle cx="90"  cy="-4"  r="2.2" fill="{ink}" stroke="none" opacity="0.5"/>
  <circle cx="108" cy="-18" r="2.6" fill="{ink}" stroke="none" opacity="0.5"/>
</g>"""


# ---------------------------------------------------------------------------
# Compass rose — cartographer's 8-point, with degree ticks
# ---------------------------------------------------------------------------
def draw_compass(ink: str) -> str:
    """Classic 8-point compass rose with outer tick ring."""
    R_OUTER = 115
    R_TICK_OUT = 110
    R_TICK_IN = 100
    R_INNER = 85

    # Degree ticks: 36 total; every 3rd one is thicker.
    ticks = ""
    for i in range(36):
        w = 2 if i % 3 == 0 else 0.9
        ticks += (
            f'<line x1="{R_TICK_IN}" y1="0" x2="{R_TICK_OUT}" y2="0" '
            f'stroke-width="{w}" transform="rotate({i * 10})"/>'
        )

    return f"""\
<g transform="translate(130 130)" {_line_style(ink)}>
  <!-- outer ring -->
  <circle r="{R_OUTER}" stroke-width="3"/>
  <circle r="{R_TICK_OUT}" stroke-width="1.2" opacity="0.55"/>
  <!-- degree ticks -->
  <g>{ticks}</g>
  <!-- inner ring -->
  <circle r="{R_INNER}" stroke-width="1.6"/>
  <!-- N-arm (filled darker) -->
  <path d="M 0 -{R_INNER} L 10 -14 L 0 0 L -10 -14 Z"
        stroke-width="2.4" fill="{ink}" fill-opacity="0.7"/>
  <path d="M 0 -{R_INNER} L 0 0" stroke-width="1.4"/>
  <!-- S-arm (lighter) -->
  <path d="M 0 {R_INNER} L -10 14 L 0 0 L 10 14 Z"
        stroke-width="2.4" fill="{ink}" fill-opacity="0.22"/>
  <!-- E -->
  <path d="M {R_INNER} 0 L 14 -10 L 0 0 L 14 10 Z"
        stroke-width="2.4" fill="{ink}" fill-opacity="0.32"/>
  <!-- W -->
  <path d="M -{R_INNER} 0 L -14 10 L 0 0 L -14 -10 Z"
        stroke-width="2.4" fill="{ink}" fill-opacity="0.32"/>
  <!-- NE, SE, SW, NW thin -->
  <path d="M 60 -60 L 8 -4 L 0 0 L 4 -8 Z" stroke-width="1.3" opacity="0.75"/>
  <path d="M 60  60 L 4  8 L 0 0 L 8  4 Z" stroke-width="1.3" opacity="0.75"/>
  <path d="M -60  60 L -8  4 L 0 0 L -4  8 Z" stroke-width="1.3" opacity="0.75"/>
  <path d="M -60 -60 L -4 -8 L 0 0 L -8 -4 Z" stroke-width="1.3" opacity="0.75"/>
  <!-- centre pivot -->
  <circle r="4.5" stroke-width="1.6" fill="{ink}"/>
  <!-- compass-point fleur-de-lis on N tip, subtle -->
  <path d="M 0 -{R_INNER - 4} L -3 -{R_INNER + 10} L 0 -{R_INNER + 6} L 3 -{R_INNER + 10} Z"
        stroke-width="1" fill="{ink}" fill-opacity="0.6"/>
</g>"""


# ---------------------------------------------------------------------------
# Rocket — retro-futurist, mid-flight with exhaust
# ---------------------------------------------------------------------------
def draw_rocket(ink: str) -> str:
    """1950s tin-toy rocket tilted up-right, exhaust trailing behind."""
    return f"""\
<g transform="translate(30 200) rotate(-30)" {_line_style(ink)}>
  <!-- main body (capsule shape) -->
  <path d="M 30 60 L 30 -30 C 30 -55, 50 -80, 75 -95 C 100 -80, 120 -55, 120 -30
           L 120 60 Z"
        stroke-width="3" fill="{ink}" fill-opacity="0.09"/>
  <!-- viewport window -->
  <circle cx="75" cy="-30" r="12" stroke-width="2.2"/>
  <circle cx="75" cy="-30" r="7" stroke-width="1.2" opacity="0.6"/>
  <!-- body ring (rivet line) -->
  <path d="M 30 20 L 120 20" stroke-width="1.4" opacity="0.55"/>
  <circle cx="38" cy="20" r="1.3" fill="{ink}" stroke="none"/>
  <circle cx="75" cy="20" r="1.3" fill="{ink}" stroke="none"/>
  <circle cx="112" cy="20" r="1.3" fill="{ink}" stroke="none"/>
  <!-- left fin -->
  <path d="M 30 30 L 5 75 L 30 65 Z"
        stroke-width="2.4" fill="{ink}" fill-opacity="0.18"/>
  <!-- right fin -->
  <path d="M 120 30 L 145 75 L 120 65 Z"
        stroke-width="2.4" fill="{ink}" fill-opacity="0.18"/>
  <!-- centre fin peeking -->
  <path d="M 60 60 L 75 78 L 90 60 Z"
        stroke-width="2" fill="{ink}" fill-opacity="0.25"/>
  <!-- exhaust plume (trailing curls) -->
  <path d="M 75 78 C 70 95, 55 105, 40 112 C 55 110, 68 108, 78 100"
        stroke-width="2" opacity="0.75"/>
  <path d="M 75 78 C 82 98, 90 108, 98 115 C 90 112, 82 108, 78 100"
        stroke-width="2" opacity="0.75"/>
  <!-- speed lines behind -->
  <path d="M -10 0 L 15 10 M -15 20 L 15 28 M -8 40 L 18 48"
        stroke-width="1.4" opacity="0.5"/>
  <!-- trailing stars -->
  <g transform="translate(-40 -40)">
    <path d="M 0 -6 L 1.5 -1.5 L 6 0 L 1.5 1.5 L 0 6 L -1.5 1.5 L -6 0 L -1.5 -1.5 Z"
          stroke-width="1" fill="{ink}" fill-opacity="0.65"/>
  </g>
  <g transform="translate(-70 10)">
    <path d="M 0 -4 L 1 -1 L 4 0 L 1 1 L 0 4 L -1 1 L -4 0 L -1 -1 Z"
          stroke-width="0.8" fill="{ink}" fill-opacity="0.6"/>
  </g>
  <g transform="translate(-20 -80)">
    <path d="M 0 -5 L 1.2 -1.2 L 5 0 L 1.2 1.2 L 0 5 L -1.2 1.2 L -5 0 L -1.2 -1.2 Z"
          stroke-width="0.9" fill="{ink}" fill-opacity="0.55"/>
  </g>
</g>"""


# ---------------------------------------------------------------------------
# Sextant — navigator's brass sextant, profile view
# ---------------------------------------------------------------------------
def draw_sextant(ink: str) -> str:
    """Classic nautical sextant: arc, frame, telescope, index arm."""
    return f"""\
<g transform="translate(30 30)" {_line_style(ink)}>
  <!-- arc (1/6 circle, about 60 degrees) -->
  <path d="M 30 180 A 160 160 0 0 1 190 20"
        stroke-width="3.5"/>
  <path d="M 42 180 A 148 148 0 0 1 188 32"
        stroke-width="1.2" opacity="0.6"/>
  <!-- arc ticks (hand-placed at 5 positions along the arc) -->
  <g stroke="{ink}" stroke-width="1.3" opacity="0.8">
    <line x1="48" y1="178" x2="58" y2="168"/>
    <line x1="68" y1="148" x2="80" y2="140"/>
    <line x1="96" y1="118" x2="108" y2="112"/>
    <line x1="130" y1="88" x2="140" y2="80"/>
    <line x1="168" y1="58" x2="178" y2="50"/>
  </g>
  <!-- triangle frame above arc -->
  <path d="M 30 180 L 110 70 L 190 20" stroke-width="3"/>
  <path d="M 30 180 L 110 70" stroke-width="3"/>
  <!-- pivot circle (apex of triangle) -->
  <circle cx="110" cy="70" r="11" stroke-width="2.2" fill="{ink}" fill-opacity="0.14"/>
  <circle cx="110" cy="70" r="3" fill="{ink}" stroke="none"/>
  <!-- index arm descending to arc -->
  <path d="M 110 70 L 95 175" stroke-width="2.8"/>
  <!-- index arm foot (where it rides arc) -->
  <rect x="88" y="170" width="18" height="14" stroke-width="1.8" fill="{ink}" fill-opacity="0.2"/>
  <!-- telescope mounted on upper frame -->
  <rect x="140" y="30" width="62" height="14" stroke-width="2.2" fill="{ink}" fill-opacity="0.14"
        transform="rotate(-28 171 37)"/>
  <circle cx="208" cy="18" r="6" stroke-width="1.8"/>
  <!-- horizon mirror -->
  <rect x="75" y="108" width="14" height="22" stroke-width="1.8"
        transform="rotate(-32 82 119)" fill="{ink}" fill-opacity="0.25"/>
  <!-- handle at bottom-left -->
  <path d="M 30 180 C 14 184, 6 196, 10 215" stroke-width="3"/>
  <path d="M 10 215 C 18 225, 32 222, 38 215" stroke-width="3"
        fill="{ink}" fill-opacity="0.18"/>
</g>"""


# ---------------------------------------------------------------------------
# Pocket watch — open case, visible face and chain
# ---------------------------------------------------------------------------
def draw_pocket_watch(ink: str) -> str:
    """Open pocket watch with chain trailing up and right."""
    # Generate 12 hour ticks around the face
    import math
    ticks = ""
    for i in range(12):
        a = math.radians(i * 30 - 90)
        x1 = 78 * math.cos(a)
        y1 = 78 * math.sin(a)
        x2 = 88 * math.cos(a)
        y2 = 88 * math.sin(a)
        w = 2.2 if i % 3 == 0 else 1.2
        ticks += (
            f'<line x1="{x1:.1f}" y1="{y1:.1f}" x2="{x2:.1f}" y2="{y2:.1f}" '
            f'stroke-width="{w}"/>'
        )
    return f"""\
<g transform="translate(115 130)" {_line_style(ink)}>
  <!-- outer case ring -->
  <circle r="100" stroke-width="3.5" fill="{ink}" fill-opacity="0.06"/>
  <circle r="92" stroke-width="1.2" opacity="0.55"/>
  <!-- face -->
  <circle r="88" stroke-width="2" fill="{ink}" fill-opacity="0.03"/>
  <!-- hour ticks -->
  <g transform="translate(0 0)">{ticks}</g>
  <!-- hour hand -->
  <path d="M 0 0 L 0 -50" stroke-width="3.2"/>
  <!-- minute hand -->
  <path d="M 0 0 L 58 -30" stroke-width="2.4"/>
  <!-- centre cap -->
  <circle r="5" fill="{ink}" stroke="none"/>
  <circle r="2" fill="{ink}" stroke="none" opacity="0"/>
  <!-- crown (top knob) -->
  <path d="M -6 -100 L -6 -110 L 6 -110 L 6 -100" stroke-width="2.2"
        fill="{ink}" fill-opacity="0.2"/>
  <circle cx="0" cy="-116" r="8" stroke-width="2.2" fill="{ink}" fill-opacity="0.14"/>
  <!-- bow (loop) -->
  <path d="M -5 -124 C -10 -134, 10 -134, 5 -124" stroke-width="2.2"/>
  <!-- chain links trailing up-right -->
  <g transform="translate(0 -128)">
    <circle cx="8" cy="-8" r="4" stroke-width="1.5"/>
    <circle cx="20" cy="-18" r="4" stroke-width="1.5"/>
    <circle cx="32" cy="-30" r="4" stroke-width="1.5"/>
    <circle cx="46" cy="-40" r="4" stroke-width="1.5"/>
    <circle cx="62" cy="-50" r="4" stroke-width="1.5"/>
  </g>
</g>"""


# ---------------------------------------------------------------------------
# Owl on crescent moon — night bird
# ---------------------------------------------------------------------------
def draw_owl_moon(ink: str) -> str:
    """Small round owl perched on a crescent moon, with tiny stars."""
    return f"""\
<g transform="translate(30 30)" {_line_style(ink)}>
  <!-- crescent moon (big, below owl) -->
  <path d="M 40 190 A 90 90 0 1 1 130 100
           A 68 68 0 1 0 40 190 Z"
        stroke-width="2.8" fill="{ink}" fill-opacity="0.14"/>
  <!-- moon craters, decorative -->
  <circle cx="55" cy="175" r="3" stroke-width="1" opacity="0.55"/>
  <circle cx="72" cy="192" r="2" stroke-width="1" opacity="0.55"/>
  <circle cx="35" cy="155" r="2.4" stroke-width="1" opacity="0.55"/>
  <!-- owl body (egg shape) -->
  <g transform="translate(130 90)">
    <path d="M -38 -10 C -40 -52, -20 -70, 0 -70
             C 20 -70, 40 -52, 38 -10
             C 38 25, 22 46, 0 48
             C -22 46, -38 25, -38 -10 Z"
          stroke-width="3" fill="{ink}" fill-opacity="0.18"/>
    <!-- head tuft ears -->
    <path d="M -28 -60 L -32 -72 L -18 -62" stroke-width="2.2"
          fill="{ink}" fill-opacity="0.3"/>
    <path d="M 28 -60 L 32 -72 L 18 -62" stroke-width="2.2"
          fill="{ink}" fill-opacity="0.3"/>
    <!-- eyes: two big rings -->
    <circle cx="-13" cy="-32" r="11" stroke-width="2" fill="{ink}" fill-opacity="0.1"/>
    <circle cx="13"  cy="-32" r="11" stroke-width="2" fill="{ink}" fill-opacity="0.1"/>
    <circle cx="-13" cy="-32" r="4" fill="{ink}" stroke="none"/>
    <circle cx="13"  cy="-32" r="4" fill="{ink}" stroke="none"/>
    <!-- beak -->
    <path d="M 0 -20 L -4 -10 L 4 -10 Z" stroke-width="1.8"
          fill="{ink}" fill-opacity="0.5"/>
    <!-- chest V -->
    <path d="M -12 -5 L 0 18 L 12 -5" stroke-width="1.6" opacity="0.55"/>
    <!-- wing lines -->
    <path d="M -28 0 C -32 15, -30 30, -24 42" stroke-width="1.4" opacity="0.6"/>
    <path d="M 28 0 C 32 15, 30 30, 24 42" stroke-width="1.4" opacity="0.6"/>
    <!-- feet gripping moon -->
    <path d="M -10 46 L -10 56 M -14 56 L -6 56" stroke-width="1.8"/>
    <path d="M 10 46 L 10 56 M 6 56 L 14 56" stroke-width="1.8"/>
  </g>
  <!-- scattered tiny stars -->
  <g stroke="{ink}" fill="{ink}">
    <circle cx="200" cy="30" r="1.6" stroke="none" opacity="0.8"/>
    <circle cx="175" cy="60" r="1" stroke="none" opacity="0.7"/>
    <circle cx="220" cy="90" r="1.2" stroke="none" opacity="0.65"/>
    <circle cx="225" cy="170" r="1" stroke="none" opacity="0.55"/>
  </g>
</g>"""


# ---------------------------------------------------------------------------
# Swallow in flight — forked tail, clean silhouette
# ---------------------------------------------------------------------------
def draw_swallow(ink: str) -> str:
    """Barn swallow mid-flight, wings spread."""
    return f"""\
<g transform="translate(20 90)" {_line_style(ink)}>
  <!-- body -->
  <path d="M 90 80 C 130 65, 160 60, 175 72 C 160 85, 130 90, 90 82 Z"
        stroke-width="2.5" fill="{ink}" fill-opacity="0.24"/>
  <!-- head -->
  <path d="M 175 72 C 188 68, 200 70, 206 76 C 202 84, 188 86, 175 82 Z"
        stroke-width="2" fill="{ink}" fill-opacity="0.4"/>
  <!-- small eye highlight -->
  <circle cx="195" cy="74" r="1.2" fill="{ink}" stroke="none" opacity="0"/>
  <!-- beak -->
  <path d="M 206 76 L 215 74 L 206 80" stroke-width="1.5"
        fill="{ink}" fill-opacity="0.6"/>
  <!-- upper wing (long, sweeping back-left) -->
  <path d="M 140 70 C 110 20, 60 5, 10 20
           C 50 30, 90 50, 130 70 Z"
        stroke-width="2.5" fill="{ink}" fill-opacity="0.22"/>
  <!-- wing feather lines -->
  <path d="M 40 25 C 70 40, 100 55, 130 70
           M 25 28 C 55 42, 85 55, 120 68"
        stroke-width="1" opacity="0.55"/>
  <!-- lower wing hint -->
  <path d="M 130 82 C 100 92, 70 98, 45 92"
        stroke-width="1.8" opacity="0.6" fill="{ink}" fill-opacity="0.1"/>
  <!-- forked tail -->
  <path d="M 90 82 L 40 110 M 90 82 L 45 128 M 90 78 L 30 100"
        stroke-width="1.8"/>
  <path d="M 90 82 L 40 110 L 55 104 L 45 128 Z"
        stroke-width="2" fill="{ink}" fill-opacity="0.25"/>
  <!-- tiny flight motion marks behind -->
  <path d="M 15 60 L 25 62 M 5 75 L 18 75 M 12 90 L 22 88"
        stroke-width="1.2" opacity="0.45"/>
</g>"""


# ---------------------------------------------------------------------------
# Vintage postage stamp — perforated border, small interior vignette
# ---------------------------------------------------------------------------
def draw_stamp(ink: str, accent: str | None = None) -> str:
    """Postage stamp with perforations, border, mountain vignette.

    `accent` — second ink for the postmark cancellation (defaults to main ink).
    """
    accent = accent or ink
    perfs_top = "".join(
        f'<circle cx="{x}" cy="0" r="4.5" fill="white" stroke="{ink}" stroke-width="0.8"/>'
        for x in range(12, 229, 16)
    )
    perfs_bot = "".join(
        f'<circle cx="{x}" cy="168" r="4.5" fill="white" stroke="{ink}" stroke-width="0.8"/>'
        for x in range(12, 229, 16)
    )
    perfs_l = "".join(
        f'<circle cx="0" cy="{y}" r="4.5" fill="white" stroke="{ink}" stroke-width="0.8"/>'
        for y in range(12, 169, 16)
    )
    perfs_r = "".join(
        f'<circle cx="226" cy="{y}" r="4.5" fill="white" stroke="{ink}" stroke-width="0.8"/>'
        for y in range(12, 169, 16)
    )
    return f"""\
<g transform="translate(20 40)" {_line_style(ink)}>
  <!-- stamp body -->
  <rect x="0" y="0" width="226" height="168" rx="2"
        stroke-width="2" fill="{ink}" fill-opacity="0.04"/>
  <!-- perforations -->
  {perfs_top}{perfs_bot}{perfs_l}{perfs_r}
  <!-- inner frame -->
  <rect x="12" y="12" width="202" height="144" stroke-width="1.4" fill="none"/>
  <rect x="18" y="18" width="190" height="132" stroke-width="0.8" fill="none" opacity="0.55"/>
  <!-- interior vignette: mountain + sun -->
  <g transform="translate(113 100)">
    <!-- sun -->
    <circle cx="-28" cy="-28" r="13" stroke-width="1.6"/>
    <g stroke-width="1" opacity="0.65">
      <line x1="-28" y1="-50" x2="-28" y2="-60"/>
      <line x1="-50" y1="-28" x2="-60" y2="-28"/>
      <line x1="-14" y1="-14" x2="-6" y2="-6"/>
      <line x1="-42" y1="-14" x2="-50" y2="-6"/>
    </g>
    <!-- ridge -->
    <path d="M -68 26 L -32 -10 L -8 18 L 22 -14 L 60 30 Z"
          stroke-width="1.8" fill="{ink}" fill-opacity="0.18"/>
    <!-- ground line -->
    <line x1="-70" y1="30" x2="68" y2="30" stroke-width="1.4"/>
  </g>
  <!-- denomination -->
  <text x="28" y="40" font-family="Georgia, serif" font-size="16"
        font-style="italic" fill="{ink}" stroke="none">10¢</text>
  <!-- POSTAGE label -->
  <text x="196" y="148" font-family="Georgia, serif" font-size="9"
        letter-spacing="2" fill="{ink}" stroke="none" text-anchor="end">POSTAGE</text>
  <!-- cancellation postmark, tilted on top-right corner -->
  <g transform="translate(200 -10) rotate(-18)" stroke="{accent}" opacity="0.7"
     fill="none" stroke-linecap="round">
    <circle r="42" stroke-width="2.5"/>
    <circle r="36" stroke-width="1.2"/>
    <path d="M -32 0 L 32 0" stroke-width="1.8"/>
    <path d="M -32 8 L 32 8" stroke-width="1.2"/>
    <text x="0" y="-16" font-family="Georgia, serif" font-size="9" font-weight="bold"
          fill="{accent}" stroke="none" letter-spacing="2" text-anchor="middle">POSTED</text>
    <text x="0" y="22" font-family="Georgia, serif" font-size="9" font-weight="bold"
          fill="{accent}" stroke="none" letter-spacing="2" text-anchor="middle">MMXXVI</text>
  </g>
</g>"""


# ---------------------------------------------------------------------------
# Fountain pen + ink bottle — writing desk
# ---------------------------------------------------------------------------
def draw_pen_inkbottle(ink: str) -> str:
    """Capped fountain pen leaning against an ink bottle."""
    return f"""\
<g transform="translate(30 30)" {_line_style(ink)}>
  <!-- ink bottle body -->
  <path d="M 20 110 L 20 185 C 20 200, 30 208, 50 208
           L 110 208 C 130 208, 140 200, 140 185 L 140 110 Z"
        stroke-width="3" fill="{ink}" fill-opacity="0.16"/>
  <!-- shoulder -->
  <path d="M 20 110 L 32 95 L 128 95 L 140 110 Z"
        stroke-width="2.5" fill="{ink}" fill-opacity="0.24"/>
  <!-- neck -->
  <rect x="58" y="72" width="44" height="24" stroke-width="2.2"
        fill="{ink}" fill-opacity="0.2"/>
  <!-- cork stopper -->
  <rect x="62" y="58" width="36" height="16" stroke-width="2" rx="2"
        fill="{ink}" fill-opacity="0.45"/>
  <!-- label on body -->
  <rect x="40" y="140" width="80" height="42" stroke-width="1.6"
        fill="none"/>
  <path d="M 50 152 L 110 152 M 50 162 L 100 162 M 50 172 L 90 172"
        stroke-width="1" opacity="0.55"/>
  <!-- ink line inside bottle -->
  <path d="M 22 160 C 60 155, 100 162, 138 158" stroke-width="1.2" opacity="0.6"/>
  <!-- pen leaning against right side of bottle -->
  <g transform="translate(148 180) rotate(-60)">
    <!-- barrel -->
    <rect x="0" y="-8" width="80" height="16" rx="4" stroke-width="2.4"
          fill="{ink}" fill-opacity="0.3"/>
    <!-- cap -->
    <rect x="80" y="-10" width="36" height="20" rx="3" stroke-width="2.4"
          fill="{ink}" fill-opacity="0.55"/>
    <!-- clip on cap -->
    <path d="M 94 -10 L 94 8 L 98 4" stroke-width="1.5"/>
    <!-- nib at other end -->
    <path d="M 0 -8 L -18 0 L 0 8 Z" stroke-width="2"
          fill="{ink}" fill-opacity="0.7"/>
    <path d="M -12 0 L 0 0" stroke-width="1"/>
  </g>
</g>"""


# ---------------------------------------------------------------------------
# Hare and wheat — field journal
# ---------------------------------------------------------------------------
def draw_hare_wheat(ink: str) -> str:
    """Sitting hare profile with wheat stalks behind."""
    return f"""\
<g transform="translate(30 30)" {_line_style(ink)}>
  <!-- three wheat stalks (behind hare) -->
  <g stroke-width="1.8" opacity="0.7">
    <path d="M 190 200 C 188 150, 186 100, 180 55"/>
    <path d="M 210 200 C 212 155, 214 105, 208 50"/>
    <path d="M 230 200 C 232 160, 234 110, 230 60"/>
  </g>
  <!-- wheat grains (stalk 1) -->
  <g fill="{ink}" fill-opacity="0.35" stroke="{ink}" stroke-width="1">
    <ellipse cx="180" cy="55" rx="3.5" ry="7"/>
    <ellipse cx="175" cy="68" rx="3" ry="6" transform="rotate(-20 175 68)"/>
    <ellipse cx="186" cy="72" rx="3" ry="6" transform="rotate(20 186 72)"/>
    <ellipse cx="172" cy="82" rx="3" ry="6" transform="rotate(-20 172 82)"/>
    <ellipse cx="188" cy="86" rx="3" ry="6" transform="rotate(20 188 86)"/>
  </g>
  <!-- wheat grains (stalk 2, shorter) -->
  <g fill="{ink}" fill-opacity="0.35" stroke="{ink}" stroke-width="1">
    <ellipse cx="208" cy="50" rx="3.5" ry="7"/>
    <ellipse cx="203" cy="63" rx="3" ry="6" transform="rotate(-20 203 63)"/>
    <ellipse cx="214" cy="67" rx="3" ry="6" transform="rotate(20 214 67)"/>
  </g>
  <!-- wheat grains (stalk 3) -->
  <g fill="{ink}" fill-opacity="0.35" stroke="{ink}" stroke-width="1">
    <ellipse cx="230" cy="60" rx="3.5" ry="7"/>
    <ellipse cx="225" cy="73" rx="3" ry="6" transform="rotate(-20 225 73)"/>
    <ellipse cx="236" cy="77" rx="3" ry="6" transform="rotate(20 236 77)"/>
  </g>
  <!-- hare body — sitting upright, profile facing left -->
  <path d="M 50 210
           C 30 210, 20 190, 25 160
           C 30 130, 45 110, 55 100
           C 60 90, 58 75, 52 60
           C 48 45, 52 28, 65 22
           C 78 18, 90 26, 92 40
           C 93 50, 88 60, 82 68
           C 90 62, 100 60, 115 64
           C 135 70, 145 85, 142 110
           C 140 135, 130 160, 135 185
           C 138 205, 120 212, 95 210 Z"
        stroke-width="3" fill="{ink}" fill-opacity="0.1"/>
  <!-- long ear -->
  <path d="M 68 28 C 60 0, 56 -20, 60 -35 C 64 -20, 70 0, 74 25"
        stroke-width="2.5" fill="{ink}" fill-opacity="0.24"/>
  <!-- second ear hint -->
  <path d="M 78 30 C 74 12, 72 -2, 76 -14" stroke-width="2" opacity="0.7"/>
  <!-- eye -->
  <circle cx="72" cy="54" r="2.6" fill="{ink}" stroke="none"/>
  <!-- nose/mouth -->
  <path d="M 58 70 C 54 68, 52 72, 56 74" stroke-width="1.6"/>
  <circle cx="54" cy="72" r="1.3" fill="{ink}" stroke="none"/>
  <!-- whiskers -->
  <path d="M 54 74 L 32 70 M 54 78 L 28 78 M 56 80 L 30 86"
        stroke-width="0.9" opacity="0.55"/>
  <!-- front paw tucked -->
  <path d="M 78 178 C 76 198, 70 208, 70 208" stroke-width="1.6" opacity="0.65"/>
  <path d="M 105 180 C 103 200, 98 210, 98 210" stroke-width="1.6" opacity="0.65"/>
  <!-- chest fluff line -->
  <path d="M 90 100 C 80 115, 75 130, 80 150" stroke-width="1.2" opacity="0.55"/>
</g>"""
