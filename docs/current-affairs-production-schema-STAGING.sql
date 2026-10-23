-- Staging migration; DO NOT apply before constraints, RPCs, secrets, scheduler and grants are reviewed.
CREATE TABLE IF NOT EXISTS public.ca_items (
 "id" bigint NOT NULL,
 "canonical_url" text NOT NULL,
 "source_name" text NOT NULL,
 "headline_en" text NOT NULL,
 "headline_hi" text,
 "summary_en" text,
 "summary_hi" text,
 "published_at" timestamptz NOT NULL,
 "event_date" date,
 "topics" text[] NOT NULL DEFAULT '{}'::text[],
 "exam_tags" text[] NOT NULL DEFAULT '{}'::text[],
 "status" text NOT NULL DEFAULT 'pending'::text,
 "evidence_checked" boolean NOT NULL DEFAULT false,
 "approved_at" timestamptz,
 "created_at" timestamptz NOT NULL DEFAULT now(),
 "source_id" bigint,
 "fingerprint" text,
 "review_notes" text,
 "reviewed_by" uuid,
 "reviewed_at" timestamptz,
 "visible_at" timestamptz,
 "auto_verified" boolean NOT NULL DEFAULT false,
 "auto_verified_at" timestamptz,
 "verification_method" text,
 "key_facts_hi" jsonb NOT NULL DEFAULT '[]'::jsonb,
 "key_facts_en" jsonb NOT NULL DEFAULT '[]'::jsonb,
 "static_gk_hi" text,
 "static_gk_en" text,
 "exam_priority" smallint NOT NULL DEFAULT 1,
 "exam_category" text NOT NULL DEFAULT 'National'::text,
 "editorial_fact_check_at" timestamptz,
 "article_read_at" timestamptz,
 "article_analysis_status" text NOT NULL DEFAULT 'not_processed'::text,
 "article_evidence_sha256" text
);
ALTER TABLE public.ca_items ENABLE ROW LEVEL SECURITY;
CREATE TABLE IF NOT EXISTS public.ca_questions (
 "id" bigint NOT NULL,
 "item_id" bigint NOT NULL,
 "question_en" text NOT NULL,
 "question_hi" text NOT NULL,
 "option_a_en" text NOT NULL,
 "option_b_en" text NOT NULL,
 "option_c_en" text NOT NULL,
 "option_d_en" text NOT NULL,
 "option_a_hi" text NOT NULL,
 "option_b_hi" text NOT NULL,
 "option_c_hi" text NOT NULL,
 "option_d_hi" text NOT NULL,
 "correct_answer" char(1) NOT NULL,
 "explanation_en" text NOT NULL,
 "explanation_hi" text NOT NULL,
 "difficulty" text NOT NULL DEFAULT 'moderate'::text,
 "status" text NOT NULL DEFAULT 'draft'::text,
 "master_question_id" bigint,
 "created_at" timestamptz DEFAULT now(),
 "fingerprint" text,
 "reviewed_by" uuid,
 "reviewed_at" timestamptz,
 "qa_passed" boolean NOT NULL DEFAULT false,
 "visible_at" timestamptz
);
ALTER TABLE public.ca_questions ENABLE ROW LEVEL SECURITY;
CREATE TABLE IF NOT EXISTS public.ca_ingestion_runs (
 "id" bigint NOT NULL,
 "started_at" timestamptz DEFAULT now(),
 "finished_at" timestamptz,
 "source" text NOT NULL,
 "status" text NOT NULL DEFAULT 'running'::text,
 "fetched" integer NOT NULL DEFAULT 0,
 "inserted" integer NOT NULL DEFAULT 0,
 "error_message" text
);
ALTER TABLE public.ca_ingestion_runs ENABLE ROW LEVEL SECURITY;
CREATE TABLE IF NOT EXISTS public.ca_sources (
 "id" bigint NOT NULL,
 "source_key" text NOT NULL,
 "source_name" text NOT NULL,
 "feed_url" text NOT NULL,
 "allowed_host" text NOT NULL,
 "category" text NOT NULL DEFAULT 'National'::text,
 "enabled" boolean NOT NULL DEFAULT true,
 "max_items" integer NOT NULL DEFAULT 40,
 "created_at" timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.ca_sources ENABLE ROW LEVEL SECURITY;
CREATE TABLE IF NOT EXISTS public.ca_source_runs (
 "id" bigint NOT NULL,
 "source_id" bigint,
 "ingestion_run_id" bigint,
 "started_at" timestamptz NOT NULL DEFAULT now(),
 "finished_at" timestamptz,
 "status" text NOT NULL DEFAULT 'running'::text,
 "fetched" integer NOT NULL DEFAULT 0,
 "inserted" integer NOT NULL DEFAULT 0,
 "error_message" text
);
ALTER TABLE public.ca_source_runs ENABLE ROW LEVEL SECURITY;
CREATE TABLE IF NOT EXISTS public.ca_reviews (
 "id" bigint NOT NULL,
 "item_id" bigint,
 "question_id" bigint,
 "reviewer_id" uuid NOT NULL,
 "action" text NOT NULL,
 "evidence_url" text NOT NULL,
 "notes" text NOT NULL,
 "reviewed_at" timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.ca_reviews ENABLE ROW LEVEL SECURITY;
CREATE TABLE IF NOT EXISTS public.ca_batches (
 "id" bigint NOT NULL,
 "batch_type" text NOT NULL,
 "batch_date" date NOT NULL,
 "scheduled_at" timestamptz NOT NULL,
 "released_at" timestamptz,
 "status" text NOT NULL DEFAULT 'draft'::text,
 "title_en" text NOT NULL,
 "title_hi" text NOT NULL,
 "created_at" timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.ca_batches ENABLE ROW LEVEL SECURITY;
CREATE TABLE IF NOT EXISTS public.ca_batch_questions (
 "batch_id" bigint NOT NULL,
 "question_id" bigint NOT NULL,
 "question_order" integer NOT NULL
);
ALTER TABLE public.ca_batch_questions ENABLE ROW LEVEL SECURITY;
CREATE TABLE IF NOT EXISTS public.ca_automation_runs (
 "id" bigint NOT NULL,
 "job_name" text NOT NULL,
 "started_at" timestamptz NOT NULL DEFAULT now(),
 "completed_at" timestamptz,
 "status" text NOT NULL,
 "affected" integer NOT NULL DEFAULT 0,
 "details" text
);
ALTER TABLE public.ca_automation_runs ENABLE ROW LEVEL SECURITY;
CREATE TABLE IF NOT EXISTS public.ca_verification_checks (
 "id" bigint NOT NULL,
 "item_id" bigint NOT NULL,
 "checked_at" timestamptz NOT NULL DEFAULT now(),
 "outcome" text NOT NULL,
 "source_url" text NOT NULL,
 "evidence_date" date,
 "headline_match" numeric,
 "evidence_excerpt" text,
 "reason" text NOT NULL,
 "engine" text NOT NULL DEFAULT 'first-party-v1'::text
);
ALTER TABLE public.ca_verification_checks ENABLE ROW LEVEL SECURITY;
CREATE TABLE IF NOT EXISTS public.ca_article_analyses (
 "item_id" bigint NOT NULL,
 "source_url" text NOT NULL,
 "source_host" text NOT NULL,
 "analyzed_at" timestamptz NOT NULL DEFAULT now(),
 "article_publication_date" date,
 "full_article_words" integer NOT NULL DEFAULT 0,
 "article_sha256" text,
 "analysis_status" text NOT NULL,
 "exam_score" smallint NOT NULL DEFAULT 0,
 "exam_category" text NOT NULL DEFAULT 'National'::text,
 "exam_tags" text[] NOT NULL DEFAULT '{}'::text[],
 "relevance_reasons" text[] NOT NULL DEFAULT '{}'::text[],
 "candidate_facts_en" jsonb NOT NULL DEFAULT '[]'::jsonb,
 "candidate_facts_hi" jsonb NOT NULL DEFAULT '[]'::jsonb,
 "matched_fact_pairs" jsonb NOT NULL DEFAULT '[]'::jsonb,
 "source_excerpt" text,
 "verification_issue" text,
 "pipeline_version" text NOT NULL DEFAULT 'article_exam_rubric_v1'::text
);
ALTER TABLE public.ca_article_analyses ENABLE ROW LEVEL SECURITY;
-- TODO: add constraints, indexes, identities, RLS policies, grants, RPCs and scheduled jobs before executing.
