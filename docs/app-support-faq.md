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
("ask for a BOB Admin account via Help & Support"). Phinamic (Derek La on BA-325,
10 Nov 2026) says Practice Admins can't open BOB Admin, so don't offer a practice BOB
Admin access or "Practice Admin rights to change it yourself". Sean makes the change
in BOB Admin. On BA-325 Sean left the user as a Coach ("the permissions are the
same"). The FAQ line is listed for Sean to correct.

### How can I change my practice's name and keep my email address?
- App: BOB, BOB Admin
- Type: practice-details
- Owner: Sean
- Ask for: the new practice name exactly as it should appear
- Owner action: BOB Admin → Practices → {practice} → Name: replace with the new name
- Also asked as: "Practice name change", "I opened my own practice", "new practice"
- Source: https://app.asana.com/0/1200298616652229/1220494681856181, https://app.asana.com/0/1200298616652229/1220394967220814 (BA-325) · Added: 13 Nov 2026

Your email stays the same, nothing changes there. Could you reply here with the new
practice name, exactly as it should appear in BOB? I'll change it for you.

Note: if they've moved to a different practice that's already on BOB (rather than
renaming theirs), coaches linked to more than one practice switch by tapping the
practice name at the top of the app (BOB FAQ). Ask which it is when the request is
unclear. Whether a practice can get BOB Admin access to do this themselves is
`[confirm: Sean]` (see the entry above).

### How do I activate or register for the BOB app? I never got a login.
- App: BOB
- Type: login
- Owner: Sean
- Ask for: whether they've filled in the sign-up form, and with which email address
- Owner action: check BOB Admin → Practices → Pending for the practice; approve, or
  ask Phinamic to check the request if nothing is there
- Also asked as: "activate my app", "Gostaria de ativar a minha aplicação", "no
  confirmation email", "user activation", "wo kann man sich registrieren" (BOB)
- Source: https://app.asana.com/0/1200298616652229/1212815355013182 (CA20-3403),
  BOB — FAQ "How do I sign up" and "I signed up but haven't received any emails" · Added: 13 Nov 2026

There's no separate activation step: the practice signs up once on the form
(https://curaprox-apps.com/contact-form). Once it's approved, which takes up to 24
hours, each coach gets their own login by email from support@bobscore.com. The first
email you get is only an acknowledgement, with no login in it. If nothing has arrived,
please check your spam folder first. If you've already signed up, reply here with the
email address you used and I'll check it for you.

Note: on CA20-3403 (Jan 2026) Phinamic found "no actual request was made": the form
hadn't really been submitted. So the first question is always whether they finished
the form, and with which address. A Main BOB User gets no app login unless they also
added themselves as a coach (playbook §1).

### Where do I register for the Curaprox app?
- App: Curaprox app
- Type: how-to
- Owner: Fabian
- Ask for: nothing, unless it isn't clear whether they mean the Curaprox app or BOB
- Owner action: none
- Also asked as: "Wo kann man sich registrieren", "sign up", "create an account"
- Source: Curaprox — FAQ "Do I need to create an account" and "In which countries" · https://app.asana.com/0/1200298616652229/1220507710177511 · Added: 13 Nov 2026

You don't need an account to use the Curaprox app's content. You only sign up, in the
app itself, if you want to track your progress or collect points. The app is
available today in South Africa, Slovenia and the United Arab Emirates. If your
country isn't listed, it hasn't launched there yet, so access may be limited for now.

Note: if the person is a dentist or hygienist, they probably mean BOB: give the BOB
sign-up answer above instead, or ask which app they mean.
