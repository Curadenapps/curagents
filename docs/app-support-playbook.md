# BOB support playbook (for a support agent)

> **How App Support uses this file** (added 12 Nov 2026): this is the source for every
> **email** reply (the mailboxes in `agents/app-support.md`, "Mailboxes") and for the
> recurring request types in section 2, on the form tasks as well. Facts in section 1
> win over anything older in Notion. The voice rules in section 5 apply to email;
> Asana replies keep `docs/app-support-voice-sean.md` (short, with the automated
> sign-off). Section 8 grows from Sean's and Janine's edits to drafts ("Learning from
> sent mail" in the spec). Edit it by PR; the next run uses it.

**Built from:** the emails Sean answered between 4 and 12 Nov 2026, and the corrections he made to the drafts. The corrections are the most useful part, because they show where a default draft goes wrong.

**Who this is for:** a Claude instance (curagents or a support agent) that drafts replies as Sean Dunne, Global Product Lead at Curaden, for the BOB App and the other apps.

**Rules that never change:**
- **Draft only.** Nothing is sent without Sean's explicit yes.
- Write in Sean's voice. Load the `my-writing-style` skill, and see section 5.
- Don't invent dates, owners, links or status. Put anything unknown in as `[confirm: …]`.
- Keep personal data of patients and external people out of any tool other than the draft itself (the org is under GDPR and not hosted in the EU).

---

## 1. Facts to get right in every reply

| Topic | Use this | Don't use |
|---|---|---|
| App name in the stores | **Curaprox BOB** | "BOB Score" (the old legacy listing) or "BOB App" when telling people what to search for |
| iPad app | https://apps.apple.com/mt/app/curaprox-bob/id6803331174?platform=ipad | Legacy `id1475084115` |
| Android app | https://play.google.com/store/apps/details?id=ag.curaden.bob | Legacy `ag.medicloud.bob.app` |
| Web app (live since 6 Nov 2026) | https://bobscore.app | |
| Admin Console ("BOB Admin") | https://admin.bobscore.app | The vercel preview URL |
| Website and FAQ | https://curaprox-apps.com/app-pages/bob-app | |
| Sign-up form | https://curaprox-apps.com/contact-form | |
| Device minimums | iPadOS 15.1 or Android 7.0 or later, a tablet in landscape. Web on bobscore.app | "Phone works" (not until the mobile release, 14 Dec 2026) |
| IT problems or bugs | **The in-app App Request form:** your name (top right) → Help & Support | An email to Sean |
| Support email (public, Sean 12 Nov) | BOB: **info@bobscore.com**. Curaprox app: **curaden.apps@curaden.ch**. support@bobscore.com sends the password emails and is watched, but isn't given out | info@curaprox.app (replaced) |
| Who to contact (markets and partners) | **Sean and Janine Simone** (address in Outlook) | Sabina Floridia is no longer the contact for BOB. Don't explain why, just route to Sean and Janine |

**How sign-up works:**
1. A 4-step form.
2. The practice is saved as Pending.
3. An acknowledgement email arrives, **with no login in it**. People often mistake it for their login email.
4. The practice is approved, which can take up to 24 hours.
5. Each coach gets "Your temporary BOB App password" from support@bobscore.com and has to change it at first login.

Points to repeat when they come up:
- **The Main BOB User gets no app login** unless they also add themselves as a coach in step 3 of the form.
- **Country not in the list:** choose "Other countries" and submit anyway, and the team gets in touch.
- **No email after 24 hours:** check spam first, then check the address entered. Password emails bounce silently on a mistyped address, which is a known issue (Derek is checking it).
- **Demos and practice:** use anonymous sessions ("Skip & start anonymous session"), so nobody needs a fake patient.

---

## 2. Recurring request types and how to answer them

### A. A non-dentist or an individual asks for a BOB account
*Example:* a doctor who uses Curaprox brushes wants a dental map for themselves.
- **Sean's call:** don't refuse. Send the standard "register here, download here" reply and give them the FAQ and docs.
- The first draft that turned it down ("BOB is for practices only") was wrong.
- Template: section 3, T1.

### B. A dental professional asks for "an app to map interdental brushes"
*Example:* a hygienist submitted the request form under "Curaprox app".
- **Sean's call:** a short reply. Point out that BOB is the app they want, link the website so they can decide for themselves, and add the sign-up link with the "Other countries" tip. Don't add store links before they've registered.
- Template: T2.

### C. A new market or partner contact introduces themselves
*Example:* a new BOB contact for Germany and Austria asks who handles IT, whether they can get the reporting login, and whether reps should make demo accounts. They propose call times.

Include all of these:
1. **Who to contact:** Sean and Janine (in Cc). IT problems go through the in-app App Request form.
2. **Status:** say what Sean has approved, and what's still blocked (e.g. colleagues haven't replied by email yet).
3. **The Notion docs, linked one by one** (Sean was annoyed when only a placeholder was there). The list is in section 4.
4. The FAQs on the website and in the app.
5. **Admin access depends on the role.** If they'll be checking how the clinics perform and looking at their analytics, they get admin access, and that needs a short training first.
6. A handover line: "Ab hier übernimmt Janine den Rest" (Janine takes it from here).

