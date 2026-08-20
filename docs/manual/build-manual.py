#!/usr/bin/env python3
"""
Builds the Swaranjali teaching manual as a PDF.

The audience is a harmonium teacher who has never seen this instrument and
needs to plan lessons around it: what it can do, what it cannot, and where it
differs from the real thing in ways that matter to teaching.

    python3 docs/manual/build-manual.py
"""

from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    BaseDocTemplate,
    Frame,
    KeepTogether,
    NextPageTemplate,
    PageBreak,
    PageTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
)

OUT = Path(__file__).resolve().parents[2] / "Swaranjali-teaching-manual.pdf"

# The app's palette, so the document belongs to the same object.
WOOD_DEEP = colors.HexColor("#2A1A12")
WOOD_BODY = colors.HexColor("#4A2E1D")
BRASS = colors.HexColor("#8A6234")
INK = colors.HexColor("#1A1512")
INK_SOFT = colors.HexColor("#6B5B48")
PAPER = colors.HexColor("#FBF7EF")
RULE = colors.HexColor("#D8CBB4")

styles = getSampleStyleSheet()


def style(name, **kwargs):
    kwargs.setdefault("parent", styles["Normal"])
    return ParagraphStyle(name, **kwargs)


BODY = style(
    "Body", fontName="Times-Roman", fontSize=10.5, leading=15.5,
    textColor=INK, spaceAfter=7, alignment=TA_LEFT,
)
LEAD = style(
    "Lead", parent=BODY, fontSize=12, leading=17.5, textColor=WOOD_BODY, spaceAfter=11,
)
H1 = style(
    "H1", fontName="Times-Bold", fontSize=19, leading=23,
    textColor=WOOD_DEEP, spaceBefore=4, spaceAfter=10,
)
H2 = style(
    "H2", fontName="Times-Bold", fontSize=13, leading=17,
    textColor=WOOD_BODY, spaceBefore=13, spaceAfter=5,
)
NOTE = style(
    "Note", parent=BODY, fontSize=9.8, leading=14, textColor=INK_SOFT,
    leftIndent=9, spaceBefore=3,
)
BULLET = style("Bullet", parent=BODY, leftIndent=13, bulletIndent=3, spaceAfter=4)
CAPTION = style(
    "Caption", parent=BODY, fontSize=9, leading=12.5, textColor=INK_SOFT, spaceAfter=10,
)


def page_furniture(canvas, doc):
    canvas.saveState()
    canvas.setFillColor(PAPER)
    canvas.rect(0, 0, A4[0], A4[1], stroke=0, fill=1)
    canvas.setStrokeColor(RULE)
    canvas.setLineWidth(0.5)
    canvas.line(20 * mm, 16 * mm, A4[0] - 20 * mm, 16 * mm)
    canvas.setFont("Times-Roman", 8.5)
    canvas.setFillColor(INK_SOFT)
    canvas.drawString(20 * mm, 11 * mm, "Swaranjali - a digital harmonium")
    canvas.drawRightString(A4[0] - 20 * mm, 11 * mm, str(canvas.getPageNumber()))
    canvas.restoreState()


def cover_furniture(canvas, doc):
    canvas.saveState()
    canvas.setFillColor(WOOD_DEEP)
    canvas.rect(0, 0, A4[0], A4[1], stroke=0, fill=1)
    # The app's mark: a bowl holding a single note.
    cx, cy, r = A4[0] / 2, A4[1] - 78 * mm, 15 * mm
    canvas.setStrokeColor(colors.HexColor("#B8874A"))
    canvas.setLineWidth(2.4)
    canvas.setLineCap(1)
    canvas.arc(cx - r, cy - r, cx + r, cy + r, 190, 160)
    canvas.setFillColor(colors.HexColor("#B8874A"))
    canvas.circle(cx, cy + r * 0.78, r * 0.29, stroke=0, fill=1)
    canvas.restoreState()


