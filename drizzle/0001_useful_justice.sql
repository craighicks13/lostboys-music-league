ALTER TABLE "round" DROP CONSTRAINT "round_season_id_season_id_fk";
--> statement-breakpoint
ALTER TABLE "round" ALTER COLUMN "season_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "round" ADD CONSTRAINT "round_season_id_season_id_fk" FOREIGN KEY ("season_id") REFERENCES "public"."season"("id") ON DELETE cascade ON UPDATE no action;