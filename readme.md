# Blockz

A personal app for building habits by doing tiny things, and seeing each one land as an ice cube in a glass.

This document describes **what the app is and how it should behave**. It does not prescribe code, frameworks, or architecture. Those choices are up to the builder, as long as the behavior and feel described here are delivered.

---

## 1. The idea

Every good thing I do, however small, becomes an ice cube.

I create my own "blocks": short, concrete activities such as *2 push-ups*, *1 min reading*, *call a client*, *mirror work for 1 min*, *a self-improving belief*, *square breathing*. Whenever I complete one, I tap it, and a cube drops from the top of the screen into a glass, colliding and settling among the cubes already there. Over the day the glass fills up.

The app is built on one principle: **start small, and one is enough.** It never pushes me to do more, never prompts several blocks in a row, never nags. Doing more is always allowed, never expected.

The app is for one person (me). There are no accounts, no social features, and no internet requirement.

---

## 2. Guiding principles

These decide any situation this document doesn't cover:

1. **One is enough.** A single cube is a success. Nothing in the app suggests otherwise.
2. **Reward, not pressure.** The app's job is to make finishing something feel good *immediately*. The drop, the collision, and the sound are the reward.
3. **No shame.** No streaks, no "you missed a day," no red marks, no failure states. An empty day is simply an empty glass.
4. **I am in control.** I choose what my blocks are, what color they are, how big they are, and when I tap them. The app records; it does not assign.
5. **Calm and beautiful.** Muted, soft, slightly dreamy. It should feel like a pleasant object, not a productivity dashboard.
6. **Fresh start every day.** Each day begins with an empty glass. The past is kept, never held against me.

---

## 3. Platform and feel

- Used mainly on a **phone**, in portrait orientation. It should also work in a desktop browser.
- It should be installable to the phone's home screen and feel like a native app: full screen, no browser chrome where possible.
- It must work **fully offline**. All data stays on the device.
- Opening the app should take me straight to today's glass. No splash screens, no onboarding walls.

---

## 4. Visual style

- **Background:** dark and moody by default. A soft, out-of-focus, blurred backdrop, like looking through a glass at a dim room. It should be muted and slightly abstract, never busy. A light alternative may be offered in settings later, but dark is the default.
- **The glass:** a tall, simple, transparent drinking glass in the center of the screen, occupying most of the vertical space. It should read as glass: subtle edges, faint reflections or highlights, and see-through.
- **The cubes:** translucent ice cubes with rounded edges, tinted by the block's color. They should look like ice: slightly glossy, with light passing through, not flat solid squares. Tints are soft and pastel-ish so they glow against the dark background.
- **Overall:** minimal UI chrome, soft shadows, gentle animations. Nothing harsh, nothing loud.

---

## 5. Blocks

A **block** is a reusable activity I define once and tap whenever I complete it.

### 5.1 Properties of a block

| Property | Description |
|---|---|
| **Name** | Short text, e.g. "2 push-ups", "Call a client". Keep it short enough to fit on a button (roughly up to 30 characters). |
| **Color** | Chosen by me from a fixed palette of about **6 soft ice tints** (e.g. blue, teal, green, amber, rose, violet). There are no predefined categories; I give colors meaning myself if I want. |
| **Size** | **Small**, **Medium**, or **Large**. Represents effort or difficulty. Two push-ups might be small; calling a client might be large. Size controls the physical size of the cube in the glass. |

### 5.2 Creating a block

- A clear "+" or "New block" control is always reachable from the main screen.
- Creating a block asks for: name, color (tap a swatch), size (tap one of three options, ideally showing a small preview cube in each size).
- The new block appears immediately in my block list.

### 5.3 Editing, reordering, deleting

- **Long-press** a block to open its edit options: change name, color, or size, or delete it.
- I can **reorder** blocks so my most-used ones are easiest to reach.
- **Deleting a block never erases history.** Cubes already earned from it stay in past glasses and statistics, with the name, color, and size they had when they were earned.
- **Editing a block only affects future cubes.** Past cubes keep the appearance they had when they were dropped.

