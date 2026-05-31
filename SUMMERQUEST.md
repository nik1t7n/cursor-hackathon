# SummerQuest 🌞

**AI vision referee for real-world summer challenges.** Snap a photo of you doing a quest, an AI judges if you really did it, points + leaderboard.

Theme: *Entertainment Summer Activity* · Team of 4 · **2 HOURS** · Web · Win on: fun demo · For: friend groups

---

## ⚠️ 2-HOUR REALITY — read this first

You have **2 hours**. That kills the full vision (rooms, multiplayer, realtime DB, photo storage, quest generation). Build **ONE wow and nothing else**:

> **The wow = the AI vision referee.** Point a webcam at something, the AI rules "verified ✅ +30" or "nope ❌". That single live moment wins a fun-demo hackathon. Everything else is decoration.

**Hard cuts (do NOT build these):**
- ❌ No accounts, no rooms, no room codes, no join flow
- ❌ No database, no Supabase, no photo storage — all state in browser memory
- ❌ No realtime sync — everyone plays on **one screen** (laptop + projector). "Friend groups" = pass the laptop / crowd around it
- ❌ No quest *generation* — **hardcode 6-8 great quests**. (Generation is a 5-min add-on IF you're somehow ahead. You won't be.)

**The whole app = one page:** quest list → tap a quest → webcam snapshot → Claude vision verdict → score bumps → confetti → leaderboard. That's it.

---

## Core loop (single screen)

1. Add player names (in-memory list).
2. Pick whose turn → pick a quest from the hardcoded list.
3. Hit **camera** → snap a webcam frame.
4. **Claude vision** checks the frame against the quest → `{verified, reason}`.
5. Verified → confetti + points to that player. Rejected → AI's funny reason on screen.
6. Leaderboard re-sorts live.

---

## The demo script (the 90 seconds that win)

| Time | Beat |
|------|------|
| 0:00 | "Summer + friends + nothing to do. SummerQuest turns any room into a game an AI referees." |
| 0:15 | Add two judges as players on screen. |
| 0:25 | Quest: *"Hold up something yellow."* Banana to webcam → snap → **AI: 'verified, banana 🍌 +30'** → confetti, score jumps |
| 0:50 | **The cheat beat:** hold up something blue for the yellow quest → **AI rejects: 'that's blue, nice try'** → proves the AI is real, room laughs |
| 1:10 | "Judges — anyone shout an object" (only if you tested it's reliable) → snap → verdict. Audience play = the memorable moment |
| 1:25 | Leaderboard, crown a winner. "Real AI, live, judged in seconds. SummerQuest." |

> The **cheat-rejection beat is the win.** It proves the vision model is real, not faked, and it gets a laugh. Rehearse it with your exact props.

---

## Architecture (2h version — dead simple)

```
[ Single-page React (Vite) ]
   getUserMedia webcam → grab frame to canvas → base64
        │
        ▼
[ 1 tiny endpoint / serverless fn ]  →  [ Claude API (vision) ]
   POST {image, quest}                   "does this image satisfy: <quest>? JSON {verified, reason}"
        │
   in-memory state: players[], scores{}, quests[]  (NO database)
```

- **Frontend:** React + Vite + Tailwind. One page. `navigator.mediaDevices.getUserMedia` for webcam, draw to `<canvas>`, export base64.
- **AI:** **Claude API vision**, ONE call. Send frame + quest → strict JSON `{verified: bool, reason: string}`. This is the entire product — build it first.
- **Backend:** one endpoint to hold the API key (Vite serverless fn, or a 20-line Express server). **Never put the API key in frontend.**
- **State:** plain React state. Refresh = reset. Fine for a demo.
- **Deploy:** localhost is acceptable for the demo. If time, Vercel. Don't fight deploy in the last 10 min.

**Hardcoded quests (steal these):** hold up something yellow · make a heart with your hands · show a high-five between two people · find something that looks like sunglasses · biggest smile · show 3 fingers · hold up a drink · peace sign. (Pick ones that verify cleanly from one frame and are doable in a room.)

---

## Team-of-4 split — minute budget

Pair up. Vision spike is the critical path; everything else is useless without it.

- **Dev A — Vision (critical path):** the endpoint + Claude vision call + webcam capture → verdict. Get ONE quest verifying end-to-end ASAP. **If this doesn't work, there is no project.**
- **Dev B — UI/state:** single page, player list, quest list, score + leaderboard, confetti. Stub the verify call, swap in A's real one.
- **Dev C — Content + theme + props:** write the 8 quests, summer styling (colors, big emoji, juicy buttons), and **pick + test the physical demo props** (banana, sunglasses).
- **Dev D — Integrate + demo:** glue A+B, run the deploy/fallback, **own the demo script and rehearse it twice.** A rehearsed 90s demo beats a half-built feature.

---

## Timeline (2 hours, hard)

| Clock | Goal |
|-------|------|
| 0:00–0:15 | **Spike:** Dev A gets webcam frame → Claude vision → verdict printed to console. Others scaffold Vite app + hardcoded quests + score state. |
| 0:15–1:00 | Wire capture → verify → score. **ONE quest fully working on screen.** This is the make-or-break checkpoint. |
| 1:00–1:30 | Leaderboard, all 8 quests, summer theme, confetti on verify. |
| 1:30–1:50 | Demo script + rehearse + props. Test the cheat beat. |
| 1:50–2:00 | Deploy or lock localhost, recorded backup video, final rehearsal. |

**Checkpoint at 1:00:** if one quest doesn't verify end-to-end yet, drop EVERYTHING else and make that work. The demo is only the vision referee.

---

## Risks (2h)

| Risk | Mitigation |
|------|-----------|
| Vision call slow/flaky | Test latency in the 0:15 spike. If >4s or unreliable, use rehearsed props only, skip "judge shouts an object." |
| Webcam permission/HTTPS issues | localhost is treated as secure for getUserMedia — fine. Test the exact demo machine + browser early. |
| AI rejects a valid photo on stage | Lenient prompt + a **manual "override +pts" button** as the safety net. |
| Running out of time | Cut order: generation → leaderboard polish → multiple quests. Never cut the single verify loop. |
| Demo machine wifi dies | Record a 60s backup video once it works. |

---

## If you somehow finish early (unlikely)

Quest *generation* from a vibe prompt · sound effects · a round timer · share-card of the winner. Touch none of these until the core loop is rehearsed.
