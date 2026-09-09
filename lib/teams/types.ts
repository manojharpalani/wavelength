export type TeamSummary = {
  id: string;
  name: string;
  invite_code: string;
  joined_at: string;
  is_owner: boolean;
  member_count: number;
  agreement_finalized_at: string | null;
  agreement_draft_count: number;
};

export type RosterRow = {
  user_id: string;
  email: string;
  name: string | null;
  role: string | null;
  mbti_type: string | null;
  joined_at: string;
  has_manual: boolean;
  is_owner: boolean;
};
