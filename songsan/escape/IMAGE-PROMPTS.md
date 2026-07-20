# 믿음의 항해 — 최종 이미지 생성 지시서 (아트 디렉션 총괄)

전 55개 시각 슬롯을 통합·정렬했습니다. **위에서부터 순서대로** 실행하면 됩니다. 정사각 슬롯은 합성 시트로 묶었고, 종횡비가 다른 것은 단독 프롬프트로 분리했습니다. 모든 프롬프트에 공통 스타일 문구와 "텍스트/정답 글자·숫자 절대 금지"를 포함시켰습니다.

> 공통 아트 스타일(모든 생성물 공유): *dark moody painterly ink-wash + fine digital-engraving illustration, premium vintage nautical-adventure storybook / Uncharted concept-art look, dramatic chiaroscuro, single warm amber lantern light, rich blacks & deep browns, warm amber-gold highlights, desaturated storm blue-grey only for sea/sky, cross-hatch texture, cinematic depth. NO text / letters / captions / numbers / modern objects / readable faces.*

---

## 요약 표 (슬롯 → 파일명 → 상태 → 액션)

| # | 슬롯 | 파일명 | 상태 | 액션 | 태그 |
|---|------|--------|------|------|------|
| **시트 A** | 닫힌 확대컷 6컷 | | | | |
| A1 | closed-deck-ropes | assets/closeup-deck-ropes.webp | 재생성 | generate | 필수 |
| A2 | closed-cabin-desk | assets/closeup-cabin-desk.webp | 재생성 | generate | 필수 |
| A3 | closed-cabin-painting | assets/closeup-cabin-painting.webp | 재생성 | generate | 필수 |
| A4 | closed-crew-bunk | assets/closeup-crew-bunk.webp | 재생성 | generate | 필수 |
| A5 | closed-crew-cupboard | assets/closeup-crew-cupboard.webp | 재생성 | generate | 필수 |
| A6 | closed-hold-crate | assets/closeup-hold-crate.webp | 재생성 | generate | 필수 |
| **높음 (퍼즐 고유 삽화)** | | | | | |
| B1 | p0-hero | assets/hero.webp | 승격 | generate | 높음★ |
| B2 | p1-permit-parchment | assets/permit-parchment.webp | 신규 | generate | 높음 |
| B3 | p3-chart-parchment-bg | assets/tex-wet-seachart.webp | 신규 | generate | 높음 |
| B4 | p4-signal-lamp-scene | assets/scene-storm-signal-lamp.webp | 신규 | generate | 높음 |
| B5 | p5-wet-logbook | assets/scene-storm-logbook.webp | 신규 | generate | 높음 |
| B6 | p6-scene-legion | assets/scene-gerasa-legion.webp | 신규 | generate | 높음 |
| B7 | p-jairus-cover | assets/jairus.webp | 승격 | generate | 높음 |
| B8 | p13-ignition-scene | assets/ignite.webp | 신규 | generate | 높음 |
| **선택 (챕터 씬·보조 삽화)** | | | | | |
| C1 | p1-storm-scene | assets/storm.webp | 승격 | generate | 선택(원문 필수) |
| C2 | gerasa-scene | assets/gerasa.webp | 승격 | generate | 선택(원문 필수) |
| C3 | final-story-scene-sending | assets/sending.webp | 승격 | generate | 선택(원문 필수) |
| C4 | final-ending-scene-finish | assets/finish.webp | 승격 | generate | 선택(원문 필수) |
| C5 | prologue-scene | assets/prologue.webp | 신규 | generate | 선택 |
| C6 | p7-scene-tombdoor | assets/scene-gerasa-tombdoor.webp | 신규 | generate | 선택 |
| C7 | p8-scene-restored | assets/scene-gerasa-restored.webp | 신규 | generate | 선택 |
| C8 | p9-crowd-hem | assets/scene-crowd-hem.webp | 신규 | generate | 선택 |
| C9 | p11-talitha-dawn | assets/scene-talitha-dawn.webp | 신규 | generate | 선택 |
| C10 | p12-flags-banner | assets/flags-banner.webp | 신규 | generate | 선택 |
| **시트 B** | 도구 아이콘 6컷 | | | | 선택 |
| D1–D6 | tool-key/uv/cross/hammer/flint/oil | assets/tool-*.webp | 승격 | generate | 선택 |
| **시트 C** | 종이/양피지 3컷 | | | | 선택 |
| E1 | p8-parchment-bg | assets/paper-gerasa-letter.webp | 신규 | generate | 선택 |
| E2 | p2-note-paper-tex | assets/tex-thief-note-paper.webp | 신규 | generate | 선택 |
| **단독 소품** | | | | | |
| F1 | p1-wax-seal | assets/permit-wax-seal.webp | 신규 | generate | 선택 |
| F2 | p10-refl-caustics | assets/refl-water-caustics.png | 신규 | generate | 선택 |
| **방 배경 (파노라마)** | | | | | 선택 |
| G1 | room-deck | assets/room-deck.webp | 승격 | generate | 선택 |
| G2 | room-cabin | assets/room-cabin.webp | 승격 | generate | 선택 |
| G3 | room-crew | assets/room-crew.webp | 승격 | generate | 선택 |
| G4 | room-hold | assets/room-hold.webp | 승격 | generate | 선택 |
| G5 | room-wheel | assets/room-wheel.webp (3:4) | 승격 | generate | 선택 |
| G6 | room-secret | assets/room-secret.webp (3:4) | 승격 | generate | 선택 |
| G7 | ship-map | assets/ship-map.webp | 승격 | generate | 선택 |
| **다운로드 (위키미디어 PD)** | | | | | |
| H1 | p2-rembrandt | assets/painting-rembrandt-storm-galilee | 저해상→고해상 | download | 다운로드★ |
| H2 | p10-repin | assets/painting-repin-jairus | 저해상→고해상 | download | 다운로드★ |
| H3 | p8-painting-gadarene | assets/painting-gadarene(선택) | 신규 | download | 다운로드 |
| H4 | final-painting-light-of-world | assets/painting-lightofworld(선택) | 신규 | download | 다운로드 |
| **그대로 둘 것 (keep-svg)** | 9종 | n/a | — | keep | 문서 하단 참고 |

