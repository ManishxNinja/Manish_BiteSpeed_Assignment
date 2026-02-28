-- CreateTable
CREATE TABLE "contacts" (
    "id" SERIAL NOT NULL,
    "email" VARCHAR(255),
    "phonenumber" VARCHAR(20),
    "linkedid" INTEGER,
    "linkprecedence" VARCHAR(20) NOT NULL,
    "createdat" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedat" TIMESTAMPTZ(6) NOT NULL,
    "deletedat" TIMESTAMPTZ(6),

    CONSTRAINT "contacts_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_linkedid_fkey" FOREIGN KEY ("linkedid") REFERENCES "contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