def bullets(items, s=BULLET):
    return [Paragraph(text, s, bulletText="•") for text in items]


def table(rows, widths, header=True):
    t = Table(rows, colWidths=widths, hAlign="LEFT")
    commands = [
        ("FONTNAME", (0, 0), (-1, -1), "Times-Roman"),
        ("FONTSIZE", (0, 0), (-1, -1), 9.3),
        ("LEADING", (0, 0), (-1, -1), 12.5),
        ("TEXTCOLOR", (0, 0), (-1, -1), INK),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("LINEBELOW", (0, 0), (-1, -2), 0.4, RULE),
    ]
    if header:
        commands += [
            ("FONTNAME", (0, 0), (-1, 0), "Times-Bold"),
            ("TEXTCOLOR", (0, 0), (-1, 0), WOOD_BODY),
            ("LINEBELOW", (0, 0), (-1, 0), 0.9, BRASS),
        ]
    t.setStyle(TableStyle(commands))
    return t


story = []
A = story.append


# ---------------------------------------------------------------- cover ----
A(Spacer(1, 92 * mm))
A(Paragraph(
    "Swaranjali",
    style("CoverTitle", fontName="Times-Bold", fontSize=40, leading=44,
          textColor=colors.HexColor("#EDE4D2"), alignment=1),
))
A(Spacer(1, 5 * mm))
A(Paragraph(
    "A digital harmonium, and how to teach with it",
    style("CoverSub", fontName="Times-Italic", fontSize=14, leading=19,
          textColor=colors.HexColor("#B8874A"), alignment=1),
))
A(Spacer(1, 34 * mm))
A(Paragraph(
    "Notes for the teacher<br/><br/>"
    "This document describes an instrument your student practises on: what it is, "
    "what it does well, and — most importantly — the specific places where it does "
    "not behave like the harmonium you know.",
    style("CoverBody", fontName="Times-Roman", fontSize=11, leading=17,
          textColor=colors.HexColor("#C9BCA4"), alignment=1,
          leftIndent=28 * mm, rightIndent=28 * mm),
))
A(NextPageTemplate("body"))
A(PageBreak())


# ------------------------------------------------------------ section 1 ----
A(Paragraph("1. What this instrument is", H1))
A(Paragraph(
    "Swaranjali is a harmonium that runs on an iPad. It is not a recording of a harmonium "
    "and not a general-purpose keyboard app: the sound is generated from a model of a brass "
    "free reed, and the air that drives those reeds is simulated, including running out.",
    LEAD,
))
A(Paragraph(
    "Your student is a beginner teaching themselves Indian vocal music and harmonium from "
    "scratch, intending to buy a real instrument later. The app was built on one governing "
    "principle, which is worth stating plainly because it shapes what you can ask of it: "
    "<b>nothing here should teach a habit that has to be unlearned on a real harmonium.</b>",
    BODY,
))

A(Paragraph("At a glance", H2))
A(table([
    ["", ""],
    ["Instrument", "Digital harmonium, three reed banks, nine stops and a master"],
    ["Played on", "iPad in landscape; iPhone in landscape as a smaller instrument"],
    ["Right hand", "Melody on the on-screen keys"],
    ["Left hand", "Pumps a paddle that fills an air reservoir"],
    ["Accompaniment", "Drone stops and a rhythm cycle with synthesised tabla"],
    ["Also does", "Records the session, optionally with the student's voice"],
    ["Needs", "No internet after first use. Works in aeroplane mode."],
][1:], [30 * mm, 118 * mm], header=False))

A(Paragraph("2. The three things that differ from a real harmonium", H1))
A(Paragraph(
    "If you read only one section, read this one. These are the differences that change how "
    "you would teach.",
    LEAD,
))