★ = 대표가 특히 강조/불만 표한 최우선.

---

# 1. [필수] 시트 A — 닫힌 확대컷 6컷 (열림 모션 짝)

**⚠️ 크로스페이드 정합 주의:** 이 6컷은 각각 기존 `assets/closeup-*-open.webp`(열림본)과 **동일 카메라·초점거리·구도**여야 매끄럽게 크로스페이드됩니다. 합성 시트로 한 번에 뽑되, 슬라이스 후 각 열림본 위에 겹쳐 카메라가 어긋나면 **해당 패널만 단독 재생성**해 정합을 맞추세요. (즉 시트는 1차 초안, 정합 검증은 열림본 기준.)

시트 스펙: 캔버스 ~1536×1024, **3열 × 2행**, 각 패널 512×512 정사각, 패널 사이 얇고 깨끗한 1px 경계(슬라이스용), 6패널 모두 동일 조명·톤.

- 패널1(좌상) = `assets/closeup-deck-ropes.webp`
- 패널2(중상) = `assets/closeup-cabin-desk.webp`
- 패널3(우상) = `assets/closeup-cabin-painting.webp`
- 패널4(좌하) = `assets/closeup-crew-bunk.webp`
- 패널5(중하) = `assets/closeup-crew-cupboard.webp`
- 패널6(우하) = `assets/closeup-hold-crate.webp`

```
A single 1536x1024 image, a clean 3-columns x 2-rows contact sheet of six separate square close-up panels, each panel 512x512, divided by thin clean 1px gutters for slicing. ALL six panels share one cohesive art style: dark moody painterly ink-wash and digital-engraving illustration, premium vintage nautical adventure storybook / Uncharted concept-art look, dramatic chiaroscuro with a single warm lantern light, rich blacks and deep browns, warm amber-gold highlights, fine cross-hatch and engraving texture, cinematic depth, subtle metallic sheen. Every panel is a tactile "found object" macro on weathered age-of-sail materials. Absolutely NO text, letters, captions, numbers, modern objects or faces in any panel.

PANEL 1 (top-left): extreme close-up of a thick heavily coiled ship's rope on dark weathered oak deck planks, spiraling tightly inward to a dark EMPTY hollow center — nothing hidden inside, no key; salt-crusted frayed hemp, damp sheen; a small sliver of stormy blue-grey sea in the upper-right corner; warm lantern light from upper-left, coil center dropping into deep shadow.

PANEL 2 (top-center): close-up of a captain's writing-desk drawer fully CLOSED and flush, dark weathered oak grain, one aged blackened-brass drop-pull and a small brass keyhole escutcheon centered — locked and shut, nothing visible inside; edge of a rolled sea-chart resting on the desk above; warm candlelight raking from the right, amber glint on brass.

PANEL 3 (top-right): close-up of an ornate antique framed oil painting of a storm-tossed sailing ship hanging FLAT and flush against a dark wood-panelled cabin wall, blackened gilt frame, fully closed against the wall with nothing revealed behind it; desaturated storm blue-grey only inside the painting's scene; warm lantern glow raking across, amber rim-light on the carved frame edge.

PANEL 4 (bottom-left): close-up of a narrow wooden crew bunk built into the hull, a rough sea-worn canvas blanket rumpled across it, dark weathered timber; below the bunk an EMPTY shadowed gap — only darkness, dust and a wisp of straw, nothing hidden; warm lantern light from the side, deep shadow pooling beneath.

PANEL 5 (bottom-center): close-up of a small wooden galley cupboard on a ship's timber bulkhead, its plank door CLOSED and secured with an aged brass-and-iron turn-latch, iron hinges, nothing visible inside — only a faint seam; warm lantern light from the side, amber glint on the latch.

PANEL 6 (bottom-right): close-up of a sturdy wooden cargo crate in a dim ship's hold, INTACT and nailed firmly shut, thick rough-sawn planks with rows of iron nail heads and a rope band, sea-worn dark timber, absolutely nothing visible inside; warm lantern light from above-left, amber rim-light on plank edges and nail heads, deep shadows pooling on the hold floor.
```

---

# 2. [높음] 퍼즐 고유 삽화 · CUSTOM 위젯 아트 (단독 프롬프트)

## B1. [높음★] hero.webp — 타이틀·프롤로그·전역 배경 (삼중 사용, 최우선 고화질)
로비 타이틀 + 프롤로그 씬 + body 고정 배경으로 삼중 사용. 상단 하늘을 넉넉히 비워 cover 크롭에도 견디게. Landscape 4:3.

```
A lone weathered wooden first-century Galilean fishing vessel — single mast, furled canvas sail — moored at the end of a stone harbor at dusk, prow angled toward the open sea, about to set sail. A single warm lantern glows on the deck and at the foot of the boarding gangplank, throwing golden amber rim-light along the wet dark-oak hull, blackened brass fittings and coiled ropes. Dramatic chiaroscuro, deep pooled foreground shadows, a vast brooding storm sky of desaturated blue-grey filling the upper half with one faint break of warm amber light on the horizon; calm dark water below with subtle golden reflections. Painterly dark ink-wash and digital-engraving style, fine cross-hatch detail on timber and rigging, high texture, cinematic depth, low-key warm palette of rich blacks, deep browns and amber gold. Premium vintage nautical adventure storybook / Uncharted concept-art mood. Iconic, centered, clearly readable at small size; ample atmospheric sky at the top so it also works cropped as a full-screen background. NO text, letters, captions, people, or modern objects. Landscape 4:3.
```

## B2. [높음] permit-parchment.webp — 승선 허가증 양피지 (완전 공백)
UV 단서는 별도 DOM 레이어이므로 이미지엔 **글자 절대 금지**. UV 켜면 brightness(.32)로 어두워지니 저대비 유지. Portrait 3:4.

