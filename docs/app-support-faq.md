# App Support: learned FAQ

What App Support has learned from the replies Sean and Fabian actually sent, for
questions the product FAQs don't answer. The rules are in
[`agents/app-support.md`](../agents/app-support.md), "FAQ: answering and getting
smarter".

**Check these first. They are the source of truth, and this file never repeats them:**

| FAQ (Notion) | Covers | Public version |
|--------------|--------|----------------|
| BOB — FAQ `3217e8aabbb480289be7f8bbf6260528` | Sign-up, devices, sessions, patients, users, settings, support routes | https://curaprox-apps.com/app-pages/bob-app (can lag behind Notion) |
| Curaprox — FAQ `2e77e8aabbb4809699f8ca3225f4a310` | Curaprox app (patient app) | curaprox-apps.com app page |
| IDB & BOB FAQs `2e77e8aabbb480ea8059c06f022526f8` | Interdental brushes and BOB | |
| Curaden — FAQ `2e77e8aabbb48099b047df4e620a272b` | Curaden general | |

How-To pages for each are indexed in BOB Kit `1fb7e8aabbb480d29c88cbd43aaee5fc`.

## How entries get here

- **From runs:** when Sean or Fabian answer a held request or correct an automated
  reply, the run writes an anonymised FAQ candidate into its Agent run log row. The
  weekday maintenance session adds them here by PR. App Support never learns from
  its own replies.
- **From Sean or Fabian:** "add that to the support faq" after a reply, or "teach
  support: {question} → {answer}", in a session. Their words count as approved.
- **Never:** names, emails, practice names, addresses, phone numbers or patient
  details. `{first name}` stands in for the person. Sources are Asana task links.
- **Leaves** when a product FAQ starts covering it or a fix makes it wrong. Anything
  every user should know goes to Sean for the public FAQ instead.

## Entry format

```
### {The question in plain, generic words}
- App: BOB | BOB Admin | Curaprox app | iTOP | Admin Panel | HubSpot | Vouchers | General
- Type: practice-details | account-details | login | password | access | how-to | other
- Owner: Sean | Fabian
- Ask for: {only what's needed, or "nothing"}
- Owner action: {the change the owner makes, or "none"}
- Also asked as: {other wordings or languages}
- Source: {Asana task links} · Added: {date} · Last used: {date}

{The answer, as the owner wrote it, with {first name} for the person.}
```

## Entries

### How can I change my practice's address or details?
- App: BOB, BOB Admin
- Type: practice-details
- Owner: Sean
- Ask for: the new details in full (street and number, postcode, city, country)
- Owner action: BOB Admin → Practices → {practice} → change the field
- Also asked as: "Business Address", "update practice info", "wrong address"
- Source: https://app.asana.com/0/1200298616652229/1220394967220814 (the spec's worked example; seed entry, replace with Sean's posted wording once it's sent) · Added: 10 Nov 2026

At the moment your account can't edit the practice details, so I'll update them for
you. Could you reply here with the new practice address (street and number, postcode,
city and country)? Let me know and I'll change it in BOB for you.

Note: the BOB FAQ says practice details are edited with a BOB Admin account
("ask for a BOB Admin account via Help & Support"). Legacy Coaches can't get one
today (product gap, proposed as a dev ticket), so Sean makes the change. When that
gap is fixed, replace this answer with the BOB FAQ's.
