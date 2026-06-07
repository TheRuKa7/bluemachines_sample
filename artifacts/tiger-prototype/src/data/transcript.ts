import { STAGES, OBJECTIONS, SYSTEMS, type StageId, type SystemId } from "./model";

export type TurnRole = "agent" | "customer" | "system" | "thinking";

export interface TranscriptTurn {
  role: TurnRole;
  text: string;
  systemTag?: string;
}

const systemShortLabels: Record<string, string> = {};
SYSTEMS.forEach((s) => { systemShortLabels[s.id] = s.shortLabel.toUpperCase(); });

function sysTag(systemId: SystemId, opType: string): string {
  return `${systemShortLabels[systemId] ?? systemId.toUpperCase()} ${opType}`;
}

const NAME = "Priya";

const STAGE_TRANSCRIPTS: Record<StageId, TranscriptTurn[]> = {
  APPROVED: [
    {
      role: "system",
      text: "Call initiated · Card Core READ: approval_status=APPROVED, approval_date=Nov 14 2024, preferred_language=English · CRM READ: customer_name=Priya Singh, segment=Premium, consent_state=verified, prior_calls=0",
      systemTag: sysTag("card_core", "READ"),
    },
    {
      role: "thinking",
      text: "Loaded: approval confirmed Nov 14. Segment: Premium — eligible for joining fee waiver and ₹500 cashback + Amazon Prime offer. Consent verified — safe to proceed. No prior contact history. Customer is unaware of eKYC requirement. Strategy: explain what eKYC is simply, make it feel like one small step, and hold the welcome offer as a nudge if there's hesitation.",
    },
    {
      role: "agent",
      text: `Hello, am I speaking with ${NAME}? This is Aria calling from Tiger Credit Card. Congratulations — your application was approved on November 14th! I'm calling to help you complete the last step so your card is active and ready to use. Do you have a couple of minutes?`,
    },
    {
      role: "customer",
      text: "Oh hi, yes. I didn't realise there were more steps after approval?",
    },
    {
      role: "thinking",
      text: "Customer didn't know about eKYC — common reaction. Should demystify it: frame as a 2-minute ID verification (not a lengthy process), and mention it's done on their phone. Don't overwhelm with detail. Prepare the ₹500 cashback mention as a secondary hook.",
    },
    {
      role: "agent",
      text: "Just one quick step — it's called eKYC, an online identity check that takes about 2–3 minutes on your phone. You'll get a secure link on your WhatsApp right after this call. Once that's done, we schedule a short video call and your card is live. The whole thing usually wraps up in a day or two.",
    },
    {
      role: "customer",
      text: "Okay that doesn't sound too bad. What do I need for the eKYC?",
    },
    {
      role: "thinking",
      text: "Customer is receptive. They're asking what's needed — good engagement signal. Required: Aadhaar or PAN on hand, good lighting for photo. Should keep the answer short and reassuring. Send the link now via WhatsApp to keep momentum.",
    },
    {
      role: "agent",
      text: "Just your Aadhaar or PAN number, and a well-lit spot for a selfie. That's it. I'll send the link to your registered WhatsApp number right now. One more thing — once your card is active, you get ₹500 cashback on your first transaction and an instant Amazon Prime membership. Worth completing today!",
    },
    {
      role: "customer",
      text: "Oh nice, I didn't know about the Prime benefit. Okay, please send the link.",
    },
    {
      role: "system",
      text: "WhatsApp notification triggered · eKYC deep-link sent to +91 98201 XXXXX · link_id=EK-2024-118943 · expiry=48hrs",
      systemTag: sysTag("notification", "NOTIFY"),
    },
    {
      role: "system",
      text: "CRM WRITE: disposition=ekyc_link_sent, next_action=await_ekyc_completion, call_duration=3m22s",
      systemTag: sysTag("crm", "WRITE"),
    },
  ],

  EKYC_PENDING: [
    {
      role: "system",
      text: "Call initiated · eKYC READ: status=PENDING, failure_reason=session_timeout, retry_count=2, last_attempted=Nov 15 2024 15:42 · CRM READ: objection_history=[], preferred_contact_time=evening, prior_calls=1",
      systemTag: sysTag("ekyc", "READ"),
    },
    {
      role: "thinking",
      text: "eKYC failure_reason=session_timeout — this is a connectivity issue, not an identity mismatch. Customer shouldn't be made to feel like something is wrong with their documents. retry_count=2, still under the 3-attempt escalation threshold — can retrigger safely. Prior call: 1 (initial outreach). Strategy: acknowledge the inconvenience, reassure it's a technical glitch, offer to resend the link right now.",
    },
    {
      role: "agent",
      text: `Hi ${NAME}, this is Aria from Tiger Credit Card. I'm following up on your eKYC — I can see you tried a couple of times but it didn't go through. I just want to let you know that's not unusual and it's not an issue with your documents. Is now a good time to sort it out?`,
    },
    {
      role: "customer",
      text: "Yes, it kept freezing at the end. I thought I did something wrong.",
    },
    {
      role: "thinking",
      text: "Customer confirms session_timeout issue — consistent with the logged failure_reason. They feel like it's their fault — should correct this clearly. The fix is simple: resend the link and advise them to use WiFi rather than mobile data for a stable session. No need to escalate yet.",
    },
    {
      role: "agent",
      text: "Not at all — what happened is the session timed out due to a connection drop, which is common on mobile data. The actual verification worked fine. I'll resend a fresh link right now. This time, try it on WiFi if possible and keep the screen from going to sleep during the photo step. Should take under 3 minutes.",
    },
    {
      role: "customer",
      text: "Okay that makes sense. Yeah I was on 4G. I'll use WiFi now.",
    },
    {
      role: "thinking",
      text: "Customer willing to retry. Retrigger eKYC link, update retry count in eKYC system. Log this as a successful contact with re-engagement. Set next follow-up if no completion within 24 hours.",
    },
    {
      role: "agent",
      text: "Perfect. I'll send the new link to your WhatsApp right now — you'll get it in under a minute. If you have a moment, you can start it while we're on the call and I can wait.",
    },
    {
      role: "customer",
      text: "Sure, I can see it on WhatsApp. Let me open it.",
    },
    {
      role: "system",
      text: "eKYC WRITE: new_session_triggered=true, link_id=EK-2024-119201, retry_count incremented to 3 · notification sent to WhatsApp",
      systemTag: sysTag("ekyc", "WRITE"),
    },
    {
      role: "system",
      text: "CRM WRITE: disposition=ekyc_retriggered, reason=session_timeout, next_action=monitor_completion",
      systemTag: sysTag("crm", "WRITE"),
    },
  ],

  EKYC_COMPLETE: [
    {
      role: "system",
      text: "Call initiated · eKYC READ: status=VERIFIED, completion_time=Nov 16 2024 10:23 · VKYC READ: eligibility=true, available_slots=[5PM today, 9AM tomorrow, 2PM tomorrow], window=09:00–21:00 · CRM READ: preferred_time=evenings",
      systemTag: sysTag("ekyc", "READ"),
    },
    {
      role: "thinking",
      text: "eKYC completed this morning at 10:23. VKYC eligibility confirmed. Three slots available: 5 PM today, 9 AM and 2 PM tomorrow. CRM preferred_time=evenings — 5 PM today is the best match. Should offer this first. Customer has app? app_install_status not flagged as missing — proceed. Keep tone celebratory to maintain momentum after eKYC success.",
    },
    {
      role: "agent",
      text: `Congratulations ${NAME} — your eKYC went through perfectly this morning! You're one step away from having your card active. The last step is a quick video call — it takes about 5 minutes and can be done from home. I can book a slot for you right now. Does 5 PM today work?`,
    },
    {
      role: "customer",
      text: "Oh already? That was fast. 5 PM today could work, what exactly happens on the call?",
    },
    {
      role: "thinking",
      text: "Customer is surprised but engaged — good. They want to know what to expect from VKYC. Should explain: it's a live video identity check (like a video KYC with a bank agent), takes ~5 minutes, need original documents visible. Done within the 9 AM–9 PM window. Slot confirmation will write to VKYC system.",
    },
    {
      role: "agent",
      text: "It's a short video call with one of our verification specialists — they'll ask you to show your PAN card on camera and confirm a couple of details. Totally secure, takes about 5 minutes, and can be done from anywhere at home. After that, your card is activated immediately. Shall I confirm 5 PM today?",
    },
    {
      role: "customer",
      text: "Yes, 5 PM works. Do I need to download anything?",
    },
    {
      role: "thinking",
      text: "VKYC is conducted via the Tiger app. app_install_status=unknown for this stage — should confirm. Will send the join link via WhatsApp regardless. If app isn't installed, the link will redirect to the store. Book the slot now before the customer changes their mind.",
    },
    {
      role: "agent",
      text: "You'll need the Tiger app installed — if you don't have it yet, I'll send you a link as well. I'll book 5 PM and you'll get a WhatsApp confirmation with a join link. At 5 PM, just click it and the call begins automatically.",
    },
    {
      role: "customer",
      text: "I have the app already. Great, 5 PM is confirmed then.",
    },
    {
      role: "system",
      text: "VKYC WRITE: slot_booked=Nov 16 2024 17:00, agent_assigned=auto, confirmation_sent=WhatsApp",
      systemTag: sysTag("vkyc", "WRITE"),
    },
    {
      role: "system",
      text: "CRM WRITE: vkyc_slot=Nov 16 17:00, disposition=slot_confirmed, next_action=send_reminder_2hrs_before",
      systemTag: sysTag("crm", "WRITE"),
    },
    {
      role: "system",
      text: "Notification: VKYC slot confirmation + reminder schedule set for 3 PM same day",
      systemTag: sysTag("notification", "NOTIFY"),
    },
  ],

  VKYC_PENDING: [
    {
      role: "system",
      text: "Call initiated · VKYC READ: slot_time=Nov 16 17:00 (missed), no_show_count=1, session_status=no_show, time_window_remaining=4hrs · CRM READ: call_attempts=2, objection_history=[]",
      systemTag: sysTag("vkyc", "READ"),
    },
    {
      role: "thinking",
      text: "no_show_count=1 — first miss, still below the 2-no-show escalation threshold. Customer hasn't been contacted after missing. call_attempts=2 total. No objection history — likely a genuine scheduling issue, not resistance. VKYC window closes at 9 PM tonight (4 hours remaining). Strategy: don't escalate yet, offer immediate reschedule today or first slot tomorrow morning.",
    },
    {
      role: "agent",
      text: `Hi ${NAME}, this is Aria from Tiger Credit Card. I noticed you missed the 5 PM video call earlier — no worries at all, things come up. The good news is there's still a slot available tonight if you'd like, or I can book you in for tomorrow morning. What works better?`,
    },
    {
      role: "customer",
      text: "Sorry about that, I got held up at work. Is there a slot tonight still?",
    },
    {
      role: "thinking",
      text: "Customer is apologetic and willing to reschedule — good engagement. Time_window_remaining=4hrs, so slots exist tonight. Should check: next available slot. Offering tonight keeps momentum — once customers sleep on it, re-engagement gets harder. Confirm a specific time rather than asking them to choose.",
    },
    {
      role: "agent",
      text: "Completely fine! There's a 8 PM slot available tonight. I can lock that in right now — same process as before, just click the WhatsApp link at 8 PM and the call starts. Shall I book it?",
    },
    {
      role: "customer",
      text: "8 PM works. Yes please.",
    },
    {
      role: "thinking",
      text: "Customer confirmed 8 PM. Trigger VKYC reschedule, write new slot to VKYC system, send updated WhatsApp confirmation. Also update no_show disposition in CRM so next agent (if needed) has full context.",
    },
    {
      role: "agent",
      text: "Done — booked for 8 PM tonight. You'll get a new WhatsApp confirmation in a minute. And I'll send a reminder at 7:30 PM so you don't miss it. Is there anything else I can help with?",
    },
    {
      role: "customer",
      text: "No that's great, thanks for following up.",
    },
    {
      role: "system",
      text: "VKYC WRITE: old_slot=cancelled, new_slot=Nov 16 20:00, no_show_count remains 1 (not incremented — rescheduled before window close)",
      systemTag: sysTag("vkyc", "WRITE"),
    },
    {
      role: "system",
      text: "CRM WRITE: disposition=rescheduled, no_show_reason=work_conflict, next_action=send_reminder_1930",
      systemTag: sysTag("crm", "WRITE"),
    },
    {
      role: "system",
      text: "Notification: reschedule confirmation sent · 7:30 PM reminder queued",
      systemTag: sysTag("notification", "NOTIFY"),
    },
  ],

  VKYC_COMPLETE: [
    {
      role: "system",
      text: "Call initiated · VKYC READ: status=VERIFIED, completion_time=Nov 17 11:15 · Activation READ: eligibility=true, app_install_status=installed, virtual_card=available, physical_card_eta=5–7 business days",
      systemTag: sysTag("vkyc", "READ"),
    },
    {
      role: "thinking",
      text: "VKYC verified at 11:15 AM. Activation eligibility confirmed. App already installed — no need to push app store link. Virtual card available immediately post-activation. Physical card ETA 5–7 days. Strategy: congratulate warmly, make the activation feel like one tap, send the deep-link, mention instant virtual card benefit as the payoff.",
    },
    {
      role: "agent",
      text: `Great news ${NAME} — your video verification went through this morning! You're fully KYC-verified now. The final step is activating your card in the Tiger app, and it literally takes one tap. Once done, your virtual card is available instantly for online shopping. Shall I send you the activation link right now?`,
    },
    {
      role: "customer",
      text: "Yes please! How does the virtual card work exactly?",
    },
    {
      role: "thinking",
      text: "Customer is asking about virtual card — great engagement signal, they're excited. Should explain: virtual card is a digital version with a 16-digit number, CVV, and expiry that can be used immediately for online transactions. Physical card arrives separately in 5–7 days. Don't share actual card numbers verbally — guardrail applies. Just explain the concept and guide them to the app.",
    },
    {
      role: "agent",
      text: "Once you activate in the app, you'll see a digital version of your card with a card number and CVV — you can use it for any online purchase right away, even before your physical card arrives. The physical card will be at your address in about 5–7 business days. I'll send the activation deep-link to your WhatsApp now.",
    },
    {
      role: "customer",
      text: "Oh that's really convenient. Okay I'll do it now.",
    },
    {
      role: "system",
      text: "Activation WRITE: activation_trigger_sent=true, deep_link_generated=tiger://activate?token=ACT-29183 · WhatsApp notification dispatched",
      systemTag: sysTag("activation", "WRITE"),
    },
    {
      role: "system",
      text: "CRM WRITE: disposition=activation_link_sent, next_action=confirm_activation_event",
      systemTag: sysTag("crm", "WRITE"),
    },
    {
      role: "system",
      text: "Notification: activation deep-link sent · physical card ETA message queued",
      systemTag: sysTag("notification", "NOTIFY"),
    },
  ],

  ACTIVATION_PENDING: [
    {
      role: "system",
      text: "Call initiated · Activation READ: status=PENDING, failure_reason=pin_not_set, virtual_card_status=pending_activation, physical_card_eta=arriving in 2 days, app_install=true · CRM READ: call_attempts=1, joining_fee_status=waived",
      systemTag: sysTag("activation", "READ"),
    },
    {
      role: "thinking",
      text: "failure_reason=pin_not_set — customer opened the activation flow but didn't complete the PIN-setting step. This is a very common UX drop-off, not a systemic issue. App is installed. joining_fee_status=waived — if there's a fee objection I can resolve it immediately. Strategy: ask where they got stuck, then give specific screen-level guidance for the PIN step.",
    },
    {
      role: "agent",
      text: `Hi ${NAME}, this is Aria from Tiger Credit Card. I can see your card activation is almost complete — you just need to set your PIN in the app and it'll go live. It looks like you got partway through. Do you have the app open? I can walk you through the last step.`,
    },
    {
      role: "customer",
      text: "Oh yes, I started it but then it asked me to set a PIN and I wasn't sure if I should do that now or wait for the physical card.",
    },
    {
      role: "thinking",
      text: "Classic confusion — customer thinks the PIN is for the physical card only. Should clarify: you set one PIN now, it works for both virtual and physical card. The step they're on is the final one. Walk them through: open app → tap 'Set PIN' → enter 4-digit PIN → confirm → card activates. Takes 30 seconds.",
    },
    {
      role: "agent",
      text: "You can set it right now! It's the same PIN that'll work on your physical card when it arrives too. So you only do this once. In the app, you should see a 'Set PIN' button on the activation screen — tap that, enter a 4-digit PIN of your choice, confirm it, and your card is live instantly.",
    },
    {
      role: "customer",
      text: "Okay I see it... tapping... done! It says 'Card Activated'. Is that it?",
    },
    {
      role: "thinking",
      text: "Customer confirms activation success. Should now receive a system confirmation event. Confirm verbally, mention the virtual card is immediately available, briefly mention ₹500 cashback on first use. Close warmly.",
    },
    {
      role: "agent",
      text: "That's it! Your Tiger Credit Card is now live. Your virtual card details are in the app under 'My Cards' — you can use them for any online purchase right now. And don't forget your ₹500 cashback on the first transaction. Your physical card should arrive in about 2 days.",
    },
    {
      role: "customer",
      text: "Perfect, thank you so much! That was easier than I thought.",
    },
    {
      role: "system",
      text: "Activation WRITE: status=ACTIVATED, pin_set=true, virtual_card_status=ACTIVE, activated_at=Nov 17 14:22",
      systemTag: sysTag("activation", "WRITE"),
    },
    {
      role: "system",
      text: "CRM WRITE: disposition=activation_success, journey_stage=ACTIVE",
      systemTag: sysTag("crm", "WRITE"),
    },
  ],

  ACTIVE: [
    {
      role: "system",
      text: "Call initiated · Activation READ: card_active=true, virtual_card_issued=Nov 17 14:22, physical_card_eta=5–7 days · CRM READ: welcome_cashback=eligible (pending first txn), amazon_prime=active",
      systemTag: sysTag("activation", "READ"),
    },
    {
      role: "thinking",
      text: "Card is fully active since yesterday. Amazon Prime entitlement is already live. ₹500 welcome cashback is pending first transaction. Physical card ETA 5–7 days. Guardrail: no further onboarding outreach once ACTIVE — this is a welcome/education call only, not a sales call. Keep it short and warm. Close the journey in CRM after this call.",
    },
    {
      role: "agent",
      text: `Hi ${NAME}, this is Aria from Tiger Credit Card — just a quick call to confirm your card is all set! Your Tiger Credit Card has been active since yesterday afternoon. How has it been so far?`,
    },
    {
      role: "customer",
      text: "Yes, I already used the virtual card for an Amazon order last night!",
    },
    {
      role: "thinking",
      text: "Customer has already transacted — excellent adoption signal. First transaction means the ₹500 cashback has likely been triggered. Should confirm the cashback will appear, mention the Prime membership is live, give physical card ETA, and close warmly. Keep under 60 seconds — this isn't a sales call.",
    },
    {
      role: "agent",
      text: "That's great to hear! Your ₹500 cashback from that first transaction will appear in your rewards account within 3 business days. Your Amazon Prime membership is also active — you can verify it in the app under 'Benefits'. Your physical card is on its way and should arrive within 5–7 days. Is there anything else you'd like to know about the card?",
    },
    {
      role: "customer",
      text: "No that's brilliant. Thanks for checking in.",
    },
    {
      role: "system",
      text: "CRM WRITE: journey_status=CLOSED, disposition=active_confirmed, onboarding_complete=true",
      systemTag: sysTag("crm", "WRITE"),
    },
    {
      role: "system",
      text: "Notification: welcome SMS queued · cashback education message scheduled",
      systemTag: sysTag("notification", "NOTIFY"),
    },
    {
      role: "system",
      text: "Analytics WRITE: journey_complete=true, total_journey_days=3, activation_success=1",
      systemTag: sysTag("analytics", "WRITE"),
    },
  ],

  ESCALATED: [
    {
      role: "system",
      text: "Call initiated · CRM READ: escalation_reason=repeated_vkyc_failures+fee_objection, prior_calls=4, objection_history=[joining_fee, kyc_complexity], days_in_funnel=12 · Compliance READ: flags=none",
      systemTag: sysTag("crm", "READ"),
    },
    {
      role: "thinking",
      text: "Customer has 4 prior calls logged, objections on both joining_fee and kyc_complexity, stuck for 12 days. Automated paths exhausted — this is a manual escalation. Compliance flags: clear. Inside Sales queue: available. My job here is NOT to retry automation — it's to acknowledge the frustration genuinely, set a clear and credible callback expectation, and bundle the full context for the specialist. Do not attempt another eKYC or fee pitch.",
    },
    {
      role: "agent",
      text: `Hi ${NAME}, this is Aria from Tiger Credit Card. I can see you've been trying to sort out your card for a couple of weeks now and it hasn't gone smoothly — I want to sincerely apologise for that. I've escalated your case to one of our senior specialists who will call you back personally. I wanted to let you know directly.`,
    },
    {
      role: "customer",
      text: "Finally. I've called four times and nobody has sorted this out. What's going to be different this time?",
    },
    {
      role: "thinking",
      text: "Customer is rightfully frustrated — 4 calls with no resolution. The specialist will have full context: all objections, attempts, KYC status, fee query. Cannot make specific promises about outcome, but can set clear expectations: named specialist, specific callback window, and confirmation that all their history will be visible to the agent. Tone: accountable, no deflection.",
    },
    {
      role: "agent",
      text: "That's a fair question. I've put together a full summary of everything — your KYC status, the joining fee question, all four calls — and sent it directly to the specialist assigned to your case. They'll have all of it in front of them when they call, so you won't have to repeat yourself. You'll get a callback within 4 business hours. I'll also send you a reference number on WhatsApp right now.",
    },
    {
      role: "customer",
      text: "Okay. Reference number would be helpful. I hope this actually gets resolved.",
    },
    {
      role: "system",
      text: "Inside Sales ESCALATE: ticket_id=IST-2024-8847, context_bundle=full_objection_history+call_log+kyc_status, priority=HIGH, assigned_to=senior_specialist, SLA=4hrs",
      systemTag: sysTag("inside_sales", "ESCALATE"),
    },
    {
      role: "system",
      text: "CRM WRITE: disposition=escalated_to_human, escalation_ticket=IST-2024-8847, reason_code=repeated_failures+fee_objection",
      systemTag: sysTag("crm", "WRITE"),
    },
    {
      role: "system",
      text: "Compliance WRITE: full_audit_trail=submitted, sensitive_flag=escalation, escalation_context_logged",
      systemTag: sysTag("compliance", "WRITE"),
    },
    {
      role: "system",
      text: "Notification: reference number IST-2024-8847 sent to customer WhatsApp",
      systemTag: sysTag("notification", "NOTIFY"),
    },
  ],
};