```
A single sheet of ancient sea-stained vellum boarding document, completely blank and wordless, lying flat and lit by one warm lantern from the upper left. Heavily aged parchment with soft foxing, faint water stains, worn creases and darkened slightly torn edges. A faint blind-embossed watermark of a tall sailing ship above a crossed anchor pressed into the very center, barely visible, purely embossed with no ink and no letters. A delicate engraved double-rule decorative border frames the page. Warm amber highlight along the top edge, deep shadow gathering toward the lower corners, golden rim-light on raised fibers. Painterly ink-wash with fine engraving texture, tactile found-object close-up, high detail, low-key warm palette of rich creams, deep tan and brown. CRITICAL: absolutely no text, words, numerals, captions or calligraphy anywhere — a blank sheet. Flat top-down document view. Portrait 3:4.
```

## B3. [높음] tex-wet-seachart.webp — 젖은 해도 격자 배경 (저대비 텍스처)
p3 격자 SVG 뒤에 cover로 깔림. 격자 판독성 위해 중앙을 어둡게, **판독 가능한 글자·눈금·나침도 금지**. Square 1:1.

```
Flat top-down background texture of an old water-soaked nautical sea chart on aged parchment, dark moody painterly ink-wash style. Heavily weathered vellum with sea-salt stains, water blooms, damp warping and scorched edges; only the faint ghost of unreadable coastline contours dissolved into blur — NO legible text, numerals, letters, grid lines or compass rose. Muted and low-contrast, darker and shadowed toward the center so a bright overlaid grid stays readable; warm amber lantern glow catching one corner, deep brown-black pooled shadow elsewhere; subtle cross-hatch texture, faint desaturated blue-grey sea tints. No modern objects. Square 1:1, evenly moody, flat overhead view of the chart surface.
```

## B4. [높음] scene-storm-signal-lamp.webp — p4 무전 헤더 (폭풍 속 신호 램프)
모스 대조표 위 무드 헤더. **점·선·글자 금지**(정답 신호 스포일 방지). Landscape 배너.

```
Intimate close-up found-object illustration, dark moody painterly ink-wash and digital-engraving style. A weathered blackened-brass ship's signal lamp with a shielded flame, gripped by a wet hand shown only as a partial silhouette in a soaked period sleeve, flashing a shaft of light out into black storm rain over a heaving night sea. Dramatic chiaroscuro: the lamp's single warm amber flame is the ONLY light source, blooming golden through rain streaks and glinting on wet brass, rope and canvas; deep pooled black shadows; storm sea and sky behind in desaturated blue-grey. Rich blacks and deep browns, heavy weathered texture, fine cross-hatch engraving detail, cinematic depth. Absolutely NO text, letters, numbers, dots/dashes, captions or modern objects. Landscape banner composition, tactile and cinematic.
```

## B5. [높음] scene-storm-logbook.webp — p5 물에 젖은 항해일지
5단어 복원 퍼즐 헤더. 잉크는 반드시 **번져 판독 불가**(정답 단어 스포일 방지). Landscape.

```
Intimate top-down close-up found-object illustration, dark moody painterly ink-wash and digital-engraving style. A torn water-damaged open ship's logbook lying on heavily weathered dark oak, pages warped and buckled by seawater, ink washed into soft indecipherable blue-black blooms and running smears — the writing COMPLETELY illegible and abstract, absolutely NO readable text, letters, numbers or captions of any kind. A ragged torn page edge, a blackened-brass corner fitting, a resting quill, a few water beads on the paper. Dramatic chiaroscuro from a single warm amber lantern just out of frame: golden rim-light along the torn edge and quill, deep pooled shadow, faint desaturated blue-grey storm light from an unseen porthole, hints of rope and canvas at the edges. Rich blacks and deep browns, high tactile texture, fine engraving detail, cinematic shallow depth. No modern objects. Close tactile landscape composition.
```

## B6. [높음] scene-gerasa-legion.webp — p6 '이천의 비밀' (군대귀신·돼지떼)
광인+끊어진 사슬+벼랑서 바다로 돌진하는 돼지떼 실루엣. **돼지는 셀 수 없는 어두운 무리**, 집(p7 정답)·숫자·글자 금지. Landscape 3:2.

```
Dark painterly ink-wash and fine-engraving illustration, dramatic chiaroscuro. Foreground: a gaunt hunched human figure seen from behind in tattered rags, crouched among broken hewn-stone tombs on a rocky moonlit headland; heavy rusted iron shackles and a snapped chain lie discarded on the stones beside him, a scatter of sharp rocks nearby; face hidden and in shadow, no visible features. Far background, down a plunging cliff: a dark surging UNCOUNTABLE mass of swine pouring over the brink into a cold storm-blue sea, churn and spray below, kept as a shadowy silhouette never individually countable. Single low warm amber light — a distant lantern or moonlight breaking cloud — raking across the stones; deep shadows, golden rim-light on the figure's shoulder and the cliff edge. Cross-hatch texture, drifting sea-mist, cinematic depth. Rich blacks, deep browns, muted storm blue-grey only on sea and sky. NO text, numbers, lettering, or modern objects. Landscape 3:2.
```

## B7. [높음] jairus.webp — 제3장 표지 (거의 다 흐른 모래시계 + 인파)
'열두 해의 기적' 표지. 전경 모래시계 초점, 군중 실루엣, 배 리깅 배경. Landscape 4:3.

```
Dark moody painterly ink-wash / digital-engraving illustration, premium vintage nautical storybook / Uncharted concept-art. Return to a crowded first-century Galilean harbour at dusk. In the immediate foreground on a weathered stone mooring post sits a large aged brass-and-glass hourglass, its sand nearly run out, warm lantern light catching glass and blackened brass. Behind it, a dense throng of hooded cloaked pilgrims pressing along a stone quay, rendered only as layered dark silhouettes with no visible faces; beyond them the masts, furled sails and tarred rigging of a moored wooden ship fade into mist. Strong foreground hourglass focal point lower-third, crowd mid-ground, ship rigging backdrop; cinematic wide framing readable at small size. Dramatic chiaroscuro, single warm amber lantern glow from lower-right, deep pooled shadows, golden rim-light on the hourglass rim and cloaked shoulders; desaturated storm blue-grey only in the distant sky. Rich blacks and deep browns, warm amber/gold highlights, low-key. Mood: time running out yet hope beneath. Fine cross-hatch texture, cinematic depth. NO text, letters, numbers, modern objects or clear faces. Landscape 4:3.
```

