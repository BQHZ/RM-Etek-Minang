-- CreateEnum
CREATE TYPE "ModRequestType" AS ENUM ('EDIT_ITEM', 'REMOVE_ITEM', 'CANCEL_ORDER');

-- CreateEnum
CREATE TYPE "ModRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterEnum
ALTER TYPE "OrderStatus" ADD VALUE 'PARTIALLY_PAID';

-- DropIndex
DROP INDEX "Transaction_orderId_key";

-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "isVoid" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "splitGroup" TEXT,
ADD COLUMN     "splitLabel" TEXT,
ADD COLUMN     "voidReason" TEXT;

-- CreateTable
CREATE TABLE "OrderModificationRequest" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "requestedById" TEXT NOT NULL,
    "type" "ModRequestType" NOT NULL,
    "details" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "ModRequestStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderModificationRequest_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "OrderModificationRequest" ADD CONSTRAINT "OrderModificationRequest_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderModificationRequest" ADD CONSTRAINT "OrderModificationRequest_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderModificationRequest" ADD CONSTRAINT "OrderModificationRequest_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
