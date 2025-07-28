CREATE TABLE "summaries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source" text,
	"url" text,
	"title" text,
	"summary" text,
	"created_at" timestamp DEFAULT now()
);
