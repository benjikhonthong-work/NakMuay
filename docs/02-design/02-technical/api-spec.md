# API Spec — NakMuay

สัญญาการทำงานเชิง logical — **ไม่ผูกกับ tech stack** ไม่ระบุ HTTP method, path, protocol หรือรูปแบบข้อความใดๆ

- ปรับปรุงล่าสุด: 28 สิงหาคม 2569
- แหล่งความจริง: [[architecture]] (component เจ้าของ operation) · [[db-spec]] (field ทุกตัว) · [[feature-list]]
- เอกสารปลายทาง: `detailed-design/` — sequence diagram ต้องอ้างชื่อ operation ในไฟล์นี้เท่านั้น

**หลักการ:** operation คือ *สิ่งที่ระบบทำได้* ไม่ใช่ *ปลายทางที่เรียกได้* — การแปลงเป็น endpoint จริง
รอ [[technology-stack]] · ทุก field ใน input/output ต้องสืบย้อนไปหา attribute ใน [[db-spec]] ได้

**รหัสข้อผิดพลาด** เป็นรหัสเหตุผล ไม่ใช่ข้อความ เพื่อรองรับสองภาษาตาม [[backlog|NFR-09]]

---

## 1. Profile & Camp (เจ้าของ: S1)

| Operation | ทำอะไร | Input | Output | ข้อผิดพลาด | FR |
|---|---|---|---|---|---|
| `CreateAthleteProfile` | สร้างโปรไฟล์นักมวย | display_name, sex, birth_date, height_cm, default_weight_class_kg | athlete_id | `REQUIRED_FIELD_MISSING` (ระบุชื่อ field), `BIRTH_DATE_NOT_IN_PAST` | FR-01 |
| `CreateFightCamp` | สร้างแคมป์ | athlete_id, fight_date, weigh_in_date, weight_class_kg | camp_id, camp_phase | `WEIGH_IN_AFTER_FIGHT_DATE`, `REQUIRED_FIELD_MISSING` | FR-02 |
| `GetCurrentCampPhase` | อ่านช่วงแคมป์ปัจจุบัน | athlete_id, as_of_date | camp_phase, days_to_fight, days_to_weigh_in | `NO_ACTIVE_CAMP` | FR-03 |
| `RescheduleFight` | เลื่อนวันชก | camp_id, new_fight_date, new_weigh_in_date | camp_phase ใหม่, รายการช่วงที่เปลี่ยนไป | `WEIGH_IN_AFTER_FIGHT_DATE`, `CAMP_ALREADY_COMPLETED` | FR-04 |
| `ConfirmWeighIn` | ยืนยันว่าชั่งผ่านแล้ว | camp_id, actual_weight_kg | camp_phase (เข้าสู่ Weigh-in→Fight) | `CAMP_NOT_IN_WEIGHT_CUT_PHASE` | FR-20 |

## 2. Wearable & Baseline (เจ้าของ: C4, S2)

| Operation | ทำอะไร | Input | Output | ข้อผิดพลาด | FR |
|---|---|---|---|---|---|
| `PullWearableReadings` | ดึงข้อมูลรายคืนจากแพลตฟอร์มภายนอก | athlete_id, since_date | จำนวนคืนที่ดึงได้, night_of ล่าสุด | `WEARABLE_NOT_AUTHORIZED`, `WEARABLE_UNAVAILABLE` | FR-05 |
| `GetLatestReading` | อ่านข้อมูลของคืนที่ผ่านมา | athlete_id, night_of | hrv, resting_hr, sleep_total_min, sleep_deep_min, sleep_efficiency, **data_available** | — (ไม่มีข้อมูลไม่ถือเป็นข้อผิดพลาด คืน `data_available` เป็นเท็จ) | FR-05 |
| `GetBaselineStatus` | ตรวจว่า baseline พร้อมหรือยัง | athlete_id | is_ready, sample_days, days_remaining | — | FR-06 |
| `RecomputeBaseline` | คำนวณ baseline ใหม่ | athlete_id, signal | central_value, spread, sample_days | `INSUFFICIENT_HISTORY` | FR-06 |

## 3. Training Log (เจ้าของ: S3)

