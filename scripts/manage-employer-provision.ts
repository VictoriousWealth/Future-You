import { createHmac, randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import WebSocket from "ws";

function requiredEnvironment(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required environment value: ${name}.`);
  return value;
}

function administrationClient() {
  const url = requiredEnvironment("SUPABASE_URL");
  const host = new URL(url).hostname;
  const localTarget = host === "127.0.0.1" || host === "localhost" || host === "::1";
  if (!localTarget && process.env.REGISTRATION_OPERATION_CONFIRM_HOST !== host) {
    throw new Error(
      `Refusing remote registration operation for ${host}. Set REGISTRATION_OPERATION_CONFIRM_HOST to that exact host after obtaining approval.`
    );
  }
  return createClient(
    url,
    requiredEnvironment("SUPABASE_REGISTRATION_SECRET_KEY"),
    {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      realtime: { transport: WebSocket as never }
    }
  );
}

async function issue(arguments_: string[]) {
  const [companyInput, emailInput, externalReference = ""] = arguments_;
  if (!companyInput || !emailInput) {
    throw new Error("Usage: npm run registration:provision -- <company-id> <work-email> [external-reference]");
  }
  const companyId = companyInput.toUpperCase().replaceAll(/[^A-Z0-9]/g, "");
  const workEmail = emailInput.trim().toLowerCase();
  if (companyId.length < 8 || companyId.length > 32) throw new Error("Company ID must contain 8 to 32 letters or digits.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(workEmail) || workEmail.length > 320) throw new Error("Enter a valid work email.");
  if (externalReference.length > 160) throw new Error("External reference must be 160 characters or fewer.");
  const fingerprint = createHmac("sha256", requiredEnvironment("REGISTRATION_FINGERPRINT_PEPPER"))
    .update(workEmail)
    .digest("hex");
  const provisionId = randomUUID();
  const { data, error } = await administrationClient().rpc("registration_operational_issue_provision", {
    p_provision_id: provisionId,
    p_company_id: companyId,
    p_work_email_normalized: workEmail,
    p_work_email_fingerprint: fingerprint,
    p_external_reference: externalReference,
    p_correlation_id: randomUUID(),
    p_now: new Date().toISOString()
  });
  if (error) throw new Error(`Provisioning failed: ${error.code}.`);
  const result = Array.isArray(data) ? data[0] : data;
  process.stdout.write(`${JSON.stringify({ result: result?.result_category, provisionId: result?.provision_id })}\n`);
}

async function revoke(arguments_: string[]) {
  const [provisionId, reasonCode] = arguments_;
  if (!provisionId || !reasonCode) {
    throw new Error("Usage: npm run registration:revoke -- <provision-id> <reason-code>");
  }
  if (!/^[A-Z0-9_:-]{2,80}$/i.test(reasonCode)) throw new Error("Reason code must contain 2 to 80 safe identifier characters.");
  const { data, error } = await administrationClient().rpc("registration_operational_revoke_provision", {
    p_provision_id: provisionId,
    p_reason_code: reasonCode,
    p_correlation_id: randomUUID(),
    p_now: new Date().toISOString()
  });
  if (error) throw new Error(`Revocation failed: ${error.code}.`);
  const result = Array.isArray(data) ? data[0] : data;
  process.stdout.write(`${JSON.stringify({ result: result?.result_category, affectedUserId: result?.affected_user_id ?? null })}\n`);
}

const [operation, ...arguments_] = process.argv.slice(2);
if (operation === "issue") await issue(arguments_);
else if (operation === "revoke") await revoke(arguments_);
else throw new Error("Use the issue or revoke operation.");
