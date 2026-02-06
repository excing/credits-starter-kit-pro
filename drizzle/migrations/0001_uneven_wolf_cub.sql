CREATE TABLE "credit_debt" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"amount" integer NOT NULL,
	"operation_type" text NOT NULL,
	"metadata" text,
	"related_id" text,
	"is_settled" boolean DEFAULT false NOT NULL,
	"settled_at" timestamp,
	"settled_transaction_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "credit_debt" ADD CONSTRAINT "credit_debt_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;