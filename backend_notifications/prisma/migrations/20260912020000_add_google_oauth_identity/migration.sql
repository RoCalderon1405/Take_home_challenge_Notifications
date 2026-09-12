-- CreateEnum
CREATE TYPE "AuthProvider" AS ENUM ('GOOGLE');

-- Allow OAuth-only users to exist without a local password.
ALTER TABLE "users" ALTER COLUMN "password_hash" DROP NOT NULL;

-- CreateTable
CREATE TABLE "user_identities" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "provider" "AuthProvider" NOT NULL,
    "provider_user_id" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_identities_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "uq_user_identity_provider_subject"
ON "user_identities"("provider", "provider_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_user_identity_user_provider"
ON "user_identities"("user_id", "provider");

-- CreateIndex
CREATE INDEX "idx_user_identities_user_id"
ON "user_identities"("user_id");

-- AddForeignKey
ALTER TABLE "user_identities"
ADD CONSTRAINT "user_identities_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id")
ON DELETE CASCADE ON UPDATE NO ACTION;