A(Paragraph("The keys are smaller", H2))
A(Paragraph(
    "A real harmonium white key is about 21 mm wide. On an iPad screen there is only about "
    "227 mm of width, so at full size only ten or eleven keys would fit. The default setting "
    "shows fifteen white keys at about 15 mm each - roughly 72% of real size.",
    BODY,
))
A(Paragraph(
    "There is a <b>Wide</b> setting in Settings that shows eleven keys at about 20.6 mm, which "
    "is within half a millimetre of a real harmonium. It costs range. If your teaching depends "
    "on finger spacing transferring exactly to a real instrument, ask the student to switch to "
    "Wide. If it depends on reaching across two octaves, leave it on Standard.",
    BODY,
))

A(Paragraph("The sound dies if the student stops pumping", H2))
A(Paragraph(
    "This is deliberate and it is the single most important thing to know. The left hand must "
    "keep working or the reeds stop speaking, exactly as on a real instrument. The natural "
    "rhythm is a stroke every two to four seconds.",
    BODY,
))
A(Paragraph(
    "There is an <b>Assist</b> setting that keeps the air full so both hands are free for "
    "singing. It is off by default and labelled in the app as training wheels. You may want it "
    "on for vocal work and off for everything else. It is your call, but the student has been "
    "told it is not what a real harmonium does.",
    BODY,
))

A(Paragraph("There is no touch sensitivity, and this does not matter", H2))
A(Paragraph(
    "Pressing a key harder does nothing. That is correct: a real harmonium has no key velocity "
    "either. Volume and tone come from the bellows, which is modelled. Pumping harder makes the "
    "tone brighter, louder, and very slightly sharper - a few cents - just as it does on the "
    "real instrument. This is one place where the digital and the physical genuinely agree.",
    BODY,
))
A(PageBreak())


# ------------------------------------------------------------ section 3 ----
A(Paragraph("3. The layout", H1))
A(Paragraph(
    "The iPad screen is in three parts. Nothing ever covers the keyboard while playing.",
    LEAD,
))
A(table([
    ["Where", "What"],
    ["Top left", "The pump paddle. The left hand rests here for the whole session. A "
                 "brass-framed window along its bottom edge shows how much air is left."],
    ["Top right", "Nine stop faders and a master. Below them, the taal strip."],
    ["Under the pump", "Octave shift, the Sa selector, and the settings menu."],
    ["Across the bottom", "The keyboard, full screen width."],
], [30 * mm, 118 * mm]))

A(Paragraph("Key labels", H2))
A(Paragraph(
    "Every key carries two labels, always. The large one is the sargam name relative to the "
    "chosen Sa; the small one beneath is the Western note name, so the student can cross-refer "
    "to any book or video. Labels never disappear.",
    BODY,
))
A(Paragraph("The sargam labels follow Bhatkhande's written conventions:", BODY))
A(table([
    ["Written", "Means"],
    ["Underlined letter", "Komal - the flattened swara (r, g, d, n)"],
    ["Short line above", "Tivra Ma - the raised fourth"],
    ["Dot below", "Mandra saptak - the octave below the middle"],
    ["No dot", "Madhya saptak - the middle octave"],
    ["Dot above", "Taar saptak - the octave above"],
], [42 * mm, 106 * mm]))
A(Paragraph(
    "These are drawn the way they appear in books, so what the student reads on screen matches "
    "what they will read on paper.",
    CAPTION,
))

A(Paragraph("Choosing Sa", H2))
A(Paragraph(
    "Tapping <b>Sa</b> under the pump opens a picker of all twelve pitches. Choosing one "
    "re-labels every key immediately: the whole instrument transposes to the student's voice, "
    "which is exactly what a scale-changer harmonium does mechanically. Sa defaults to C.",
    BODY,
))
A(Paragraph(
    "The reference pitch is A = 440 Hz by default and adjustable from 415 to 466 Hz in "
    "Settings, so the instrument can be tuned to a recording or to another player.",
    BODY,
))
A(Paragraph(
    "The keyboard is tuned in equal temperament, like a real harmonium. Just intonation is a "
    "planned addition, not yet present.",
    NOTE,
))