### 5.4 No blocks yet

On first launch there are no blocks. The main screen shows the empty glass and a gentle invitation to create the first block (e.g. "Create your first block: something tiny"). No preset templates are forced on me.

---

## 6. Main screen (Today)

This is the heart of the app.

### 6.1 Layout

- **Center:** the glass, holding today's cubes.
- **Bottom:** my blocks, shown as tappable buttons in a scrollable row or grid. Each button shows the block's name and is tinted with its color. Size can be hinted subtly (e.g. a small cube icon in one of three sizes).
- **Top (small, unobtrusive):** today's date, a count of glasses filled today if more than one, and access to Stats and Settings.

### 6.2 Tapping a block = mining a cube

- Each tap on a block **instantly** drops one cube into the glass. There is no confirmation dialog.
- The cube **appears at the very top of the screen** (above the glass) and **falls** into it under gravity.
- It **collides realistically** with the glass walls and the cubes already inside: bouncing slightly, tumbling, rotating, and settling into a natural resting position.
- Cubes are rigid. They stack and pile like real ice, with no overlapping or passing through each other.
- I can tap the same block as many times as I want; each tap drops another cube. Rapid tapping should work smoothly, with cubes falling one after another.
- On each landing: a soft **ice "clink" sound** and a light **haptic tap** (where the device supports it). The sound should vary slightly each time so it never feels robotic. Collisions between cubes can produce quieter clinks.
- The block button gives brief visual feedback when tapped (a gentle press or glow).
- The app **never** reacts to a tap with prompts like "do another!" or suggests repeating. One is enough.

### 6.3 Undo

- After a tap, a small, unobtrusive **Undo** option appears for a few seconds (e.g. a little pill near the bottom). Tapping it removes the most recently dropped cube from the glass (it can fade out or float away) and from the day's record.
- Undo can be applied repeatedly to remove the last several cubes, most recent first.

### 6.4 "Pick one for me" (dice)

- A small, optional dice button sits near the blocks.
- Tapping it **highlights one of my blocks at random** (e.g. that button gently pulses or glows), as a suggestion for moments when I don't know what to do.
- It does **not** drop a cube and does not force anything. I still tap whichever block I actually do. Tapping the dice again picks another.
- If I have no blocks, the dice is hidden.

### 6.5 Physics feel

- Gravity should feel natural, not floaty or sluggish, and not violent.
- Cubes should have a slight bounce and some friction so the pile looks settled and believable, not jittery. Once at rest, cubes stay still.
- The glass contents should look the same when I reopen the app: today's cubes are restored and already settled in the glass, without dramatically re-falling. (A brief, gentle settling is acceptable.)
- Larger cubes are noticeably bigger (large is roughly 2× the size of small, medium in between), so hard things fill the glass faster.

---

## 7. Full glass

- When the cubes reach the rim of the glass (the glass is full), the full glass is **celebrated briefly**: a soft shimmer, glow, or a satisfying sound. Subtle, not fireworks.
- The full glass then **slides away** (e.g. moves off to the side, toward "the shelf") and a **fresh, empty glass** slides in to take its place.
- Further taps drop cubes into the new glass.
- The day keeps all its glasses. The top of the main screen shows a small count, e.g. "2 glasses today," once at least one glass has been filled.
- The cube that "overflows" (the one dropped when the glass is at the rim) should land in the new glass, so no tap is ever lost.

---

## 8. Daily reset

- Each day starts with an **empty glass**.
- At the end of the day, today's glass(es), full or partial, are **saved** to history, exactly as they looked, and the main screen resets to an empty glass.
- **Day boundary:** by default the new day begins at **4:00 AM local time**, so late-night activity counts toward the day I'm still living in. This can be changed in Settings (e.g. to midnight).
- If the app isn't opened for several days, those days simply have no glass (or an empty one) in history. No messages about missed days.
- When I open the app on a new day, it simply shows the empty glass. It may show a very gentle greeting (e.g. "Fresh glass"). No summaries of what I failed to do.