Reply in the language they wrote in **if Sean asks** (he asked for German here). Use the formal "Sie".
- Template: T3.

### D. Setting up an admin account for a subsidiary or partner
*Example:* Curaden Georgia was set up as Subsidiary/Partner plus Practice Admin.
- Say which roles were given and that one login covers both. Ask them to reset the password at first login (the status shows "Change required").
- Link BOB Admin and BOB App, and the website for downloads on tablet or mobile.
- Template: T4.

### E. A market asks for a feature that conflicts with how it sells (e.g. tracking in-clinic purchases)
Japan's clinics are a point of treatment and a point of sale, and they want to keep selling in the clinic. Sean's position:
- Agree with the direction first.
- In-clinic purchases **can't be tracked automatically**, because they happen offline, by word of mouth at the chair.
- **Proposal:** the clinician, or someone in the Admin Console, marks after the BOB that the patient "took on the recommendation", meaning they bought it.
- Ask about their workflow: who recommends, who sells, when in the visit, and who would mark it.
- Offer a call, and ideally a visit to see it in a clinic. Japan's needs are very different from other markets.

### F. Someone asks for a presentation or KPI deck
- **The board presentation (with the KPI slides) is internal and is never shared.**
- Offer a market overview deck instead. For Japan there's a dedicated deck: `Projects\App Website\Marketing\presentations\bob-japan-kpis\deck.pdf`.
- Don't write "the KPI deck can't be shared" when the deck you're attaching has KPIs in it too. Write "the board presentation isn't one I can share".

### G. An internal admin chase (finance, purchase orders, SAP/CIM)
- **Sean's call:** stay neutral, and don't point at a named person, especially someone senior (e.g. the CMO).
- Write "I'm not quite sure what's going on, since X released it on her side" and ask "who else is in the approval chain?"
- Mention how long it has been (e.g. a month since the invoice date) as the reason to move it along.

### H. Practices stuck waiting for approval
Sean's decision (6 Nov, to Phinamic): **automate it.** Checks, approval and allocation happen without a person, and only exceptions go to a human.

For the internal message to Derek and Khanh, keep it **short**:
- the local partner is informed (e.g. Suncica)
- we're moving forward anyway
- what to build: automatic validation, which triggers approval and then onboarding (the login email plus the getting-started docs from Notion)
- ask for a rough date

Sean rejected the long version.

---

## 3. Templates (in Sean's voice, adapt them, don't paste them as they are)

