CREATE TABLE `audits` (
	`id` text PRIMARY KEY NOT NULL,
	`client_id` text NOT NULL,
	`created_at` text NOT NULL,
	`reports` text NOT NULL,
	`matched_accounts` text NOT NULL,
	`discrepancies` text NOT NULL,
	`total_violations` integer NOT NULL,
	`estimated_damages` real NOT NULL,
	`summary` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `clients` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`name` text NOT NULL,
	`phone` text,
	`state` text NOT NULL,
	`county` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `disputes` (
	`id` text PRIMARY KEY NOT NULL,
	`client_id` text NOT NULL,
	`audit_id` text NOT NULL,
	`discrepancy_id` text NOT NULL,
	`bureau` text NOT NULL,
	`status` text NOT NULL,
	`letter_content` text NOT NULL,
	`sent_at` text,
	`response_deadline` text,
	`response_received_at` text,
	`response_content` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `generated_documents` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`audit_id` text NOT NULL,
	`type` text NOT NULL,
	`file_name` text NOT NULL,
	`content` text NOT NULL,
	`generated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `litigation_packages` (
	`id` text PRIMARY KEY NOT NULL,
	`client_id` text NOT NULL,
	`dispute_ids` text NOT NULL,
	`jurisdiction` text NOT NULL,
	`court_forms` text NOT NULL,
	`estimated_damages` real NOT NULL,
	`created_at` text NOT NULL
);