---

## 9. Stats page (The Shelf)

The stats page is visual first, and free of streaks and pressure.

### 9.1 The shelf of glasses

- Past days are displayed as **small glasses standing on shelves**, most recent first (or arranged like a calendar by week; whichever is clearer and prettier).
- Each small glass is a **frozen snapshot** of that day: its cubes in their real colors and sizes, arranged as they settled. Days where I filled more than one glass show the extra glasses beside it (or a small "×2" marker).
- Days with no cubes show an empty glass or a faint placeholder, never a red mark or warning.
- Each glass is labeled with its date in a small, quiet way.

### 9.2 Day detail

- Tapping a day's glass opens a detail view: a larger view of that glass, and a simple list of what I did that day: each block name with its color, size, and how many times I tapped it (e.g. "2 push-ups ×3").

### 9.3 Weekly color balance

- At the top of the stats page, a single **color balance bar** for the current week: a horizontal bar split into segments proportional to how many cubes of each color I earned (optionally weighted by cube size).
- Purpose: see at a glance which areas of life are getting attention and which are missing. No numbers needed, though tapping the bar may reveal counts.
- I can step back to previous weeks.

### 9.4 What the stats page must not have

- No streak counters.
- No "days missed," no failure colors, no goals I'm "behind" on.
- No leaderboards, scores, or levels.

---

## 10. Settings

Keep it minimal:

- **Day starts at:** time of day boundary (default 4:00 AM).
- **Sound:** on / off.
- **Haptics:** on / off.
- **Background:** dark (default); a light option may be added later.
- **Export data:** save all my blocks and history to a file I can keep as a backup.
- **Import data:** restore from such a file.
- **Erase everything:** with a clear confirmation.

---

## 11. Data

All data is stored on the device only. The app must remember:

- **My blocks:** name, color, size, order.
- **Every cube earned:** which block it came from, the block's name/color/size at that moment, and when it was dropped.
- **Glasses:** which cubes belong to which glass on which day, and enough information to redraw each glass's snapshot as it looked.

Nothing is lost when the app is closed, the phone restarts, or a day rolls over. Undo must correctly remove a cube from storage too.

---

## 12. Things the app deliberately does NOT do

- No notifications, reminders, or alarms.
- No prompts to do multiple blocks in a row, no "keep going!" messages.
- No streaks, chains, or punishment for missed days.
- No predefined categories or preset habit lists forced on me.
- No accounts, logins, cloud sync, ads, or sharing.
- No cues or scheduling. Cues live in my life, not in the app. (May be reconsidered later.)

---

## 13. Possible future ideas (not for version 1)

Listed only so the builder doesn't block them, not to be built now:

- Optional "anchor" text under a block (e.g. "after coffee") as a self-written reminder.
- Naming colors so they act as categories in stats.
- A "brave" flag that makes a cube look like clear crystal for things that took courage.
- Light / alternative background themes.
- Monthly overview and most-repeated blocks.

---

## 14. Definition of done for version 1

Version 1 is complete when I can:

1. Open the app on my phone, offline, straight to today's glass.
2. Create, edit, reorder, and delete blocks with a name, one of ~6 colors, and a size.
3. Tap a block and watch a translucent, tinted ice cube fall from the top and settle realistically among other cubes, with a clink sound and haptic.
4. Undo a mis-tap.
5. Use the dice to get a random suggestion without anything being logged.
6. Fill a glass, see it saved and replaced by a new one, with no tap lost.
7. Close and reopen the app and see today's glass exactly as I left it.
8. See the day reset at the day boundary, with yesterday saved.
9. Browse the shelf of past glasses, open a day to see what I did, and view the weekly color balance.
10. Export and import my data.