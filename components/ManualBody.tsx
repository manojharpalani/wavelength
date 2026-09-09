import { Fragment } from "react";
import { MbtiBadge } from "@/components/MbtiBadge";
import {
  buildDetailedSections,
  buildOnePagerEssentials,
  buildOnePagerFacts,
  deriveTags,
  isFilled,
  type Values,
} from "@/lib/manual/data";

export function ReviewSection({ heading, rows }: { heading: string; rows: { label: string; value?: string }[] }) {
  if (rows.length === 0) return null;
  return (
    <div className="review-section">
      <h3 className="review-heading">{heading}</h3>
      {rows.map((item) => {
        const points = (item.value || "")
          .split("\n")
          .map((p) => p.trim())
          .filter(Boolean);
        return (
          <div className="review-row" key={item.label}>
            <div className="review-label">{item.label}</div>
            <ul className="review-value review-list">
              {points.map((point, i) => (
                <li key={i}>{point}</li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

export function ManualBody({ values, mode }: { values: Values; mode: "detailed" | "onepager" }) {
  const sections = buildDetailedSections(values);
  const quickFacts = buildOnePagerFacts(values);
  const essentials = buildOnePagerEssentials(values);
  const tags = deriveTags(values.strengths);
  const hasTags = tags.length > 0;
  const hasContent = mode === "onepager" ? quickFacts.length > 0 || essentials.length > 0 || hasTags : sections.length > 0 || hasTags;

  if (!hasContent) {
    return <p className="empty-state">Nothing here yet — jump into any section on the left and add a few details to see your manual take shape.</p>;
  }

  return (
    <div className="manual-body">
      {mode === "onepager" ? (
        <>
          <ReviewSection heading="Quick Facts" rows={quickFacts} />
          <ReviewSection heading="The Essentials" rows={essentials} />
        </>
      ) : (
        sections.map((s) => (
          <Fragment key={s.heading}>
            <ReviewSection heading={s.heading} rows={s.items} />
            {s.heading === "About Me" && isFilled(values.mbtiType) && (
              <div className="review-section">
                <h3 className="review-heading">Personality</h3>
                <div className="review-row">
                  <div className="review-label">Myers-Briggs type</div>
                  <MbtiBadge code={values.mbtiType} />
                </div>
              </div>
            )}
          </Fragment>
        ))
      )}
      {hasTags && (
        <div className="review-section">
          <h3 className="review-heading">Strengths</h3>
          <div className="tag-row">
            {tags.map((t) => (
              <span className="tag" key={t}>{t}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