## B8. [높음] ignite.webp — p13 등대 점화 (첫 불씨 붙는 순간)
꺼진 탑(sending)→켜진 탑(finish)을 잇는 클라이맥스. 기름통·부싯돌 등장 OK(정답은 히브리서 구절). Landscape 4:3.

```
Dark moody painterly ink-wash and digital-engraving illustration, premium vintage nautical storybook / Uncharted concept-art. Intimate extreme close-up inside the near-black lantern room atop a lighthouse: a great blackened brass-and-glass lantern mechanism with an oil-soaked wick, and a pair of partial hands (silhouette only, weathered age-of-sail sleeves, no face) striking a flint stone so the VERY FIRST tiny amber spark catches the wick — a single small nascent flame just igniting, the only warm light in near-total darkness. Beside the mechanism a battered tin oil can and a rough flint stone rest on weathered dark oak. Deep chiaroscuro: the newborn flame throws a small warm amber pool and golden rim-light onto blackened brass, curved glass panes and grimy woodgrain, everything else swallowed in rich black shadow. Fine cross-hatch texture, cinematic depth, subtle metallic glints. Mood: held breath, the decisive instant before the beam blazes. NO text, letters, captions, numbers or modern objects. Landscape 4:3.
```

---

# 3. [선택] 챕터 씬 고화질 재생성 · 보조 삽화 (단독 프롬프트)

> C1–C4는 대표가 화질 불만을 표한 재생성 대상(원문 priority=required)이나, 아트 우선순위상 '선택' 그룹에 배치. 사실상 조기 실행 권장.

## C1. storm.webp — 제1장 '폭풍의 바다' (갈릴리 광풍)
```
Dramatic vintage nautical-adventure storybook illustration, dark moody painterly ink-wash and digital-engraving style, premium engraved-plate / Uncharted concept-art mood. A small first-century fishing boat overwhelmed by a towering black storm wave on the Sea of Galilee at night: mast leaning, torn sail snapping in the gale, ropes whipping, seawater flooding over the gunwale. Robed figures appear only as dark struggling silhouettes clinging to the rigging — no clear faces. Dramatic chiaroscuro: a single warm amber lantern swinging on the mast is the ONLY light source, casting deep pooled shadows and golden rim-light along wet hull, wave crests and rope; the roiling sea and sky in desaturated stormy blue-grey. Rich blacks and deep browns, heavy weathered texture, fine cross-hatch engraving detail, cinematic depth, faint gleam on blackened brass. Low-key warm-toned. Absolutely NO text, letters, captions, numbers or modern objects. Cinematic wide landscape.
```

## C2. gerasa.webp — 제2장 '무덤 섬' (거라사 해안, Portrait 2:3)
```
Dark moody painterly ink-wash and fine digital-engraving illustration, premium vintage nautical storybook / Uncharted concept-art. Establishing wide shot: the desolate rocky shore of the Gerasene tomb-island at dusk, seen low from the prow of an approaching wooden ship. A steep dark cliff face pocked with rows of ancient hewn-stone burial tombs and black cave mouths, half-swallowed by low drifting sea-mist. Cold desaturated storm blue-grey sky and water in the mid and far ground; in the extreme bottom-foreground a coil of sea-soaked rope on weathered blackened-oak rail lit by a single warm amber lantern casting golden rim-light. Dramatic chiaroscuro, deep pooled shadow between the tombs, amber haze catching mist edges. Fine cross-hatch texture, cinematic depth. Ominous, sacred, foreboding. No people (or only a distant hunched silhouette), no text, lettering or modern objects. Rich blacks and deep browns with warm amber highlights. Portrait 2:3.
```

## C3. sending.webp — 최종장 인트로 (어두운·꺼진 등대, Landscape 4:3)
```
Dark moody painterly ink-wash and digital-engraving illustration, premium vintage nautical storybook / Uncharted concept-art. Seen from the deck of a small weathered wooden sailing ship at blue-hour dusk, a tall dark stone lighthouse rises on a rocky headland ahead, its glass-and-brass lantern room COLD and UNLIT — no light in the tower, a heavy barred iron-and-oak sealed door at its base. Post-storm sea, low calming swells in desaturated storm blue-grey. Foreground: the ship's mast and tarred rigging with a short halyard of small furled weather-beaten canvas signal pennants (generic tapering pennant shapes only, NO readable symbols, numbers or markings). A single warm amber lantern on the ship's rail is the only warm light, raking across weathered dark-oak woodgrain, blackened brass, rope and canvas, deep pooled shadows, golden rim-light on nearby edges. Rich blacks and deep browns, warm amber accents, cold blue-grey sea and sky. Dramatic chiaroscuro, fine cross-hatch texture, cinematic depth. Mood: goal in sight but the light not yet lit — reverent hush. Absolutely NO text, letters, captions, numbers or modern objects. Landscape 4:3.
```

## C4. finish.webp — 엔딩 (불 켜진 등대, 빛줄기 직접 페인팅, Landscape 4:3)
정적 빛줄기를 webp에 직접 그려야 함(.beam 애니는 폴백 SVG 전용). 상단 중앙 광원을 깨끗이 비워 배치.
```
Dark moody painterly ink-wash and digital-engraving illustration, premium vintage nautical storybook / Uncharted concept-art — the triumphant payoff frame. The same tall dark stone lighthouse now BLAZING: its glass-and-brass lantern room glows brilliant amber-gold at the crown of the tower, and a strong warm painted light-beam rakes outward across a calm dark sea into the night. Below on the water a small weathered wooden sailing ship rests safe within the golden pool of light. Deep night-blue and blue-black sea and sky, everything else rich blacks and deep browns, radiant warm amber and gold flooding from the lantern, rim-lighting the tower's blackened brass, wet stone and the ship's mast. Dramatic chiaroscuro, the glowing lantern crown as the dominant focal point placed upper-center (keep the top-center glow clean and prominent). Fine engraving and cross-hatch texture, cinematic depth, subtle metallic glints on brass. Mood: arrival, homecoming, deliverance. Absolutely NO text, letters, captions, numbers or modern objects. Landscape 4:3.
```

