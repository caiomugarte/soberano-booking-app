-- CreateIndex
CREATE UNIQUE INDEX "customers_tenant_id_cpf_key" ON "customers"("tenant_id", "cpf");
