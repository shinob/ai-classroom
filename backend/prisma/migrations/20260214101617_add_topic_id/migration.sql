-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Session" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "schoolType" TEXT NOT NULL,
    "grade" INTEGER NOT NULL,
    "subject" TEXT NOT NULL,
    "topicId" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Session" ("createdAt", "grade", "id", "schoolType", "subject") SELECT "createdAt", "grade", "id", "schoolType", "subject" FROM "Session";
DROP TABLE "Session";
ALTER TABLE "new_Session" RENAME TO "Session";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