A(Paragraph("4. The stops", H1))
A(Paragraph(
    "The model is a nine-stop instrument. Faders left to right, with what each does:",
    LEAD,
))
A(table([
    ["Stop", "What it is", "Default"],
    ["Bass", "The 16' reed bank, an octave below. Body and depth.", "0.55"],
    ["Male", "The 8' bank. The main voice.", "1.00"],
    ["Female", "The 4' bank, an octave above. Brightness and carry.", "0.35"],
    ["Coupler", "Adds the same note an octave up, as a mechanical coupler does.", "0.00"],
    ["Sa (low)", "Drone reed on Sa, low octave.", "0.00"],
    ["Sa (mid)", "Drone reed on Sa, middle octave.", "0.00"],
    ["Pa / Ma", "Drone reed on the fifth, or the fourth.", "0.00"],
    ["Tanpura", "Not yet working - see section 8.", "-"],
    ["Reverb", "How much room is around the instrument.", "0.18"],
    ["Master", "Overall volume.", "0.80"],
], [24 * mm, 96 * mm, 18 * mm]))
A(Paragraph(
    "Two or more reed banks together beat gently against each other, because no two reeds on a "
    "real instrument are perfectly in tune. That slight unsteadiness is intentional.",
    CAPTION,
))
A(PageBreak())


# ------------------------------------------------------------ section 5 ----
A(Paragraph("5. The drone", H1))
A(Paragraph(
    "Three drone stops give a sustained Sa in two octaves and a choice of Pa or Ma. They are "
    "harmonium reeds, not a separate sound, so they behave like the rest of the instrument.",
    LEAD,
))
A(Paragraph(
    "<b>They draw air.</b> Raising a drone stop empties the reservoir roughly twice as fast: "
    "about nine seconds instead of seventeen with nothing else sounding. This is authentic and "
    "it will surprise the student. If they complain the instrument keeps running out of breath, "
    "the drone is usually why.",
    BODY,
))
A(Paragraph(
    "The Pa/Ma choice matters for ragas that omit Pa - Marwa and Puriya among them - which drone "
    "on shuddh Ma instead.",
    BODY,
))

A(Paragraph("6. Taal", H1))
A(Paragraph(
    "The strip below the stop faders runs a rhythm cycle with synthesised tabla. It shows the "
    "name of the taal, a play button, tempo controls, a tap-tempo button, and a row of dots - "
    "one per matra.",
    LEAD,
))
A(table([
    ["Mark", "Means"],
    ["x", "Sam - the first beat of the cycle, where everything resolves"],
    ["0", "Khali - the empty beat, waved rather than clapped"],
    ["1, 2, 3", "The numbered talis - the other clapped beats"],
    ["Gap", "The division between vibhag"],
], [24 * mm, 124 * mm]))
A(Paragraph(
    "The lit dot follows the drum, not the scheduler, so what the eye sees and what the ear "
    "hears agree.",
    CAPTION,
))
A(Paragraph("Cycles available", H2))
A(table([
    ["Taal", "Matras", "Division", "Tradition"],
    ["Keherwa", "8", "4-4", "Light, bhajan"],
    ["Dadra", "6", "3-3", "Light, bhajan"],
    ["Teentaal", "16", "4-4-4-4", "Hindustani"],
    ["Jhaptaal", "10", "2-3-2-3", "Hindustani"],
    ["Rupak", "7", "3-2-2", "Hindustani, begins on khali"],
    ["Ektaal", "12", "2-2-2-2-2-2", "Hindustani"],
    ["Chautaal", "12", "2-2-2-2-2-2", "Dhrupad"],
    ["Deepchandi", "14", "3-4-3-4", "Semi-classical"],
], [26 * mm, 18 * mm, 34 * mm, 66 * mm]))
A(Paragraph(
    "Tempo runs from 40 to 240 beats per minute. A tempo change takes effect on the next beat, "
    "never in the middle of one. The cycle has been measured over five continuous minutes and "
    "does not drift.",
    CAPTION,
))
A(Paragraph(
    "Five further taals exist in the data but are hidden: Bhajani, because its pattern varies "
    "too much between regions to present one version as settled, and the four Carnatic talas "
    "(Adi, Rupaka, Misra Chapu, Khanda Chapu), which are counted and clapped rather than played "
    "on tabla and so have no theka to give them. If you would like any of these enabled with a "
    "particular pattern, that is a decision worth making deliberately - please say which.",
    NOTE,
))