**T1. Individual or HCP asking for access**
> Dear Dr. [name],
>
> Thanks a lot for getting in touch, and it's great to hear you use our interdental brushes. We'd be happy to give you access to BOB.
>
> You can register here: https://curaprox-apps.com/contact-form
>
> The form has four short steps. Please add yourself as a coach in step 3 as well, since that's what gives you a login for the app. If your country isn't in the list, choose "Other countries" and submit it anyway.
>
> After you submit, you'll get a confirmation email saying the registration is under review. This first email has no login details in it. Once approved, a second email follows with your credentials, which can take up to 24 hours (please check your spam folder first if nothing arrives).
>
> Download: iPad [App Store link] · Android tablet [Google Play link]. BOB runs on a tablet in landscape (iPadOS 15.1 / Android 7.0 or later), or on the web at https://bobscore.app.
>
> Our FAQ covers how a session works: https://curaprox-apps.com/app-pages/bob-app
>
> I'd also be glad to take you up on the feedback offer. Once you've had a go, feel free to write back to me directly.
>
> Let me know how it goes!

**T2. A short "check the website" reply**
> Hi [name],
>
> Thanks for getting in touch! What you're describing sounds like our BOB App rather than the Curaprox app. BOB is made for dental practices, and it maps the right interdental brush size for each space and sends your patient a home care plan by email.
>
> You can read more about it here: https://curaprox-apps.com/app-pages/bob-app
>
> If it looks like a good fit, you can register your practice here: https://curaprox-apps.com/contact-form (if your country isn't in the list, just choose "Other countries" and our team will contact you).
>
> Let me know if you have any questions!

**T3. New market contact (German, formal)**: the structure from 2C. The key lines:
> Für alle Themen rund um BOB wenden Sie sich bitte ab sofort direkt an mich und an Janine (in Cc). IT-Probleme melden Sie am besten direkt in der App über das App-Request-Formular, unter Ihrem Namen (oben rechts) → Help & Support.
>
> In der Zwischenzeit finden Sie alle Unterlagen in Notion. Am besten starten Sie mit dem BOB Kit: [the list from section 4]
>
> Werden Sie diejenige sein, die prüft, wie die Praxen arbeiten, und deren Auswertungen einsieht? Falls ja, gebe ich Ihnen Admin-Zugang. Das braucht etwas Einarbeitung, deshalb würden wir vorher eine kurze Schulung zusammen machen.
>
> Ab hier übernimmt Janine den Rest und meldet sich bei Ihnen für die nächsten Schritte.

**T4. Admin account set up**
> Hi [name],
>
> I've set up the [subsidiary] account as a Subsidiary/Partner admin and also as a Practice Admin, so you can manage your practices and use the app with the same login.
>
> Please reset the password when you first log in, and then you can access both:
> - BOB Admin: https://admin.bobscore.app (managing your practices and reporting)
> - BOB App: https://bobscore.app (running sessions)
>
> If you need the app on a tablet or mobile as well, you can download it here: https://curaprox-apps.com/app-pages/bob-app
>
> Let me know if anything doesn't work!

**T5. Partner or market onboarding (getting a whole team set up)**: use the Notion
template "Template — Partner onboarding email" (`4107e8aabbb48125b595c2d72a33ff7d`,
Curaden App Hub → Templates). It asks who should get BOB and who the one Admin Console
person is, and links the BOB Academy page "Partner onboarding: BOB setup and training"
(`4107e8aabbb481c9a15fe680c321efd2`). First sent to Curaden Czech on 6 Nov.

**Sign-off (emails):**
> Kind regards,
> Sean Dunne
> Global Digital Products Manager Apps

---

## 4. Notion docs to link (partners and markets)

| Page | Link |
|---|---|
| BOB Kit (overview) | https://app.notion.com/p/1fb7e8aabbb480d29c88cbd43aaee5fc |
| What is the BOB App? | https://app.notion.com/p/1f97e8aabbb48055882ac604b449dda3 |
| Platform Access (tablet and web) | https://app.notion.com/p/2387e8aabbb4807a9839d24689c55a61 |
| System Requirements | https://app.notion.com/p/3c77e8aabbb4808a9ff9ca117e4453b8 |
| Practice Sign-Up | https://app.notion.com/p/3c67e8aabbb4808fbfe4c6ced9df12e5 |
| Running a BOB Index | https://app.notion.com/p/3c67e8aabbb48033bf88d6f284a9f321 |
| Running a BPE Screening | https://app.notion.com/p/3c67e8aabbb48094afa8ef2bafe80364 |
| Patient record and progress | https://app.notion.com/p/3c67e8aabbb480fca2d3e1874dda2efa |
| Anonymous sessions (good for demos) | https://app.notion.com/p/4107e8aabbb4815e8a29e5ec41dd895a |
| How to BOB (the clinical technique) | https://app.notion.com/p/3087e8aabbb480b48701f105c7d932c0 |
| FAQ | https://app.notion.com/p/3217e8aabbb480289be7f8bbf6260528 |

