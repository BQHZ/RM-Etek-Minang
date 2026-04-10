-- CreateEnum
CREATE TYPE "OrderSource" AS ENUM ('WAITER', 'ONLINE');

-- AlterEnum
ALTER TYPE "OrderStatus" ADD VALUE 'PENDING_CONFIRMATION';

-- DropForeignKey
ALTER TABLE "Order" DROP CONSTRAINT "Order_createdById_fkey";

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "customerNote" TEXT,
ADD COLUMN     "rejectReason" TEXT,
ADD COLUMN     "source" "OrderSource" NOT NULL DEFAULT 'WAITER',
ALTER COLUMN "createdById" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
