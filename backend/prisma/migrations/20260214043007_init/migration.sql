-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "schoolType" TEXT NOT NULL,
    "grade" INTEGER NOT NULL,
    "subject" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Teacher" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "age" INTEGER NOT NULL,
    "gender" TEXT NOT NULL,
    "personality" TEXT NOT NULL,
    "teachingStyle" TEXT NOT NULL,
    "familyEnvironment" TEXT NOT NULL,
    "yearsOfExperience" INTEGER NOT NULL,
    CONSTRAINT "Teacher_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Student" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "gender" TEXT NOT NULL,
    "personality" TEXT NOT NULL,
    "academicLevel" INTEGER NOT NULL,
    "concentration" TEXT NOT NULL,
    "hobbies" TEXT NOT NULL,
    "favoriteSubjects" TEXT NOT NULL,
    "weakSubjects" TEXT NOT NULL,
    "familyEnvironment" TEXT NOT NULL,
    "seatRow" INTEGER NOT NULL,
    "seatCol" INTEGER NOT NULL,
    CONSTRAINT "Student_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Utterance" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "speakerId" TEXT NOT NULL,
    "speakerType" TEXT NOT NULL,
    "speakerName" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "timestamp" REAL NOT NULL,
    "phase" TEXT NOT NULL,
    CONSTRAINT "Utterance_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Teacher_sessionId_key" ON "Teacher"("sessionId");

-- CreateIndex
CREATE INDEX "Utterance_sessionId_timestamp_idx" ON "Utterance"("sessionId", "timestamp");