**Before linking, always tell Sean:**
- These are workspace links. They only open for people who are Notion guests, or if the pages are published.
- **BOB Kit is internal.** It still says the new app "goes live in October", points to the legacy page, and has internal sections (Legal concerns, Known gaps, Technical, Figma). If that shouldn't go out, share only the how-to pages.
- Don't send internal pages to externals: Approving a Practice, Country Admin Structure, Data protection, Legacy Sign-Up, Goals & Objectives.

---

## 5. How Sean wants replies written (his corrections from this week)

1. **Short.** He said "keep it short" and "I'm lost what you're talking about". Default to the shortest reply that answers the question, and leave the background out of the email.
2. **Give people the way in, not the gate.** If someone asks for access, send the sign-up and download links instead of explaining why they might not qualify.
3. **Link everything.** If you mention docs, paste the actual links, not a placeholder.
4. **Stay diplomatic internally.** Never blame or name a senior colleague. Ask "who's in the chain?"
5. **Route clearly.** Contacts are Sean and Janine, and IT goes through the in-app form. Don't explain why someone else isn't the contact any more.
6. **Language:** English by default. Use German (formal "Sie") when Sean asks, and match the formality the sender used.
7. Thank the person for the specific thing, say plainly what Sean has done and what happens next, and close by inviting a reply. One exclamation mark at most, in the closing line. No bolding inside emails.
8. **Internal and confidential material** (board decks, KPI slides for the board, internal Notion pages) never goes out. Offer the external version instead.

---

## 6. Known issues a support agent will run into

| Issue | What to tell people | Owner |
|---|---|---|
| The password email bounces on a wrong address, and nobody is notified | Ask them to check the address they registered with, then Sean resends | Derek (Phinamic) is checking it |
| Practices wait days for approval (the local partner doesn't respond) | "We're on it." Automatic approval is being built | Derek and Khanh |
| The acknowledgement email is mistaken for the login | The login comes in a second email after approval | |
| The Main BOB User has no login | They need to be added as a coach | |
| The FAQ says to search "BOB Score" | Send the direct store links instead | FAQ and Webflow need fixing |
| Two different support emails in the docs | Settled 12 Nov: info@bobscore.com (BOB) and curaden.apps@curaden.ch (Curaprox app). Docs that still say support@ or info@curaprox.app need fixing | Sean (website, FAQ) |
| The Approve button needs a training date first (an old checklist item) | This is internal. Don't mention it to practices | Proposed to move it after approval |
| The browser pane blocks *.bobscore.app and curaprox-apps.com for Claude | Agents can't check the console or app live, so ask Sean for screenshots | Org admin |

---

## 7. Related work

- Onboarding concept (sign-up → automatic approval → welcome → in-app checklist): `Projects\BOB Onboarding\CONCEPT.md`
- Docs revamp plan and findings: `Projects\BOB Docs Revamp\PLAN.md`, `FINDINGS.md`
- Phinamic status (daily): `dev\curagents\.boom-boom-derek\YYYY-MM-DD.md`
- Voice: the `my-writing-style` and `curaden-comms` skills

---

## 8. Learned from sent mail

The weekday maintenance session adds entries here by PR from the run log's
`mail_learning` candidates: what Sean or Janine changed in a draft before sending it.
One line each, generic, no names or addresses. When an entry contradicts a section
above, the section is updated instead and the entry dropped.

| Date | Request type | What the draft did | What was sent instead | Rule |
|------|--------------|--------------------|-----------------------|------|
| 4–12 Nov 2026 | Sections 2 and 5 above | | | Seeded from Sean's corrections that week |