## C5. prologue.webp — 프롤로그 전용 씬 (hero 분리, 선택)
채택 시 index.html 1632행 `'hero'→'prologue'` 교체.
```
Night at the foot of a weathered wooden ship's boarding gangway on a stone pier, intimate and close. A pair of hands in dark first-century robes holds up a blank sea-stained parchment letter toward a single hanging lantern, warm light glowing through the empty page so it reads mysteriously blank. Behind, the dark silhouette of a moored sailing ship's hull and rigging looms against a brooding storm-blue night sky. Dramatic chiaroscuro, single warm lantern source, deep pooled shadows, golden amber rim-light on wet timber, coiled ropes and the raised letter's edge. Painterly ink-wash and engraving detail, high texture, cinematic depth, low-key warm palette of rich blacks, deep browns and amber gold against desaturated blue-grey sky. The figure's face is hidden or turned away — only a robed silhouette. CRITICAL: absolutely no text or writing on the letter or anywhere. Landscape 4:3.
```

## C6. scene-gerasa-tombdoor.webp — p7 다이얼 헤더 (봉인된 무덤 석문)
다이얼 면·석문에 **어떤 상징도 새기지 말 것**(정답 순서 노출 금지). Landscape 3:2.
```
Intimate found-object close-up, dark painterly-engraving style, dramatic chiaroscuro. An ancient sealed tomb doorway carved into a mist-shrouded cliff face; its great weathered stone slab bound shut with heavy rusted iron bands and a large circular corroded brass combination-dial mechanism at its center — the dial faces worn smooth and completely BLANK. Chiseled blackened stone, creeping salt and pale lichen, a few frayed rope strands. Lit by a single warm amber lantern just out of frame: raking golden light and metallic glint across aged brass, deep shadow sunk into the recesses. Tactile cross-hatch texture, faint drifting sea-mist, cinematic depth. Keep all dial faces and stone blank and abstract — no symbols, icons, numbers, text or modern objects. Landscape 3:2.
```

## C7. scene-gerasa-restored.webp — p8 헤더 (새사람 된 거라사인)
두루마리 완전 공백, 얼굴 무노출. 회복·평온 톤. Landscape 3:2.
```
Dark painterly ink-wash / engraving illustration, premium storybook style but warmer and tender (a redeemed contrast to earlier torment). A calm first-century man now clothed in a clean simple woven tunic, seated on a low stone at the shore near the tombs at first light, shown from behind and in three-quarter silhouette with his face turned away and unlit — no detailed features. Beside him a rolled BLANK scroll and a reed pen; a broken iron shackle set aside on the ground. Soft warm amber dawn light plus a single low lantern glow, gentle golden rim-light on his shoulders and the scroll, receding sea-mist and quiet water behind. Softer chiaroscuro, fine cross-hatch texture, cinematic depth, peaceful atmosphere. Rich browns and warm ambers, muted blue-grey only in the distant sea. The scroll must be completely blank — no writing, text, letters, numbers or modern objects. Landscape 3:2.
```

## C8. scene-crowd-hem.webp — p9 헤더 (옷깃에 닿은 손)
**여러 익명의 손**이 동시에 옷깃을 향해 단 하나의 인물을 특정하지 않게(퍼즐 정합). 번호·글자 금지. Wide 5:2.
```
Dark moody painterly ink-wash / digital-engraving illustration, cohesive with the ship scenes. Over-the-shoulder view from directly behind a tall robed standing figure (seen only as a dark back-lit silhouette from behind, NO face), looking into a dense crowd of hooded veiled pilgrims pressing forward on a dusty sunlit quay. Many anonymous weathered hands reach in through the throng toward the trailing hem and tasseled fringe of the standing figure's cloak; several hands at once, none singled out; one hand near the lower edge just brushing the fringe. Heavy warm dust in low golden sunlight. Horizontal banner: the robed back filling left/center, crowd and reaching hands filling right and lower band, hem-fringe as the quiet focal line. Dramatic chiaroscuro, warm amber low-sun rim-light on shoulders and hands, deep shadow in the crowd, faces obscured by hoods, veils and shadow. Rich blacks, deep browns, dusty amber/gold, desaturated. Fine engraving texture, cinematic depth. IMPORTANT: multiple reaching hands so no single figure is emphasized; no numbers, letters, text, modern objects or readable faces. Wide landscape banner ~5:2.
```

## C9. scene-talitha-dawn.webp — p11 '달리다굼' (작은 손을 잡는 클로즈업)
p10 레핀 넓은 장면과 중복 피해 친밀한 클로즈업으로 차별화. Landscape.
```
Dark moody painterly ink-wash / digital-engraving illustration, cohesive premium storybook set. Intimate extreme close-up of a large weathered hand gently clasping a small child's pale once-limp hand, the child's fingers just beginning to curl with returning life. The hands rest on a simple linen-draped low bed in a dim stone chamber. First cold pale dawn light breaks through a small shuttered window at left, meeting the last warm guttering glow of a nearly spent mourning-lamp at right; fine dust motes drift in the light shaft. The two clasped hands the sole focal point, softly cropped; background chamber melting into shadow. Dramatic chiaroscuro, cold dawn key from left vs warm dying lamp from right, deep pooled shadows, tender golden rim-light on the clasped fingers. Deep browns and blacks, warm amber lamp glow, a single sliver of desaturated dawn blue-grey. Mood: the hushed instant life returns. NO faces, text, letters, numbers or modern objects. Landscape.
```

