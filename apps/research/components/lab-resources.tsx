import type { PublicCatalogRecord, ResearchPlan } from "@/lib/research-catalog";

function Plans({ plans }: { plans: ResearchPlan[] }) {
  return (
    <ul className="mt-2 space-y-2 text-[0.9375rem] leading-6">
      {plans.map((plan) => (
        <li key={`${plan.url}:${plan.author}:${plan.title}`}>
          <a
            className="lab-resource-link"
            href={plan.url}
            target="_blank"
            rel="noopener noreferrer"
          >
            {plan.title}
          </a>
          <span className="mt-0.5 block font-sans text-xs text-ink-muted">{plan.author}</span>
        </li>
      ))}
    </ul>
  );
}

export function LabLead({ record }: { record: PublicCatalogRecord }) {
  const sites = [
    ...(record.leadSites ?? []),
    ...(record.teamMembers ?? []).map((member) => ({ name: member.name, url: member.personalUrl })),
  ].sort((left, right) => right.name.length - left.name.length);
  // Match verified full names within the original text. Splitting on semicolons
  // loses qualified names such as “Ada Example (contact PI; Canada)”.
  const leads: { text: string; url?: string }[] = [];
  let cursor = 0;
  while (cursor < record.lead.length) {
    let next: { index: number; name: string; url: string } | undefined;
    for (const site of sites) {
      if (!site.name.trim()) continue;
      let index = record.lead.indexOf(site.name, cursor);
      while (index !== -1) {
        const before = record.lead[index - 1] ?? "";
        const after = record.lead[index + site.name.length] ?? "";
        if (!/[\p{L}\p{N}]/u.test(before) && !/[\p{L}\p{N}]/u.test(after)) break;
        index = record.lead.indexOf(site.name, index + site.name.length);
      }
      if (index !== -1 && (!next || index < next.index)) next = { index, ...site };
    }
    if (!next) {
      leads.push({ text: record.lead.slice(cursor) });
      break;
    }
    if (next.index > cursor) leads.push({ text: record.lead.slice(cursor, next.index) });
    leads.push({ text: next.name, url: next.url });
    cursor = next.index + next.name.length;
  }
  return (
    <>
      {leads.map(({ text, url }, index) => {
        return (
          <span key={`${index}:${text}`}>
            {url ? (
              <a className="lab-resource-link" href={url} target="_blank" rel="noopener noreferrer">
                {text}
              </a>
            ) : (
              text
            )}
          </span>
        );
      })}
    </>
  );
}

export function LabResources({ record }: { record: PublicCatalogRecord }) {
  const plans = record.researchPlans ?? [];
  const members = record.teamMembers ?? [];
  const memberPlans = new Map(
    members.map((member) => [
      member.name,
      [
        ...member.researchPlans,
        ...plans.filter(
          (plan) =>
            plan.author.trim().toLocaleLowerCase() === member.name.trim().toLocaleLowerCase()
        ),
      ].filter(
        (plan, index, all) =>
          all.findIndex((other) => other.url === plan.url && other.title === plan.title) === index
      ),
    ])
  );
  const labPlans = plans.filter(
    (plan) =>
      !members.some(
        (member) =>
          plan.author.trim().toLocaleLowerCase() === member.name.trim().toLocaleLowerCase()
      )
  );
  const review = record.resourcesReview;
  const showTeam =
    record.entityType !== "researcher" || members.some((member) => member.name !== record.name);
  return (
    <div className="mt-5 space-y-5">
      {labPlans.length > 0 ? (
        <section aria-label="Lab research plans">
          <h3 className="ui-label">Research plans</h3>
          <Plans plans={labPlans} />
        </section>
      ) : null}
      {showTeam ? (
        <section aria-label="Team personal sites and research plans">
          <h3 className="ui-label">Team</h3>
          {members.length > 0 ? (
            <ul className="mt-2 space-y-4">
              {members.map((member) => (
                <li key={`${member.name}:${member.personalUrl}`}>
                  <a
                    className="lab-resource-link text-[0.9375rem]"
                    href={member.personalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {member.name}
                  </a>
                  {member.role ? (
                    <span className="ml-2 font-sans text-xs text-ink-muted">{member.role}</span>
                  ) : null}
                  {(memberPlans.get(member.name)?.length ?? 0) > 0 ? (
                    <Plans plans={memberPlans.get(member.name) ?? []} />
                  ) : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 font-sans text-xs leading-5 text-ink-muted">
              {review?.status === "checked"
                ? "No independent personal sites found in the reviewed sources."
                : "No independent personal sites have been verified in the available sources."}
            </p>
          )}
        </section>
      ) : null}
      {review && review.status !== "checked" ? (
        <p className="font-sans text-xs leading-5 text-ink-muted">
          {review.status === "source_limited"
            ? "Some current team sites or plans could not be verified."
            : "Only the team sites and plans verified in the checked sources are listed."}
        </p>
      ) : null}
    </div>
  );
}