| Operation | ทำอะไร | Input | Output | ข้อผิดพลาด | FR |
|---|---|---|---|---|---|
| `LogTrainingSession` | บันทึกเซสชันซ้อม | athlete_id, load_type, occurred_on, duration_min, (sparring_detail หรือ resistance_detail ตามสกุล) | session_id | `LOAD_TYPE_REQUIRED`, `SPARRING_ROUNDS_REQUIRED`, `DETAIL_NOT_MATCHING_LOAD_TYPE` | FR-07, FR-08, FR-09 |
| `LogSoreness` | บันทึกจุดที่ปวด | athlete_id, recorded_on, รายการ (body_part, severity), session_id (ไม่บังคับ) | จำนวนรายการที่บันทึก | `UNKNOWN_BODY_PART`, `SEVERITY_OUT_OF_RANGE` | FR-11 |
| `GetSparringLoad` | อ่านยอดสะสมสปาร์ริง | athlete_id, as_of_date | rounds_7d, rounds_28d, sessions_7d, last_sparring_on | — | FR-10 |
| `GetSessionHistory` | อ่านประวัติเซสชัน | athlete_id, range_from, range_to, load_type (ไม่บังคับ) | รายการเซสชันพร้อมรายละเอียด | — | FR-07 |

## 4. Daily Intake (เจ้าของ: S4)

| Operation | ทำอะไร | Input | Output | ข้อผิดพลาด | FR |
|---|---|---|---|---|---|
| `SubmitSymptomCheck` | ส่ง checklist อาการ | athlete_id, checked_on, no_symptoms, symptoms | check_id, triggered_alert (ค่าจริงเท็จ) | `SYMPTOMS_PRESENT_WITH_NO_SYMPTOMS_FLAG` | FR-12 |
| `SubmitNeuroTest` | ส่งผลทดสอบระบบประสาท | athlete_id, test_type, raw_value, duration_sec | test_id, vs_baseline, baseline_available | `TEST_DURATION_EXCEEDED` | FR-13, FR-15 |
| `SubmitPowerTest` | ส่งผลนับหมัด 10 วินาที | athlete_id, punch_count | test_id, percent_of_personal_best, personal_best | `PUNCH_COUNT_INVALID` | FR-14 |
| `LogBodyWeight` | บันทึกน้ำหนักเช้า | athlete_id, measured_on, weight_kg | distance_to_class_kg, weekly_rate_kg, rate_exceeds_safe_limit | `DUPLICATE_ENTRY_FOR_DATE`, `WEIGHT_OUT_OF_RANGE` | FR-16, FR-19 |
| `LogHydration` | บันทึกน้ำและสีปัสสาวะ | athlete_id, recorded_on, urine_shade, fluid_ml | entry_id | `URINE_SHADE_OUT_OF_RANGE` (ต้อง 1–8) | FR-17 |
| `LogNutrition` | บันทึกอาหารสามคำถาม | athlete_id, recorded_on, ate_after_training, protein_meals, carb_level | entry_id | `REQUIRED_FIELD_MISSING` | FR-18 |
| `LogSubstance` | บันทึกคาเฟอีน/แอลกอฮอล์ | athlete_id, substance, consumed_at, amount | entry_id | `UNKNOWN_SUBSTANCE` | FR-21 |

> `LogNutrition` **ไม่มี** field แคลอรี่หรือน้ำหนักอาหารโดยเจตนา ตาม [[backlog|FR-18]]

## 5. Scoring & Verdict (เจ้าของ: S5, S6)

| Operation | ทำอะไร | Input | Output | ข้อผิดพลาด | FR |
|---|---|---|---|---|---|
| `ComputeDomainScores` | คำนวณคะแนน 6 หมวด | athlete_id, scored_on | รายการ 6 รายการ: domain, level (1–5 หรือว่าง), data_available, contributing_factors, camp_phase_at_scoring | `BASELINE_NOT_READY` | FR-22, FR-24 |
| `GetDailyVerdict` | อ่านคำตัดสินประจำวัน | athlete_id, verdict_on | limiting_domains (หลายค่าได้), session_menu (4 รายการ), camp_phase, scores | `SCORES_NOT_COMPUTED` | FR-23, FR-25 |
| `GetScoreExplanation` | อ่านที่มาของคะแนนหนึ่งหมวด | athlete_id, scored_on, domain | รายการ contributing_factors พร้อมทิศทางที่ทำให้ขึ้นหรือลง | `NO_EXPLANATION_AVAILABLE` | NFR-08 |

**กฎที่ operation เหล่านี้ต้องบังคับ**

