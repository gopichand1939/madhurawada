-- Initial MVP schema. Intended for the dedicated cloud_kitchen schema selected
-- by DATABASE_URL. No DROP statements; do not point at a shared public schema.
CREATE TABLE "Kitchen" ("id" UUID NOT NULL,"slug" TEXT NOT NULL,"name" TEXT NOT NULL,"settings" JSONB NOT NULL,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"updatedAt" TIMESTAMP(3) NOT NULL,CONSTRAINT "Kitchen_pkey" PRIMARY KEY ("id"));
CREATE UNIQUE INDEX "Kitchen_slug_key" ON "Kitchen"("slug");
CREATE TABLE "User" ("id" UUID NOT NULL,"kitchenId" UUID NOT NULL,"email" TEXT NOT NULL,"passwordHash" TEXT NOT NULL,"role" TEXT NOT NULL DEFAULT 'STAFF',"active" BOOLEAN NOT NULL DEFAULT true,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"updatedAt" TIMESTAMP(3) NOT NULL,CONSTRAINT "User_pkey" PRIMARY KEY("id"));
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
ALTER TABLE "User" ADD CONSTRAINT "User_kitchenId_fkey" FOREIGN KEY("kitchenId") REFERENCES "Kitchen"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE TABLE "Session" ("id" UUID NOT NULL,"tokenHash" TEXT NOT NULL,"userId" UUID NOT NULL,"expiresAt" TIMESTAMP(3) NOT NULL,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,CONSTRAINT "Session_pkey" PRIMARY KEY("id"));
CREATE UNIQUE INDEX "Session_tokenHash_key" ON "Session"("tokenHash");
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE TABLE "Entity" ("id" UUID NOT NULL,"kitchenId" UUID NOT NULL,"kind" TEXT NOT NULL,"name" TEXT NOT NULL,"data" JSONB NOT NULL,"active" BOOLEAN NOT NULL DEFAULT true,"sortOrder" INTEGER NOT NULL DEFAULT 0,"deletedAt" TIMESTAMP(3),"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"updatedAt" TIMESTAMP(3) NOT NULL,CONSTRAINT "Entity_pkey" PRIMARY KEY("id"));
CREATE INDEX "Entity_kitchenId_kind_deletedAt_active_sortOrder_idx" ON "Entity"("kitchenId","kind","deletedAt","active","sortOrder");
ALTER TABLE "Entity" ADD CONSTRAINT "Entity_kitchenId_fkey" FOREIGN KEY("kitchenId") REFERENCES "Kitchen"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE TABLE "Customer" ("id" UUID NOT NULL,"kitchenId" UUID NOT NULL,"name" TEXT NOT NULL,"phone" TEXT NOT NULL,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,CONSTRAINT "Customer_pkey" PRIMARY KEY("id"));
CREATE UNIQUE INDEX "Customer_kitchenId_phone_key" ON "Customer"("kitchenId","phone");
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_kitchenId_fkey" FOREIGN KEY("kitchenId") REFERENCES "Kitchen"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE TABLE "Order" ("id" UUID NOT NULL,"kitchenId" UUID NOT NULL,"customerId" UUID NOT NULL,"idempotencyKey" TEXT NOT NULL,"trackingHash" TEXT NOT NULL,"status" TEXT NOT NULL DEFAULT 'PENDING',"subtotal" INTEGER NOT NULL,"deliveryFee" INTEGER NOT NULL DEFAULT 0,"total" INTEGER NOT NULL,"address" TEXT NOT NULL,"note" TEXT,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"updatedAt" TIMESTAMP(3) NOT NULL,CONSTRAINT "Order_pkey" PRIMARY KEY("id"));
CREATE UNIQUE INDEX "Order_kitchenId_idempotencyKey_key" ON "Order"("kitchenId","idempotencyKey");
CREATE INDEX "Order_kitchenId_status_createdAt_idx" ON "Order"("kitchenId","status","createdAt");
ALTER TABLE "Order" ADD CONSTRAINT "Order_kitchenId_fkey" FOREIGN KEY("kitchenId") REFERENCES "Kitchen"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Order" ADD CONSTRAINT "Order_customerId_fkey" FOREIGN KEY("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE TABLE "OrderItem" ("id" UUID NOT NULL,"orderId" UUID NOT NULL,"itemId" UUID NOT NULL,"name" TEXT NOT NULL,"quantity" INTEGER NOT NULL,"unitPrice" INTEGER NOT NULL,"total" INTEGER NOT NULL,CONSTRAINT "OrderItem_pkey" PRIMARY KEY("id"));
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE TABLE "OrderStatusHistory" ("id" UUID NOT NULL,"orderId" UUID NOT NULL,"status" TEXT NOT NULL,"actorId" TEXT,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,CONSTRAINT "OrderStatusHistory_pkey" PRIMARY KEY("id"));
ALTER TABLE "OrderStatusHistory" ADD CONSTRAINT "OrderStatusHistory_orderId_fkey" FOREIGN KEY("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE TABLE "AuditLog" ("id" UUID NOT NULL,"kitchenId" UUID NOT NULL,"actorId" TEXT NOT NULL,"action" TEXT NOT NULL,"entityId" TEXT NOT NULL,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,CONSTRAINT "AuditLog_pkey" PRIMARY KEY("id"));
CREATE INDEX "AuditLog_kitchenId_createdAt_idx" ON "AuditLog"("kitchenId","createdAt");
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_kitchenId_fkey" FOREIGN KEY("kitchenId") REFERENCES "Kitchen"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