A(Paragraph("7. Recording", H1))
A(Paragraph(
    "A <b>Record</b> button at the right-hand end of the taal strip captures the session exactly "
    "as heard - instrument, drone and taal at whatever balance is set.",
    LEAD,
))
A(Paragraph(
    "A setting called <b>Record my voice too</b> mixes in the microphone, so the student can "
    "sing over the harmonium and listen back. It is off by default and the microphone is only "
    "ever switched on when that setting is turned on.",
    BODY,
))
A(Paragraph(
    "Recordings are saved on the device and survive closing the app. Playback inside the app is "
    "not built yet - see the next section.",
    NOTE,
))
A(PageBreak())


# ------------------------------------------------------------ section 8 ----
A(Paragraph("8. What is not built yet", H1))
A(Paragraph(
    "So that you do not plan a lesson around something that is not there. This list is honest "
    "and current.",
    LEAD,
))
A(table([
    ["Not yet available", "Notes"],
    ["Tanpura", "The string model is written but switched off: it does not "
                "behave correctly yet. The drone reeds work and cover the same "
                "job less richly."],
    ["Playing recordings back", "Recording and saving work. Listening back inside the app does "
                               "not yet."],
    ["Ragas and raga mode", "No raga browser, no highlighting of allowed swaras, no "
                            "aroha/avaroha playback. Planned."],
    ["Alankars", "No exercise trainer yet. Planned."],
    ["Notation", "No notation display or editor yet. Planned."],
    ["Compositions", "No song library yet. Planned."],
    ["Just intonation", "Equal temperament only for now, like a real harmonium."],
    ["Devanagari labels", "The option exists and renders, but is not finished work."],
    ["Phone in portrait", "Shows a placeholder. Landscape on the phone is playable."],
], [40 * mm, 108 * mm]))

A(Paragraph("9. Suggested ways to use it", H1))
A(Paragraph(
    "These follow from what the instrument does, and are offered as a starting point rather "
    "than a curriculum.",
    LEAD,
))
A(Paragraph("Getting the left hand honest early", H2))

A(Paragraph(
    "Because the sound dies without air, pumping cannot be treated as an afterthought. It may "
    "be worth spending the first sessions on the pumping hand alone - a steady stroke every two "
    "to four seconds, watching the reservoir window - before adding melody. A student who learns "
    "to pump absent-mindedly here will do it correctly on a real instrument.",
    BODY,
))
A(Paragraph("Using the drone to fix Sa in the ear", H2))
A(Paragraph(
    "Set Sa to the student's comfortable pitch, raise the middle Sa drone, and have them sing "
    "against it. Warn them the reservoir will empty faster with the drone on.",
    BODY,
))
A(Paragraph("Sargam reading", H2))
A(Paragraph(
    "The dual labels mean a student can be asked to find a swara by name rather than by "
    "position, and can check themselves against the Western name. Changing Sa and asking for the "
    "same sargam again is a good way to make the relative nature of sargam concrete.",
    BODY,
))
A(Paragraph("Keeping time", H2))
A(Paragraph(
    "Keherwa and Dadra are the two a bhajan singer needs most and are first in the list. The dots "
    "make sam visible, which helps a beginner who cannot yet hear it. Slowing to 50 or 60 beats "
    "per minute is usually more useful than it sounds.",
    BODY,
))
A(Paragraph("Listening back", H2))
A(Paragraph(
    "Recording with the voice mixed in is the closest thing to a second pair of ears in the room. "
    "It may be the single most useful habit to establish, even though playback currently has to "
    "happen outside the app.",
    BODY,
))