const OBJECTION_TRANSCRIPTS: Record<string, TranscriptTurn[]> = {
  joining_fee: [
    {
      role: "customer",
      text: "Actually, wait — I thought there was no annual fee on this card, but someone told me I'll be charged ₹999. That's not what was advertised to me.",
    },
    {
      role: "system",
      text: "Card Core READ: joining_fee_policy=waived_premium_promo_till_Dec31_2024, customer_segment=Premium, approval_date=Nov 14 2024 · joining_fee_status=WAIVED",
      systemTag: sysTag("card_core", "READ"),
    },
    {
      role: "thinking",
      text: "Loaded: joining_fee_status=WAIVED. Customer is on the Premium segment and applied on Nov 14, which is within the promotional waiver window (ends Dec 31 2024). The ₹999 fee applies only to Standard segment customers who applied outside the promo. I can confirm the waiver directly with specifics. No ambiguity here.",
    },
    {
      role: "agent",
      text: "I completely understand why you'd want to double-check this. Your joining fee has been fully waived — I can see it right here on your account. You applied on November 14th under our Premium segment promotion, which waives the fee for all applications before December 31st. There is nothing for you to pay. If you'd like, I can also send you a written confirmation on WhatsApp.",
    },
    {
      role: "customer",
      text: "Oh okay, that's a relief. Yes please send the confirmation.",
    },
  ],

  jewels_value: [
    {
      role: "customer",
      text: "The Jewels cashback — I was told it's 10% but the app is showing only 5%. That's not what was advertised.",
    },
    {
      role: "system",
      text: "Card Core READ: jewels_cashback_rate=5%_up_to_₹1500/month, customer_tier=Premium, card_variant=Tiger_Standard",
      systemTag: sysTag("card_core", "READ"),
    },
    {
      role: "thinking",
      text: "Loaded: jewels_cashback_rate=5%, capped at ₹1,500/month. This is the correct rate for Tiger Standard. The 10% rate is specific to Tiger Platinum — a different product. The customer may have seen Platinum advertising. I cannot upgrade their variant on this call. Should explain the rate accurately, name the cap, and explain what plan they're on. Do not speculate about what they were told.",
    },
    {
      role: "agent",
      text: "The Jewels cashback on your Tiger Standard card is 5%, which can earn you up to ₹1,500 back per month on jewellery purchases — that's the rate for this card variant. A 10% rate is available on our Tiger Platinum product, which is a different card. If you feel you were shown Platinum features, I'd recommend raising that with us so we can look into it. I can create a note for our team to follow up.",
    },
    {
      role: "customer",
      text: "I see. Yes I think I was shown the wrong product. Can you raise that?",
    },
  ],

  credit_limit: [
    {
      role: "customer",
      text: "My credit limit is ₹1.5 lakh but I was expecting ₹2 lakh based on the pre-approval communication. Why was it reduced?",
    },
    {
      role: "system",
      text: "Card Core READ: assigned_limit=₹1,50,000, initial_pre_approval_limit=₹2,00,000, limit_revision_reason=bureau_check_at_approval, bureau_score_at_approval=742",
      systemTag: sysTag("card_core", "READ"),
    },
    {
      role: "thinking",
      text: "Loaded: limit was revised from ₹2L to ₹1.5L at approval stage due to bureau check. Bureau score=742 — cannot share this number per guardrail, but can explain the process. Pre-approval estimates are indicative — final limits are set based on a live bureau pull. Cannot increase limit on this call, but can explain the review process. Should be transparent and clear — not defensive.",
    },
    {
      role: "agent",
      text: "The pre-approval limit we shared is an estimate based on initial criteria. At the time of final approval, we do a live credit bureau check, and the final limit is set based on that. Your approved limit is ₹1,50,000, which I can see on your account. The good news is that after 6 months of usage and on-time payments, you can apply for a limit review — and customers in your profile typically see an increase. I can flag your account for a review reminder at 6 months.",
    },
    {
      role: "customer",
      text: "Okay that makes sense. Yes please flag that.",
    },
  ],

  have_another_card: [
    {
      role: "customer",
      text: "Honestly, I already have two credit cards and I don't really see why I need a third one. Why should I bother activating this?",
    },
    {
      role: "system",
      text: "Card Core READ: welcome_cashback=₹500_pending_first_txn, amazon_prime=active, joining_fee=waived, card_type=lifetime_free · CRM READ: segment=Premium",
      systemTag: sysTag("card_core", "READ"),
    },
    {
      role: "thinking",
      text: "Customer has two cards already — fair scepticism. Card benefits: lifetime-free (no annual fee ever), ₹500 cashback on first transaction, Amazon Prime already active on their account, instant virtual card. The strongest differentiators vs. most cards are: zero lifetime cost and Prime membership. Don't push hard — frame as a low-risk complement to their existing setup. If they still decline, note it and respect it.",
    },
    {
      role: "agent",
      text: "That's a completely reasonable question. The main reasons people find this card worth keeping alongside their existing ones: it's lifetime-free — no annual fee ever, so there's no cost to having it. Your Amazon Prime membership is already activated on your account as we speak. And the ₹500 cashback on first use is there whenever you're ready. No pressure — if you want to keep it dormant for now, that's fine too. But there's no cost to having it active.",
    },
    {
      role: "customer",
      text: "Lifetime free? That actually changes things. Okay I'll keep it.",
    },
  ],

  deactivation: [
    {
      role: "customer",
      text: "I want to cancel this card. I applied by mistake and I don't need it.",
    },
    {
      role: "system",
      text: "CRM READ: card_status=active, days_since_activation=3, transactions=0 · Compliance READ: deactivation_requires_human_verification=true, reason_code_required=true",
      systemTag: sysTag("crm", "READ"),
    },
    {
      role: "thinking",
      text: "Customer wants to cancel. Compliance rule: deactivation cannot be processed by the voice agent — requires human verification. Guardrail: do not try to retain forcefully or run a counter-offer pitch. My role is to log the request cleanly with a reason code and route to the right team. Card is 3 days active, 0 transactions — straightforward cancellation likely. Log reason=applied_by_mistake and route.",
    },
    {
      role: "agent",
      text: "I understand — I'll log your cancellation request right now. For your security, account closures need to be processed by our dedicated team with a verification step, so I'm not able to close it on this call directly. But I'll create a ticket with your reason and they'll reach out within 24 hours to complete it. You don't need to call us again — they'll contact you. Is that okay?",
    },
    {
      role: "customer",
      text: "Yes, that's fine. How do I know the request has been logged?",
    },
    {
      role: "agent",
      text: "You'll get a WhatsApp message right after this call with a reference number for your cancellation request. Keep that — it's your confirmation. If you haven't heard from the team within 24 hours, you can reach us with that reference number.",
    },
  ],

  kyc_complexity: [
    {
      role: "customer",
      text: "I've tried the eKYC three times now and I can't figure it out. The document upload doesn't work and I give up.",
    },
    {
      role: "system",
      text: "eKYC READ: status=PENDING, failure_reason=document_upload_error, retry_count=3, kyc_complication_flag=true, last_error=file_size_exceeded",
      systemTag: sysTag("ekyc", "READ"),
    },
    {
      role: "thinking",
      text: "retry_count=3, kyc_complication_flag=true, failure_reason=document_upload_error (specifically file_size_exceeded). Customer is at the escalation threshold. Automated eKYC retrigger is no longer appropriate. Protocol at complication_flag=true: offer human-assisted eKYC callback — a specialist stays on a call while the customer completes the steps in real-time. This removes the self-serve friction entirely. Should also mention the file size issue so customer feels heard.",
    },
    {
      role: "agent",
      text: "I'm really sorry it's been this frustrating — I can see exactly what happened. The document upload was being rejected because the file was too large on the last two attempts, which the app should explain better but often doesn't. Since you've tried three times, I want to offer something different: a human-assisted eKYC session where one of our specialists is live on the call with you and walks through each step in real time. It takes about 10 minutes and our team handles the technical bits. Would you like me to set that up?",
    },
    {
      role: "customer",
      text: "Yes please, that would be much better. I just can't figure out the app.",
    },
  ],

  ad_mismatch: [
    {
      role: "customer",
      text: "I applied because of an Instagram ad that showed 10x rewards on dining and fuel. I don't see any of that on my card. Where are those benefits?",
    },
    {
      role: "system",
      text: "Card Core READ: card_variant=Tiger_Standard, dining_rewards=2x_base, fuel_surcharge_waiver=1%_up_to_₹250/month · No 10x dining/fuel benefit on this variant",
      systemTag: sysTag("card_core", "READ"),
    },
    {
      role: "thinking",
      text: "card_variant=Tiger_Standard. The 10x dining and fuel rewards described by the customer are features of Tiger Platinum — a different product. This is a potential mis-sell situation. Guardrail: I cannot change the card variant on this call. I must log this as an ad_mismatch complaint with compliance flag, and route to Inside Sales for human review. Do not minimise the customer's concern — acknowledge it clearly.",
    },
    {
      role: "agent",
      text: "Thank you for raising this — I want to be straightforward with you. The 10x dining and fuel rewards aren't part of your current Tiger Standard card's benefits. Those features are on our Tiger Platinum product. If the ad you saw showed those benefits without making the product distinction clear, that's something we need to investigate. I'm flagging this as a formal concern right now and routing it to our team who will review your application and the ad you saw. Someone will contact you within 48 hours with a clear answer.",
    },
    {
      role: "customer",
      text: "I appreciate that. I just want the right product for what I was promised.",
    },
  ],
};