## C10. flags-banner.webp — p12 신호기 코드표 헤더 (선택)
코드표 가독성 위해 **펼쳐진·판독되는 깃발 금지**(furled만). 하단에 어두운 여백. Landscape.
```
Dark moody painterly ink-wash and digital-engraving illustration, cohesive premium nautical set. Wide banner close-up of a weathered ship's signal-flag locker at the foot of the mast: neatly coiled tarred halyard rope, blackened brass cleats and a pulley block, and a few FURLED rolled canvas signal pennants tucked into open pigeonhole compartments (kept furled and generic — NO unfurled readable flags, symbols, numbers or markings anywhere). A single warm amber lantern glow washes across weathered dark oak, sea-stained canvas, rope fibers and blackened brass, deep pooled shadows, golden amber rim-light on the edges. Low-key rich blacks, deep browns and warm amber. Fine cross-hatch texture, subtle metallic glints. Wide landscape header with dark negative space at the bottom so a code table can sit below without clutter. Absolutely NO text, letters, captions, numbers or modern objects.
```

---

# 4. [선택] 시트 B — 도구 아이콘 6컷

> **통합 처리:** 원래 `p1-tool-uv`와 `tool-uv`가 둘 다 `assets/tool-uv.webp`를 가리키는 중복이었음 → 이 시트의 패널2 하나로 통합(보라 UV 등불).

시트 스펙: 캔버스 ~1536×1024, **3열 × 2행**, 각 패널 512×512 정사각, 얇은 경계, 6패널 모두 어두운 near-black 비네트 배경에 오브젝트 단독 중앙 배치·동일 조명.

- 패널1 = `assets/tool-key.webp` / 패널2 = `assets/tool-uv.webp` / 패널3 = `assets/tool-cross.webp`
- 패널4 = `assets/tool-hammer.webp` / 패널5 = `assets/tool-flint.webp` / 패널6 = `assets/tool-oil.webp`

```
A single 1536x1024 image, a clean 3-columns x 2-rows contact sheet of six separate square inventory-icon panels, each 512x512, divided by thin clean 1px gutters for slicing. ALL six share one cohesive art style: dark moody painterly ink-wash and engraving illustration matching a premium vintage nautical set; each is a single object floating centered against a dark near-black vignette with clear margin and an uncluttered background; single warm light source, chiaroscuro, amber rim-light, subtle metallic shimmer, fine engraving texture; rich blacks and deep browns, warm amber-gold highlights, low-key warm tone. Absolutely NO text, letters, captions, numbers, modern objects or faces in any panel.

PANEL 1 (top-left): an ornate antique brass key, decorative bow with a small cross-shaped bit, aged blackened brass with warm amber highlights.
PANEL 2 (top-center): an antique lantern glowing with an eerie violet-purple ultraviolet light, blackened-brass frame and dark smoked-glass housing, the cool violet inner glow the ONLY cold accent against warm-dark surroundings, amber rim-light on the metal.
PANEL 3 (top-right): a small hand-carved wooden cross, dark weathered oak grain with worn edges, softly and reverently lit, quiet sacred mood.
PANEL 4 (bottom-left): an old wooden mallet with a cylindrical wooden head and worn turned handle, dark weathered timber with visible grain and dents.
PANEL 5 (bottom-center): a piece of dark flint stone paired with a curved steel striker, partly wrapped in aged cloth, a faint spark implied at the edge, gritty tactile texture.
PANEL 6 (bottom-right): an antique brass lighthouse oil can / flask with a long slender pouring spout and a small handle, aged blackened brass with warm amber highlights and a faint reflective sheen.
```

---

# 5. [선택] 시트 C — 종이/양피지 텍스처 2컷

> 완전 공백 필수(위에 라이브 텍스트가 얹힘). permit-parchment(B2)는 임베딩 워터마크 때문에 별도 단독으로 이미 처리했으므로 여기선 2컷.

시트 스펙: 캔버스 ~1536×1024, **2열 × 1행** portrait 패널(각 ~700×1000), 얇은 경계.

- 패널1(좌) = `assets/paper-gerasa-letter.webp` (p8 편지 배경)
- 패널2(우) = `assets/tex-thief-note-paper.webp` (p2 쪽지 종이, 저대비 강조)

```
A single 1536x1024 image, two separate portrait paper-texture panels side by side, divided by a thin clean gutter for slicing. Both share a dark moody vintage premium look, warm lantern light grazing from one side, soft edge shadow, rich fibrous paper grain, low-key. CRITICAL for both: absolutely blank writing surfaces — NO writing, letters, characters, numbers or printed marks of any kind, no modern objects — so dark ink text can later be overlaid legibly.

PANEL 1 (left): a single aged sea-weathered parchment / vellum sheet, empty and blank, viewed flat from directly above. Warm ivory-to-amber tone, softly foxed and water-stained at the edges, one corner slightly torn, a faint pressed fold down the middle, a small cracked deep-red wax-seal fragment near the lower edge. Muted and low-key. Portrait.

PANEL 2 (right): a small aged torn slip of paper hidden behind a painting frame, yellowed, foxed and water-spotted with a rough torn edge and faint fold creases, VERY low contrast and muted so dark ink text overlaid stays perfectly readable. Delicate paper-fiber and stain texture only. Flat scan-like top view, tactile found-object feel. Portrait.
```

---

# 6. [선택] 단독 소품

## F1. permit-wax-seal.webp — 선장의 밀랍 봉인 (Square 1:1)
양피지와 겹치지 않게 봉인 단독. 오버레이용 어두운 비네트.
```
A single antique wax seal, extreme close-up, pressed in glossy deep oxblood-red sealing wax. The raised emblem is a simple anchor entwined with a slender upright cross — an embossed device only, no letters. Dramatic single warm lantern light from the upper left, glossy specular highlight on the crest of the wax, deep shadow pooling in the recesses, warm amber rim-light along the raised outer edge, tiny cracks and a couple of frozen drips at the rim. Painterly engraving detail, tactile and physical. Rich oxblood red with blackened shadow and gold-amber accents. Isolated and centered on a soft dark vignette so it can overlay parchment. No text, numerals or date. Square 1:1.
```

## F2. refl-water-caustics.png — p10 물결 코스틱스 오버레이 (투명 PNG, 선택 폴리시)
CSS shimmer로 충분하면 생략 가능한 순수 폴리시.
```
Seamless subtle water-caustics / gentle ripple reflection texture as a semi-transparent PNG overlay. Faint cold moonlit blue-white caustic highlights and soft horizontal ripple bands over near-transparent darkness, low contrast, no subject, no text. Designed to layer at low opacity over a darkened mirror-reflection of a painting to sell a "room reflected in water" effect. Tileable horizontally, landscape, transparent background.
```

