-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('ProjectAssignment', 'Service', 'Payment', 'UserRegistration', 'Inquiry', 'Finance', 'DocumentApproval');

-- CreateTable
CREATE TABLE "notification-toggle" (
    "id" TEXT NOT NULL,
    "email" BOOLEAN NOT NULL DEFAULT true,
    "userUpdates" BOOLEAN NOT NULL DEFAULT true,
    "serviceCreate" BOOLEAN NOT NULL DEFAULT true,
    "review" BOOLEAN NOT NULL DEFAULT true,
    "post" BOOLEAN NOT NULL DEFAULT true,
    "message" BOOLEAN NOT NULL DEFAULT true,
    "Inquiry" BOOLEAN NOT NULL DEFAULT true,
    "userRegistration" BOOLEAN NOT NULL DEFAULT true,
    "Service" BOOLEAN NOT NULL DEFAULT true,
    "userId" TEXT NOT NULL,

    CONSTRAINT "notification-toggle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "smnotifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "entityId" TEXT,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "smnotifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SmNotificationUser" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType",
    "notificationId" TEXT NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SmNotificationUser_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "smnotifications_userId_idx" ON "smnotifications"("userId");

-- CreateIndex
CREATE INDEX "smnotifications_read_idx" ON "smnotifications"("read");

-- CreateIndex
CREATE INDEX "smnotifications_createdAt_idx" ON "smnotifications"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "SmNotificationUser_userId_notificationId_key" ON "SmNotificationUser"("userId", "notificationId");

-- AddForeignKey
ALTER TABLE "notification-toggle" ADD CONSTRAINT "notification-toggle_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "smnotifications" ADD CONSTRAINT "smnotifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SmNotificationUser" ADD CONSTRAINT "SmNotificationUser_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SmNotificationUser" ADD CONSTRAINT "SmNotificationUser_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES "smnotifications"("id") ON DELETE CASCADE ON UPDATE CASCADE;
