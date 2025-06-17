/*
  Warnings:

  - You are about to drop the column `description` on the `Photo` table. All the data in the column will be lost.
  - You are about to drop the column `title` on the `Photo` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `Photo` table. All the data in the column will be lost.
  - You are about to drop the `User` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Photo" DROP CONSTRAINT "Photo_userId_fkey";

-- AlterTable
ALTER TABLE "Photo" DROP COLUMN "description",
DROP COLUMN "title",
DROP COLUMN "userId";

-- DropTable
DROP TABLE "User";