---

# 7. [선택] 방 배경 (파노라마·포트레이트) — 각 단독

핫스팟이 % 좌표로 얹히므로 **중앙을 비교적 비워** 스테이징. 각 원본 비율 유지.

## G1. room-deck.webp — 갑판 (초광각 ~2.85:1)
```
Wide panoramic view of the weather deck of an age-of-sail wooden sailing ship at night. Dark oak deck planks, a tall central mast with a furled canvas sail, a coil of heavy rope on the left, a bronze ship's bell, a rain-filled wooden water barrel, and a large iron anchor on the right; ropes and rigging overhead. Beyond the rails, a stormy desaturated blue-grey sea and sky with distant lightning. Single warm lantern glow, dramatic chiaroscuro, amber rim-light on wet wood and brass, deep shadows. Dark moody painterly ink-wash and digital-engraving illustration, premium vintage nautical storybook / Uncharted concept-art; rich blacks and deep browns, warm amber-gold highlights, storm blue-grey sea only; fine cross-hatch texture, cinematic depth. NO text, letters, captions, modern objects or faces. Very wide landscape ~2.85:1 panoramic, high resolution, central deck relatively open for interactive hotspots.
```

## G2. room-cabin.webp — 선장실 (초광각 ~2.85:1)
```
Wide panoramic interior of a ship captain's cabin at night. Dark wood-panelled walls; a heavy writing desk with rolled sea-charts and a locked drawer on the left, an ornate framed painting of a storm-tossed ship on the wall, a blackened-brass globe, and an oil lamp casting a warm pool of light. Weathered oak, aged brass, worn leather, spread of old navigation charts. Dramatic chiaroscuro, single warm lamp source, amber rim-light, deep shadows. Dark moody painterly ink-wash and digital-engraving illustration, premium vintage nautical storybook / Uncharted concept-art; rich blacks and deep browns, warm amber-gold highlights, low-key warm tone; fine cross-hatch detail, cinematic depth. NO text, letters, captions, modern objects or faces. Very wide landscape ~2.85:1 panoramic, high resolution, balanced staging so hotspots read clearly.
```

## G3. room-crew.webp — 선원실 (~1.4:1)
```
Interior of a cramped ship's crew quarters below deck at night. Stacked wooden bunks with rough canvas blankets on the left, a slung rope hammock in the middle, a wall cupboard with tin plates on the right, and a pair of worn leather sea-boots on the plank floor. Dark weathered timber, low ceiling beams, hanging lantern. Single warm lantern light, dramatic chiaroscuro, amber rim-light on timber edges, deep shadows. Dark moody painterly ink-wash and digital-engraving illustration, premium vintage nautical storybook / Uncharted concept-art; rich blacks and deep browns, warm amber-gold highlights, low-key warm tone; canvas and weathered-oak texture, fine cross-hatch, cinematic depth. NO text, letters, captions, modern objects or faces. Landscape ~1.4:1, high resolution.
```

## G4. room-hold.webp — 화물칸 (~1.47:1)
```
Interior of a ship's cargo hold below the waterline at night. Stout nailed wooden crates stacked in the center, round wine and water barrels on the left, a hanging fishing net crusted with sea-salt in the upper right, grain sacks slumped on the floor, ribbed hull timbers curving overhead, and a rat's shadow lurking in a dark corner. Damp sea-worn dark wood. Single warm lantern light, dramatic chiaroscuro, amber rim-light, deep pooling shadows. Dark moody painterly ink-wash and digital-engraving illustration, premium vintage nautical storybook / Uncharted concept-art; rich blacks and deep browns, warm amber-gold highlights, low-key warm tone; heavy weathered-wood and rope texture, fine cross-hatch, cinematic depth. NO text, letters, captions, modern objects or faces. Landscape ~1.47:1, high resolution.
```

## G5. room-wheel.webp — 조타실 (Portrait 3:4)
포트레이트 분기에서 블러 배경+선명 스테이지 둘 다 이 파일 사용. 3:4 필수.
```
Interior of a ship's wheelhouse in a storm, vertical composition. A great turned-spoke wooden ship's helm wheel dominates the center, a blackened-brass binnacle compass housing beside it, a storm-lashed window above showing lightning over a blue-grey night sea, and a low iron-bound navigation chest in the lower-left corner. Weathered oak, aged brass, wet reflections. Single warm lantern light, dramatic chiaroscuro, amber rim-light on wheel spokes and brass, deep shadows, tense stormy mood. Dark moody painterly ink-wash and digital-engraving illustration, premium vintage nautical storybook / Uncharted concept-art; rich blacks and deep browns, warm amber-gold highlights, desaturated storm blue-grey through the window; fine cross-hatch detail, cinematic depth. NO text, letters, captions, modern objects or faces. Portrait 3:4, high resolution.
```

## G6. room-secret.webp — 비밀 선창 (Portrait 3:4, 가장 어둡고 신비)
```
Interior of a hidden secret hold deep in the bilge of the ship, vertical composition, oppressively dark and secretive. A lone lantern burns in the upper left casting a small warm pool of light; dusty forgotten crates stacked in the lower left; a large iron-bound captain's treasure chest sits center-right, sealed with a heavy old lock. Cobwebs, damp ribbed hull timbers, still air. Deep blacks with a single warm flame source, strong chiaroscuro, amber-gold rim-light picking out the chest's ironwork, mysterious sacred atmosphere. Dark moody painterly ink-wash and digital-engraving illustration, premium vintage nautical storybook / Uncharted concept-art; rich blacks and deep browns, warm amber-gold highlights, low-key warm tone; fine cross-hatch detail, heavy texture, cinematic depth. NO text, letters, captions, modern objects or faces. Portrait 3:4, high resolution.
```