- `ComputeDomainScores` คืน `level` เป็นค่าว่างเมื่อ `data_available` เป็นเท็จ **ห้ามคืนค่าที่เดาขึ้นมา** ([[backlog|FR-22]])
- `GetDailyVerdict` ต้องคืน `session_menu` ครบ **4 รายการเสมอ** ทุกรายการมีรหัสเหตุผลกำกับ ([[backlog|FR-25]])
- `limiting_domains` เป็น **รายการ** ไม่ใช่ค่าเดี่ยว เพราะเสมอกันได้ ([[backlog|FR-23]])
- **ไม่มี operation ใดในระบบที่คืนคะแนนรวมหรือค่าเฉลี่ยของ 6 หมวด** — เป็นข้อห้ามเชิงสถาปัตยกรรม ([[backlog|FR-23]])

## 6. Alerts (เจ้าของ: S7)

| Operation | ทำอะไร | Input | Output | ข้อผิดพลาด | FR |
|---|---|---|---|---|---|
| `EvaluateAlerts` | ตรวจเงื่อนไขคำเตือนทั้งสามชนิด | athlete_id, as_of_date | รายการ alert: alert_type, trigger_reason, requires_medical_referral | — | FR-19, FR-26, FR-27 |
| `GetOpenAlerts` | อ่านคำเตือนที่ยังเปิดอยู่ | athlete_id | รายการ alert พร้อม raised_on | — | FR-26 |
| `AcknowledgeAlert` | บันทึกว่าผู้ใช้รับทราบ | alert_id | acknowledged_at | `ALERT_NOT_FOUND` | FR-26 |

> `requires_medical_referral` **ต้องเป็นจริงเสมอ** สำหรับ `alert_type` ที่เป็นภาระที่ศีรษะ
> และ output ต้องไม่มี field ใดที่ระบุชื่อภาวะหรือโรค ตาม [[backlog|NFR-04]]

## 7. Protocol & Response (เจ้าของ: S8, S9)

| Operation | ทำอะไร | Input | Output | ข้อผิดพลาด | FR |
|---|---|---|---|---|---|
| `AssignDailyProtocol` | เลือกโปรโตคอลของวัน | athlete_id, assigned_on | assignment_id, protocol_code, target_domain, planned_duration_sec | `NO_LIMITING_FACTOR_YET`, `PROTOCOL_ALREADY_ASSIGNED_TODAY` | FR-28 |
| `CompleteProtocol` | บันทึกว่าจบตัวจับเวลาแล้ว | assignment_id, elapsed_sec | completion_status, completed_at | `TIMER_NOT_FINISHED`, `ASSIGNMENT_NOT_FOUND` | FR-29 |
| `SkipProtocol` | บันทึกว่าข้าม | assignment_id | completion_status | `ASSIGNMENT_NOT_FOUND` | FR-29 |
| `GetProtocolResponse` | อ่านผลต่างคะแนนวันถัดไป | athlete_id, protocol_code | avg_delta_when_done, avg_delta_when_skipped, sample_size_done, sample_size_skipped | `INSUFFICIENT_DATA` | FR-30, FR-31 |

> `AssignDailyProtocol` ต้องปฏิเสธถ้ามีรายการของวันนั้นอยู่แล้ว — บังคับกฎ "วันละหนึ่งอย่าง" ([[backlog|FR-28]])
> `CompleteProtocol` ต้องปฏิเสธถ้า `elapsed_sec` ยังไม่ถึง `planned_duration_sec` ([[backlog|FR-29]] AC-3)

## 8. Summary & Export (เจ้าของ: S10)

| Operation | ทำอะไร | Input | Output | ข้อผิดพลาด | FR |
|---|---|---|---|---|---|
| `GetWeeklySummary` | สรุปรายสัปดาห์ | athlete_id, week_start | แนวโน้ม 6 หมวด, sparring_load, protocol_adherence_rate | `INSUFFICIENT_DATA` | FR-32 |
| `RequestExport` | ขอส่งออกข้อมูล | athlete_id, range_from, range_to, consent_confirmed | request_id | `CONSENT_REQUIRED`, `INVALID_DATE_RANGE` | FR-33, NFR-03 |
| `DeleteAllAthleteData` | ลบข้อมูลทั้งหมดของผู้ใช้ | athlete_id, confirmation | จำนวน entity ที่ถูกลบ | `CONFIRMATION_REQUIRED` | NFR-03 |

## 9. Sync (เจ้าของ: C3)

| Operation | ทำอะไร | Input | Output | ข้อผิดพลาด | NFR |
|---|---|---|---|---|---|
| `PushPendingEntries` | ส่งคิวที่บันทึกไว้ตอนออฟไลน์ | athlete_id, รายการ entry ที่ยังไม่ซิงก์ | จำนวนที่สำเร็จ, รายการที่ขัดแย้ง | `CONFLICT_REQUIRES_RESOLUTION` | NFR-06 |
| `GetSyncState` | อ่านสถานะการซิงก์ | athlete_id | last_synced_at, pending_count | — | NFR-06 |