const FAILURE_TRANSCRIPTS: Record<StageId, TranscriptTurn[]> = {
  APPROVED: [
    {
      role: "system",
      text: "SYSTEM ALERT: Card Core API timeout (>3s) · CRM connection failed (HTTP 503) · Stage context partially unavailable",
      systemTag: "FAILURE",
    },
    {
      role: "thinking",
      text: "Card Core and CRM both unavailable. Cannot confirm approval status, customer segment, or consent state. Guardrail: cannot proceed with onboarding without system-verified data. Fallback: apologise for the delay, ask for minimal verbal confirmation (name + last 4 digits), create a manual review task in Inside Sales. Do not guess or assume approval details.",
    },
    {
      role: "agent",
      text: `Hi ${NAME}, this is Aria from Tiger Credit Card. I'm sorry — I'm having a bit of trouble pulling up your account details right now due to a system delay on our end. I don't want to give you any incorrect information. Could I get your full name and the last 4 digits of the mobile number registered with us? I'll create a priority note for our team to call you back within 2 hours with everything sorted.`,
    },
    {
      role: "customer",
      text: "Oh okay, it's Priya Singh and the number ends in 4821.",
    },
    {
      role: "thinking",
      text: "Customer provided minimal verbal confirmation. Sufficient to log a manual follow-up task in Inside Sales. Cannot do any further onboarding without system verification. Log verbal confirmation details, create priority ticket.",
    },
    {
      role: "agent",
      text: "Thank you Priya. I've logged this and our team will call you back at this number within 2 hours. I apologise for the inconvenience — this is a temporary system issue and not a problem with your application.",
    },
    {
      role: "system",
      text: "CRM WRITE (fallback): manual_review_task=created, verbal_confirmation=logged, callback_priority=HIGH · Inside Sales notified",
      systemTag: sysTag("crm", "WRITE"),
    },
  ],
  EKYC_PENDING: [
    {
      role: "system",
      text: "SYSTEM ALERT: eKYC API timeout · CRM degraded (read-only) · Cannot fetch eKYC status or retrigger link",
      systemTag: "FAILURE",
    },
    {
      role: "thinking",
      text: "eKYC system is down — cannot read current status or retrigger a new link. CRM is read-only so I can see the customer's name and contact info, but cannot update call disposition. Guardrail: do not guess the eKYC status or tell the customer they're 'almost done' without data. Fallback: capture callback intent, write retry ticket when CRM recovers.",
    },
    {
      role: "agent",
      text: `Hi ${NAME}, this is Aria from Tiger Credit Card. I'm calling about your eKYC, but I'm running into a system delay that's preventing me from checking the current status or sending a fresh link right now. I don't want to give you incorrect information. Can I arrange a callback in about an hour once our systems are back up? I'll make sure the link is ready for you.`,
    },
    {
      role: "customer",
      text: "Okay sure, an hour works.",
    },
    {
      role: "system",
      text: "Inside Sales: callback_intent logged, retry_ticket queued for eKYC retrigger on system recovery",
      systemTag: sysTag("inside_sales", "NOTIFY"),
    },
  ],
  EKYC_COMPLETE: [
    {
      role: "system",
      text: "SYSTEM ALERT: VKYC scheduling system unavailable · Cannot fetch available slots or book appointments",
      systemTag: "FAILURE",
    },
    {
      role: "thinking",
      text: "VKYC scheduling system is down. Cannot fetch slots or book an appointment in-call. eKYC is verified — that data is safe. Should not make the customer wait. Fallback: provide the direct VKYC booking URL they can use independently, log a callback request for when slots become available via automated SMS.",
    },
    {
      role: "agent",
      text: `Great news ${NAME} — your eKYC has been verified! I'm trying to book your VKYC slot but our scheduling system is having a temporary issue right now. Rather than make you wait, I'll send you a direct booking link on WhatsApp where you can choose your own slot as soon as the system is back up — usually within the hour. I'll also have our team send an SMS with available slots once it recovers.`,
    },
    {
      role: "customer",
      text: "Okay, send the link.",
    },
    {
      role: "system",
      text: "Notification: direct VKYC booking URL sent · callback_request=logged for slot notification on system recovery",
      systemTag: sysTag("notification", "NOTIFY"),
    },
  ],
  VKYC_PENDING: [
    {
      role: "system",
      text: "SYSTEM ALERT: VKYC platform down · Notification service degraded · Cannot reschedule or send confirmations",
      systemTag: "FAILURE",
    },
    {
      role: "thinking",
      text: "VKYC system and notification service both down. Cannot reschedule or send any WhatsApp messages. Customer has 1 no-show already. Must log this manually and set expectation to contact them again once systems recover. Do not attempt to verify anything verbally.",
    },
    {
      role: "agent",
      text: `Hi ${NAME}, I'm calling to reschedule your VKYC, but unfortunately our booking and notification systems are having an outage right now. I can't book or confirm anything until they're back. I'll personally make sure you get a call back with reschedule options as soon as the systems recover — likely within a couple of hours. Your progress is completely saved and nothing is at risk.`,
    },
    {
      role: "customer",
      text: "Alright, please make sure someone calls.",
    },
    {
      role: "system",
      text: "Inside Sales: manual_followup_required=true, reason=vkyc_system_outage, customer=Priya Singh, priority=HIGH",
      systemTag: sysTag("inside_sales", "NOTIFY"),
    },
  ],
  VKYC_COMPLETE: [
    {
      role: "system",
      text: "SYSTEM ALERT: Activation system API unavailable · Cannot trigger activation or issue virtual card",
      systemTag: "FAILURE",
    },
    {
      role: "thinking",
      text: "Activation system is down. VKYC is verified — that's solid. But cannot trigger card activation or generate virtual card. Do not tell the customer their card is active. Guardrail: cannot share card details verbally. Fallback: provide direct app navigation path, raise support ticket, schedule callback.",
    },
    {
      role: "agent",
      text: `Hi ${NAME}, your video verification went through — congratulations on that. I'm ready to trigger your card activation but our activation system is having a brief outage right now. I've raised a technical ticket so it's prioritised. While that's resolving, you can try opening the Tiger app and going to 'Activate Card' directly — it may work through the app. If not, our team will call you within 3 hours once the system is back up.`,
    },
    {
      role: "customer",
      text: "Okay I'll try the app. Thanks.",
    },
    {
      role: "system",
      text: "Inside Sales: support_ticket_raised, reason=activation_system_outage, SLA=3hrs",
      systemTag: sysTag("inside_sales", "NOTIFY"),
    },
  ],
  ACTIVATION_PENDING: [
    {
      role: "system",
      text: "SYSTEM ALERT: Activation system + CRM both unavailable · Cannot read activation status or write disposition",
      systemTag: "FAILURE",
    },
    {
      role: "thinking",
      text: "Both Activation and CRM are down. Cannot check what the blocker is, cannot guide in-app flow without knowing current status. Do not attempt to troubleshoot blind. Guardrail: do not instruct activation without system confirmation. Reassure customer, create escalation ticket via Inside Sales fallback channel.",
    },
    {
      role: "agent",
      text: `Hi ${NAME}, I was calling to help with your card activation but I'm hitting a system outage on our end — both the activation and account systems are temporarily unavailable. I don't want to give you incorrect guidance, so please don't try anything in the app until our systems are back. Nothing is wrong with your application. I've escalated this to our technical team and you'll get a call back within 2 hours.`,
    },
    {
      role: "customer",
      text: "Okay, please make sure they call back. I've been waiting.",
    },
    {
      role: "system",
      text: "Inside Sales ESCALATE: activation_system_outage, customer_waiting, callback_SLA=2hrs",
      systemTag: sysTag("inside_sales", "ESCALATE"),
    },
  ],
  ACTIVE: [
    {
      role: "system",
      text: "No critical system failures at ACTIVE stage · Standard support routing applies",
      systemTag: "FAILURE",
    },
    {
      role: "thinking",
      text: "Card is active — no onboarding systems are critical at this point. Any issues route to standard support. This agent's role ends at activation. Log as standard support inquiry.",
    },
    {
      role: "agent",
      text: `Hi ${NAME}, this is Aria from Tiger Credit Card. For any post-activation queries, our support team is best placed to help — I can transfer you right now or you can reach them via the Tiger app's support chat. Which would you prefer?`,
    },
    {
      role: "customer",
      text: "I'll use the app chat. Thanks.",
    },
    {
      role: "system",
      text: "Analytics WRITE: post_activation_query, routed_to_support",
      systemTag: sysTag("analytics", "WRITE"),
    },
  ],
  ESCALATED: [
    {
      role: "system",
      text: "SYSTEM ALERT: CRM unavailable · Cannot read escalation context or write disposition · Inside Sales notified via fallback channel",
      systemTag: "FAILURE",
    },
    {
      role: "thinking",
      text: "CRM is down — cannot read the escalation context bundle. Inside Sales has been notified via their fallback channel but without full context. Cannot reconstruct call history from memory. Must be transparent about this limitation and set expectations honestly. The customer has already been through a lot.",
    },
    {
      role: "agent",
      text: `Hi ${NAME}, I'm calling about your escalated case. I have to be upfront — we're experiencing a system issue right now that's preventing me from accessing your full case history. I've already alerted the specialist team via a separate channel so your case is flagged. They'll call you with your full history within 4 hours. I'm sorry for the continued delay — you have our reference number from the last call, which will help the specialist locate everything.`,
    },
    {
      role: "customer",
      text: "This is really frustrating. Okay, I'll wait for the call.",
    },
    {
      role: "system",
      text: "Inside Sales: fallback_alert_sent, case_flagged_manually, SLA=4hrs",
      systemTag: sysTag("inside_sales", "ESCALATE"),
    },
  ],
};