## G7. ship-map.webp — 배 단면도 지도뷰 (~1.5:1, 세피아 스키매틱)
MAP_SPOTS 좌표(deck 15/33, wheel 45/19, cabin 66/46, crew 19/62, hold 53/75, secret 80/67)에 6구획이 그 위치에 오도록. **라벨·글자 절대 금지**.
```
A vintage cutaway cross-section illustration of a whole wooden sailing ship seen from the side, revealing its internal decks like an antique schematic diagram. From top: the weather deck with tall mast and furled sail; the wheelhouse toward the bow-upper area; the captain's cabin toward the stern; the crew quarters lower forward; a large cargo hold in the belly; and a small hidden secret hold tucked in the bilge near the stern — each a distinct visible compartment, arranged so the six rooms sit at readable, well-separated positions. Drawn as an aged nautical schematic on parchment-toned ground, warm sepia and amber inks, engraving and cross-hatch linework, weathered vintage-map feel, subtle candle-warm lighting and edge vignette. Rich sepia, browns and amber-gold. ABSOLUTELY no text, labels, numbers or compass-rose lettering anywhere. Landscape ~1.5:1, high resolution.
```

---

# 8. [다운로드] 위키미디어 공용(PD) 명화 — 생성 금지

> 좌표·계수형 퍼즐이 원화 구도에 의존하므로 **크롭·AI 리터치 금지**, 원본 프레이밍 유지. 최고해상도 PD 스캔을 받아 web용(webp/data-URI)으로만 다운스케일.

## H1. [다운로드★] 렘브란트 「갈릴리 바다의 폭풍」(1633) — p2 좌표 퍼즐
- 검색어: `Rembrandt Storm on the Sea of Galilee Wikimedia Commons full resolution`
- 원소장 Isabella Stewart Gardner Museum(1990 도난). PD.
- 정면 응시 자화상 인물(밧줄·모자 쥔 사내)이 3×3 격자 **나3** 칸에 오도록 원 구도 유지.
- 저장: `assets/painting-rembrandt-storm-galilee.webp` 로 외부화 후 index.html:514 `PAINTINGS.rembrandt` src 갱신(가로 1600px+ 권장).

## H2. [다운로드★] 일리야 레핀 「야이로의 딸을 살리심」(1871) — p10 촛불 계수 퍼즐
- 검색어: `Repin Raising of Jairus Daughter 1871 Wikimedia Commons` / `Воскрешение дочери Иаира Репин`
- State Russian Museum. PD.
- **타오르는 촛불이 명확히 구분·계수 가능**한 최고해상도(가로 1600px+). 크롭·리터치 금지(촛불 수=정답 Ⓒ=3).
- 저장: `assets/painting-repin-jairus.jpg`(또는 base64 재임베드) → index.html:513 `PAINTINGS.repin` 원본·반사본 양쪽 공용.

## H3. [다운로드] 브라이턴 리비에르 「가다라 돼지의 기적」(1883) — 제2장 선택 명화
- 검색어: `Briton Riviere Gadarene Swine`. 작가 1920 사망, PD.
- 활용: `PAINTINGS.gadarene` 추가 → paintingHtml() 또는 신규 관찰 퍼즐(ch1/ch3 패턴). 대안: Gustave Doré 성경 목판화도 화풍 궁합 좋음.

## H4. [다운로드] 홀먼 헌트 「세상의 빛」(1851–53) — 최종장 선택 명화
- 검색어: `William Holman Hunt The Light of the World` / `File:William Holman Hunt - The Light of the World.jpg` (Keble College Oxford). PD.
- 등불 든 그리스도가 닫힌 문을 두드리는 장면 — 등대·'예수를 바라보자'(히12:2) 주제와 정확히 일치. Portrait 아치형 크롭.

---

# 9. 그대로 둘 것 (keep-svg — 생성 금지)

기능·판독·인터랙션이 정답 메커니즘이라 이미지화하면 퍼즐이 무너지는 요소들:

- **ART.chart (p3 해도 격자)** — 8×8 좌표 이동 퍼즐. 배경 질감(B3)만 뒤에 덧댐.
- **ART.morseTable (p4 모스 대조표)** — 숫자↔모스 참조표. 헤더 무드(B4)만 얹음.
- **ART.crowd (p9 군중 12명 보드)** — 번호·상대위치가 정답 로직. 배너(C8)만 얹음.
- **ART.mirrorLetter (p8 거꾸로 편지)** — scaleX(-1)+절번호 `<sup>` 라이브 텍스트. 배경(E1)만 뒤에.
- **ART.flags (p12 신호기 코드표+게양)** — 도형·180° 회전 판별이 정답. 배너(C10)만 얹음.
- **IC.tomb/chain1/pig/boat/house/tunic (p7 다이얼 6상징)** — 50px 라이브 선택 아이콘. (미래안: 판독성 유지 시 '인그레이빙 황동 토큰' 세트 승격 여지.)
- **ScratchX canvas (p2 덧칠 스크래치)** — 문질러 벗기는 인터랙션이 핵심, 밑글씨 crisp 유지.
- **IC.lighthouse (등대 폴백 SVG)** — webp 로드 실패 시 .beam 애니 폴백. 재생성될 sending/finish의 실루엣·빛줄기 방향과 톤만 어색하지 않게 맞출 것.
- **ART.signs (여섯 표적 그리드)** — 정답 글자 박힌 스포일러성 미사용 잔재. **생성 금지 + 죽은 코드 제거 검토 권장.**

---

## 실행 순서 요약
1. **시트 A**(닫힌 확대컷 6) 뽑고 → 슬라이스 → 기존 `-open.webp`와 카메라 정합 검증(어긋난 패널만 단독 재생성).
2. **B1 hero** → **B2~B8** 퍼즐 고유 삽화 순서대로.
3. **C1~C4** 챕터 씬 재생성(대표 화질 불만분) → C5~C10 보조.
4. **시트 B**(도구) → **시트 C**(종이) → F1/F2 소품.
5. **G1~G7** 방/지도 배경.
6. **H1~H4** 위키미디어 명화 다운로드(생성 아님).
7. keep-svg 9종은 손대지 않음(ART.signs만 제거 검토).

전 프롬프트 공통: **그림 안에 텍스트·정답 숫자·글자 절대 금지.**