---

## 10. Operation ↔ ขั้นตอนใน User Journey

| Journey | ขั้นตอน | Operation ที่ถูกเรียก |
|---|---|---|
| [[user-journey#Journey 1: เช้าหลังวันสปาร์ริงหนัก — ตัดสินใจว่าวันนี้ซ้อมอะไรได้\|J1]] 1 | เปิดแอปตอนเช้า | `PullWearableReadings` · `GetLatestReading` · `GetCurrentCampPhase` |
| J1 2 | ชั่งน้ำหนักและบันทึกภาวะน้ำ | `LogBodyWeight` · `LogHydration` |
| J1 3 | ตอบ checklist อาการ | `SubmitSymptomCheck` |
| J1 4 | ตรวจเงื่อนไขคำเตือน | `GetSparringLoad` · `EvaluateAlerts` |
| J1 5 | ทดสอบเวลาตอบสนอง | `SubmitNeuroTest` |
| J1 6 | แสดงคำเตือน | `GetOpenAlerts` · `AcknowledgeAlert` |
| J1 7 | ทดสอบนับหมัด | `SubmitPowerTest` |
| J1 8 | คำนวณคะแนน | `ComputeDomainScores` |
| J1 9–10 | limiting factor และเมนูการซ้อม | `GetDailyVerdict` · `GetScoreExplanation` |
| J1 11–14 | บันทึกเซสชันและจุดปวด | `LogTrainingSession` · `LogSoreness` |
| J1 15 | เสนอโปรโตคอล | `AssignDailyProtocol` |
| J1 16–18 | ทำหรือข้ามโปรโตคอล | `CompleteProtocol` · `SkipProtocol` |
| J1 19 | ผลต่างวันถัดไป | `GetProtocolResponse` |
| [[user-journey#Journey 2: สัปดาห์ทำน้ำหนัก — คุมการลดให้ปลอดภัยจนถึงวันชั่ง\|J2]] 1 | เข้าช่วง Weight cut | `GetCurrentCampPhase` |
| J2 2–4 | น้ำหนัก น้ำ อาหาร | `LogBodyWeight` · `LogHydration` · `LogNutrition` |
| J2 5–7 | ตรวจอัตราการลด | `EvaluateAlerts` · `GetOpenAlerts` |
| J2 8 | แปลผลตามช่วง | `ComputeDomainScores` |
| J2 9–10 | โหมดหลังชั่ง | `ConfirmWeighIn` · `GetCurrentCampPhase` |
| [[user-journey#Journey 3: ตั้งค่าครั้งแรกและช่วงเก็บ baseline\|J3]] 1–4 | ตั้งค่าครั้งแรก | `CreateAthleteProfile` · `CreateFightCamp` · `GetCurrentCampPhase` · `PullWearableReadings` |
| J3 5–7 | รอ baseline | `GetBaselineStatus` · `RecomputeBaseline` · `ComputeDomainScores` |
| J3 8 | เลื่อนวันชก | `RescheduleFight` |

---

## 11. ความสอดคล้องกับ [[db-spec]]

| ตรวจอะไร | สถานะ |
|---|---|
| ทุก field ใน input/output สืบย้อนไปหา attribute ใน [[db-spec]] ได้ | ผ่าน — ยกเว้นค่าที่คำนวณ (`distance_to_class_kg`, `weekly_rate_kg`, `rounds_7d`, `percent_of_personal_best`, `days_to_fight`) ซึ่งระบุไว้ใน [[db-spec]] แล้วว่าเป็นค่าคำนวณ ไม่เก็บซ้ำ |
| ไม่มี HTTP method / path / protocol | ผ่าน |
| ไม่มี SQL type หรือชื่อ database engine | ผ่าน |
| ข้อความข้อผิดพลาดเป็นรหัส ไม่ใช่ประโยค | ผ่าน — รองรับ [[backlog\|NFR-09]] |

## 12. ช่องว่างที่พบระหว่างออกแบบ

- **ไม่มี operation สำหรับรับอินพุตของหมวด Mind** เพราะ [[backlog]] ไม่มีรหัส FR รองรับ —
  `ComputeDomainScores` จึงจะคืน `data_available` เป็นเท็จสำหรับหมวดนี้เสมอ
  ต้องเพิ่ม FR ใหม่ผ่าน `/capture-requirement` ก่อนเริ่มพัฒนา
