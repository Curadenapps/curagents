$token = "ZjM1OTRlM2UtM2NiOC00ZGU2LThkNDgtZWMyNDBhODkxYjY0MTVkODc4ZGEtYmFk_PE93_ee60334c-b2ad-49a5-8553-9824f0039e88"
$roomIds = @(
    "Y2lzY29zcGFyazovL3VzL1JPT00vNjdiMGNiNTAtZWU4Ny0xMWVmLTljOTMtNWIwMjE3MGI1ODY5",  # App Team
    "Y2lzY29zcGFyazovL3VzL1JPT00vMjc3ZTYwNDAtMGVkMi0xMWYwLTgzN2EtYmYxZmMwNjAwM2Nk"   # App Team - Markets
)

$lines = @(
    "<h2>Updates</h2>",
    "<h3>Technical</h3>",
    "* **Legacy BOB Release:** We have completed the full release scope for Legacy BOB and brought it to client UAT readiness. The work included a PHP full backend upgrade, mobile version and UI optimisation, iOS SDK upgrade, Hexagon icon update, and Firebase/Crashlytics integration. Internal testing and smoke testing are complete. We are currently waiting on final client UAT confirmation before proceeding to release.",
    "* **BOB Sign-Up Bug Fix:** We resolved an urgent issue affecting the BOB App sign-up form. The root cause was stale token validation logic checking the submitter's IP address. Since the Webflow form submits from the client side, valid submissions were being rejected. The redundant IP-checking logic has been removed and the sign-up flow is working correctly again.",
    "* **BOB Mobile:** UAT is now underway. We are testing the mobile experience ahead of wider rollout. Findings are being logged and tracked as they come in. The user guide is in draft and will be published following UAT sign-off.",
    "* **BOB Overhaul - Foundations Complete:** Two key foundations were completed this month. The Mouth Map feature is now done, allowing BOB Overhaul to record Mouth Map status as part of the assessment workflow. We also completed the data migration from Legacy BOB, so existing users can log in to the new version without losing their data.",
    "* **BOB Overhaul - What's Next:** The Portugal workshop surfaced a number of features we want to build into BOB Overhaul. The first of these is Prescription Mode, which will become one of the major features of the BOB App. The WBS for this is coming next week. We are also examining how the email flow will work within BOB. Beyond prescription mode, we are continuing to explore additional ideas from the workshop.",
    "* **Plaque:** Rather than a full overhaul, we are adding a plaque button to the existing workflow. This is a focused, low-disruption addition that gives clinicians the option to record plaque without changing the broader assessment flow.",
    "* **PBE:** We completed the initial investigation into the PBE concept, covering Plaque, Bleeding, and Erythema as part of a broader clinical assessment flow. Initial wireframes have been produced. The next step is confirming the detailed rules before moving into implementation planning.",
    "* **iTOP:** We are beginning to explore iTOP functions within the app ecosystem. More detail on scope and direction will follow as this progresses.",
    "* **Curaprox and Curaden Apps:** We have fixed the Curaprox Android shop section loading issue, added an in-app notification for new version availability on both apps, and completed the iOS SDK upgrade to version 26. Internal testing is targeted for completion this week, with a PROD release planned for next week.",
    "* **Toothbrush Designer:** WBS, estimation, and scope clarification are complete. The first sprint is now underway.",
    "* **HubSpot Integration:** Following a meeting this week, the team is now working on integrating our basic sign-up form with HubSpot. This is expected to be complete over the next month and will form the foundation of our CRM-connected form infrastructure.",
    "* **Curaden Education Hub - Phase 1 Live:** The Education Hub is now live in its first phase. It is a centralised publishing and access system for all educational content across iTOP, Oral Care Health Education, and Curaprox, built in Notion as the single source of truth. Instructors and local partners can browse and access assets directly. An AI education agent sits on top of the system and reads live from Notion at runtime, meaning content is always current without manual updates.",
    "<h3>Internals</h3>",
    "* The Portugal workshop in April was a significant input across multiple workstreams. It shaped the BOB Overhaul feature roadmap, gave rise to the Education Hub and Education Agent, and surfaced a range of ideas we are continuing to examine and scope.",
    "* The Phinamic (Vietnam dev team) workshop is planned for June, with site visits to clinic partners in Italy and Switzerland. Preparation is underway across technical and logistics tracks.",
    "<h3>Markets</h3>",
    "* **GTM:** Since BOB is already live across a number of countries, we are now beginning to look at go-to-market more actively. The focus will be on reaching out to relevant contacts in existing markets to assess performance, gather feedback, and identify growth opportunities. More structure around this will follow.",
    "<h3>What's next</h3>",
    "* Legacy BOB client UAT confirmation and release",
    "* BOB Mobile UAT completion and sign-off",
    "* Curaprox and Curaden Apps PROD release (next week)",
    "* Prescription Mode WBS (next week) and sprint planning",
    "* HubSpot form integration (next month)",
    "* BOB email flow scoping",
    "* PBE rules confirmation and implementation planning",
    "* iTOP scope definition",
    "* GTM outreach planning",
    "* Toothbrush Designer sprint execution"
)

$markdown = $lines -join "`n`n"

# Build JSON manually to avoid serialisation issues
$escapedMarkdown = $markdown `
    -replace '\\', '\\\\' `
    -replace '"', '\"' `
    -replace "`r`n", '\n' `
    -replace "`n", '\n' `
    -replace "`t", '\t'

$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type"  = "application/json; charset=utf-8"
}

foreach ($roomId in $roomIds) {
    $json = '{"roomId":"' + $roomId + '","markdown":"' + $escapedMarkdown + '"}'
    try {
        $response = Invoke-RestMethod -Uri "https://webexapis.com/v1/messages" -Method POST -Headers $headers -Body ([System.Text.Encoding]::UTF8.GetBytes($json))
        Write-Host "Posted to $roomId - Message ID: $($response.id)"
    } catch {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $reader.BaseStream.Position = 0
        Write-Host "Error posting to $roomId`: $($reader.ReadToEnd())"
    }
}