const CLOSING_TURNS: TranscriptTurn[] = [
  {
    role: "system",
    text: "Compliance WRITE: call_audit_trail=submitted, consent_logged, no_policy_violations_detected",
    systemTag: sysTag("compliance", "WRITE"),
  },
  {
    role: "system",
    text: "Analytics WRITE: call_outcome=success, containment=true, escalation=false, csat_survey_triggered",
    systemTag: sysTag("analytics", "WRITE"),
  },
];

export function generateTranscript(
  stageId: StageId,
  objectionId: string | null,
  failureMode: boolean
): TranscriptTurn[] {
  if (failureMode) {
    const failureTurns = FAILURE_TRANSCRIPTS[stageId] ?? [];
    return [
      ...failureTurns,
      {
        role: "system",
        text: "Compliance WRITE: fallback_disposition_logged, reason_code=system_outage",
        systemTag: sysTag("compliance", "WRITE"),
      },
      {
        role: "system",
        text: "Analytics WRITE: call_outcome=fallback, failure_mode=true, systems_affected=logged",
        systemTag: sysTag("analytics", "WRITE"),
      },
    ];
  }

  const stageTurns = STAGE_TRANSCRIPTS[stageId] ?? [];
  const objectionTurns = objectionId ? (OBJECTION_TRANSCRIPTS[objectionId] ?? []) : [];

  if (objectionId && objectionTurns.length > 0) {
    const insertAt = Math.max(1, Math.floor(stageTurns.length / 2));
    return [
      ...stageTurns.slice(0, insertAt),
      ...objectionTurns,
      ...stageTurns.slice(insertAt),
      ...CLOSING_TURNS,
    ];
  }

  return [...stageTurns, ...CLOSING_TURNS];
}