A(Paragraph("10. How it was built", H1))
A(Paragraph(
    "Included because it was asked for, and because a little of it explains why the instrument "
    "behaves as it does. None of it is needed to teach.",
    LEAD,
))
A(Paragraph(
    "The app runs in the browser and is added to the home screen, so it launches like any other "
    "app and works with no network at all. It carries no third-party code: the sound, the "
    "graphics and the fonts are all part of the app itself.",
    BODY,
))
A(Paragraph("The sound", H2))
A(Paragraph(
    "Each reed is built from a measured harmonic recipe of a brass free reed rather than a "
    "recording. Every note is sounded by two or three oscillators tuned a few cents apart, each "
    "drifting slowly and independently, which is why two presses of the same key are never "
    "identical and why two stops together beat. A free reed does not start instantly, so each "
    "note begins slightly flat and settles, with a short breath of noise as the air first crosses "
    "the reed. Releasing a key adds the soft thump of the pallet closing.",
    BODY,
))
A(Paragraph(
    "The reeds then pass through three resonances standing for the wooden box, a gentle "
    "saturation, and a room. The whole thing is limited so that twelve notes at once do not "
    "distort.",
    BODY,
))
A(Paragraph("The air", H2))
A(Paragraph(
    "A reservoir is simulated continuously. Pumping fills it in about half a second; a leak "
    "empties it slowly at all times; every sounding note draws from it, and the low reeds draw "
    "more than the high ones. One held note with the default stops empties a full reservoir in "
    "about nine seconds. As the air falls the tone dulls and quietens before it stops speaking "
    "altogether.",
    BODY,
))
A(Paragraph("Timing", H2))
A(Paragraph(
    "Nothing is played on an ordinary timer. Beats are placed against the audio hardware's own "
    "clock and counted from a fixed origin, so errors cannot accumulate. Measured over five "
    "minutes, the cycle does not drift.",
    BODY,
))
A(Paragraph(
    "The instrument is still being built. Its behaviour is checked automatically on every change "
    "- that the layout fits, that the rhythm data adds up, that no note can be left sounding "
    "after the finger lifts - but whether it sounds right remains a judgement for ears.",
    NOTE,
))

A(Paragraph("A note on what to tell us", H1))
A(Paragraph(
    "If something about the instrument gets in the way of teaching, that is worth reporting: it "
    "is being actively developed and the student can pass it on. Particularly useful:",
    BODY,
))
story.extend(bullets([
    "Anything that teaches a habit you would have to undo on a real harmonium.",
    "Any sargam label, taal pattern or drone pitch you believe is musically wrong. "
    "Correctness matters more here than features.",
    "Anything you need for a lesson that is in section 8's list, so it can be prioritised.",
]))


doc = BaseDocTemplate(
    str(OUT), pagesize=A4,
    leftMargin=20 * mm, rightMargin=20 * mm, topMargin=20 * mm, bottomMargin=22 * mm,
    title="Swaranjali - a digital harmonium, and how to teach with it",
    author="Swaranjali", subject="Teaching manual for a digital harmonium",
)
frame = Frame(doc.leftMargin, doc.bottomMargin, doc.width, doc.height, id="f")
doc.addPageTemplates([
    PageTemplate(id="cover", frames=[frame], onPage=cover_furniture),
    PageTemplate(id="body", frames=[frame], onPage=page_furniture),
])
doc.build([item for item in story if item is not None])
print(f"Wrote {OUT} ({OUT.stat().st_size // 1024} KB)")
