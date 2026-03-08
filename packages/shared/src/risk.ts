// ──────────────────────────────────────────────────────────────
// Risk Classification System
// ──────────────────────────────────────────────────────────────

export const RISK_CLASSES = [
  "MONEY_MOVEMENT",
  "EXTERNAL_COMMUNICATION",
  "DATA_EXPORT",
  "DATA_WRITE",
  "CODE_EXECUTION",
  "FILE_MUTATION",
  "CREDENTIAL_USE",
  "PII_ACCESS",
  "ADMIN_ACTION",
  "LOW_RISK",
] as const;

export type RiskClass = (typeof RISK_CLASSES)[number];

export const RISK_CLASS_META: Record<
  RiskClass,
  { label: string; severity: number; description: string }
> = {
  MONEY_MOVEMENT: {
    label: "Money Movement",
    severity: 90,
    description: "Actions involving financial transactions, refunds, or payment operations",
  },
  EXTERNAL_COMMUNICATION: {
    label: "External Communication",
    severity: 70,
    description: "Outbound messages to customers or external parties",
  },
  DATA_EXPORT: {
    label: "Data Export",
    severity: 80,
    description: "Exporting, downloading, or transferring data externally",
  },
  DATA_WRITE: {
    label: "Data Write",
    severity: 60,
    description: "Creating, updating, or modifying database records",
  },
  CODE_EXECUTION: {
    label: "Code Execution",
    severity: 95,
    description: "Running code, shell commands, or arbitrary scripts",
  },
  FILE_MUTATION: {
    label: "File Mutation",
    severity: 75,
    description: "Creating, modifying, or deleting files",
  },
  CREDENTIAL_USE: {
    label: "Credential Use",
    severity: 95,
    description: "Accessing or using secrets, API keys, or credentials",
  },
  PII_ACCESS: {
    label: "PII Access",
    severity: 85,
    description: "Reading or processing personally identifiable information",
  },
  ADMIN_ACTION: {
    label: "Admin Action",
    severity: 90,
    description: "Privileged operations requiring elevated permissions",
  },
  LOW_RISK: {
    label: "Low Risk",
    severity: 10,
    description: "Read-only or informational actions with minimal risk",
  },
};

export interface ToolRiskMapping {
  toolName: string;
  toolAction: string;
  riskClass: RiskClass;
  reason: string;
}

export const DEFAULT_TOOL_RISK_MAPPINGS: ToolRiskMapping[] = [
  // Financial
  { toolName: "stripe", toolAction: "refund", riskClass: "MONEY_MOVEMENT", reason: "Payment refund" },
  { toolName: "stripe", toolAction: "charge", riskClass: "MONEY_MOVEMENT", reason: "Payment charge" },
  { toolName: "stripe", toolAction: "transfer", riskClass: "MONEY_MOVEMENT", reason: "Fund transfer" },
  { toolName: "paypal", toolAction: "*", riskClass: "MONEY_MOVEMENT", reason: "PayPal transaction" },
  { toolName: "billing", toolAction: "*", riskClass: "MONEY_MOVEMENT", reason: "Billing operation" },

  // Communication
  { toolName: "gmail", toolAction: "send", riskClass: "EXTERNAL_COMMUNICATION", reason: "Outbound email" },
  { toolName: "email", toolAction: "send", riskClass: "EXTERNAL_COMMUNICATION", reason: "Outbound email" },
  { toolName: "sendgrid", toolAction: "*", riskClass: "EXTERNAL_COMMUNICATION", reason: "Email service" },
  { toolName: "slack", toolAction: "send", riskClass: "EXTERNAL_COMMUNICATION", reason: "Slack message" },
  { toolName: "twilio", toolAction: "*", riskClass: "EXTERNAL_COMMUNICATION", reason: "SMS/voice" },
  { toolName: "sms", toolAction: "send", riskClass: "EXTERNAL_COMMUNICATION", reason: "SMS message" },

  // Data export
  { toolName: "s3", toolAction: "export", riskClass: "DATA_EXPORT", reason: "S3 export" },
  { toolName: "s3", toolAction: "upload", riskClass: "DATA_EXPORT", reason: "S3 upload" },
  { toolName: "gcs", toolAction: "upload", riskClass: "DATA_EXPORT", reason: "GCS upload" },
  { toolName: "export", toolAction: "*", riskClass: "DATA_EXPORT", reason: "Data export" },
  { toolName: "download", toolAction: "*", riskClass: "DATA_EXPORT", reason: "Data download" },

  // Data write
  { toolName: "postgres", toolAction: "update", riskClass: "DATA_WRITE", reason: "Database update" },
  { toolName: "postgres", toolAction: "insert", riskClass: "DATA_WRITE", reason: "Database insert" },
  { toolName: "postgres", toolAction: "delete", riskClass: "DATA_WRITE", reason: "Database delete" },
  { toolName: "mysql", toolAction: "*", riskClass: "DATA_WRITE", reason: "Database write" },
  { toolName: "mongodb", toolAction: "update", riskClass: "DATA_WRITE", reason: "MongoDB update" },
  { toolName: "mongodb", toolAction: "delete", riskClass: "DATA_WRITE", reason: "MongoDB delete" },
  { toolName: "sql", toolAction: "write", riskClass: "DATA_WRITE", reason: "SQL write" },
  { toolName: "database", toolAction: "*", riskClass: "DATA_WRITE", reason: "Database operation" },
  { toolName: "zendesk", toolAction: "update", riskClass: "DATA_WRITE", reason: "CRM write" },
  { toolName: "zendesk", toolAction: "close", riskClass: "DATA_WRITE", reason: "Ticket close" },
  { toolName: "zendesk", toolAction: "delete", riskClass: "DATA_WRITE", reason: "Ticket delete" },
  { toolName: "salesforce", toolAction: "update", riskClass: "DATA_WRITE", reason: "CRM write" },
  { toolName: "hubspot", toolAction: "update", riskClass: "DATA_WRITE", reason: "CRM write" },

  // Code execution
  { toolName: "shell", toolAction: "exec", riskClass: "CODE_EXECUTION", reason: "Shell command" },
  { toolName: "shell", toolAction: "*", riskClass: "CODE_EXECUTION", reason: "Shell operation" },
  { toolName: "code", toolAction: "execute", riskClass: "CODE_EXECUTION", reason: "Code execution" },
  { toolName: "python", toolAction: "run", riskClass: "CODE_EXECUTION", reason: "Python execution" },
  { toolName: "eval", toolAction: "*", riskClass: "CODE_EXECUTION", reason: "Dynamic evaluation" },
  { toolName: "lambda", toolAction: "invoke", riskClass: "CODE_EXECUTION", reason: "Lambda invocation" },

  // File mutation
  { toolName: "fs", toolAction: "delete", riskClass: "FILE_MUTATION", reason: "File deletion" },
  { toolName: "fs", toolAction: "write", riskClass: "FILE_MUTATION", reason: "File write" },
  { toolName: "fs", toolAction: "rename", riskClass: "FILE_MUTATION", reason: "File rename" },
  { toolName: "file", toolAction: "delete", riskClass: "FILE_MUTATION", reason: "File deletion" },
  { toolName: "file", toolAction: "write", riskClass: "FILE_MUTATION", reason: "File write" },

  // Credentials
  { toolName: "vault", toolAction: "*", riskClass: "CREDENTIAL_USE", reason: "Vault access" },
  { toolName: "secrets", toolAction: "*", riskClass: "CREDENTIAL_USE", reason: "Secrets access" },
  { toolName: "ssm", toolAction: "get", riskClass: "CREDENTIAL_USE", reason: "Parameter store" },
  { toolName: "kms", toolAction: "*", riskClass: "CREDENTIAL_USE", reason: "Key management" },

  // PII
  { toolName: "pii", toolAction: "*", riskClass: "PII_ACCESS", reason: "PII operation" },
  { toolName: "user_data", toolAction: "export", riskClass: "PII_ACCESS", reason: "User data export" },
  { toolName: "customer", toolAction: "lookup", riskClass: "PII_ACCESS", reason: "Customer lookup" },

  // Admin
  { toolName: "admin", toolAction: "*", riskClass: "ADMIN_ACTION", reason: "Admin operation" },
  { toolName: "iam", toolAction: "*", riskClass: "ADMIN_ACTION", reason: "IAM operation" },
  { toolName: "rbac", toolAction: "*", riskClass: "ADMIN_ACTION", reason: "RBAC operation" },
  { toolName: "config", toolAction: "update", riskClass: "ADMIN_ACTION", reason: "Config change" },
];

const KEYWORD_RISK_HEURISTICS: { keywords: string[]; riskClass: RiskClass }[] = [
  { keywords: ["refund", "charge", "payment", "transfer", "payout", "invoice"], riskClass: "MONEY_MOVEMENT" },
  { keywords: ["email", "send", "notify", "sms", "message", "broadcast"], riskClass: "EXTERNAL_COMMUNICATION" },
  { keywords: ["export", "download", "extract", "backup", "dump"], riskClass: "DATA_EXPORT" },
  { keywords: ["write", "update", "insert", "delete", "create", "modify", "upsert", "remove", "patch"], riskClass: "DATA_WRITE" },
  { keywords: ["exec", "execute", "run", "eval", "invoke", "shell", "script", "compile"], riskClass: "CODE_EXECUTION" },
  { keywords: ["file", "fs", "unlink", "rename", "move", "copy"], riskClass: "FILE_MUTATION" },
  { keywords: ["secret", "credential", "token", "key", "password", "vault", "cert"], riskClass: "CREDENTIAL_USE" },
  { keywords: ["pii", "personal", "ssn", "dob", "address", "phone", "gdpr"], riskClass: "PII_ACCESS" },
  { keywords: ["admin", "privilege", "sudo", "root", "superuser", "iam", "rbac", "permission"], riskClass: "ADMIN_ACTION" },
];

export interface ClassifyResult {
  riskClass: RiskClass;
  source: "registry" | "mapping" | "heuristic" | "default";
  reason: string;
  confidence: number;
}

/**
 * Classify a tool call by risk. Checks in order:
 * 1. Org-specific registry overrides
 * 2. Default mappings
 * 3. Keyword heuristics
 * 4. Fallback to LOW_RISK
 */
export function classifyToolRisk(
  toolName: string,
  toolAction: string,
  orgOverrides?: ToolRiskMapping[]
): ClassifyResult {
  const norm = (s: string) => s.toLowerCase().trim();
  const tn = norm(toolName);
  const ta = norm(toolAction);

  if (orgOverrides) {
    const override = orgOverrides.find(
      (m) => norm(m.toolName) === tn && (norm(m.toolAction) === ta || m.toolAction === "*")
    );
    if (override) {
      return { riskClass: override.riskClass, source: "registry", reason: override.reason, confidence: 1.0 };
    }
  }

  const exactMapping = DEFAULT_TOOL_RISK_MAPPINGS.find(
    (m) => norm(m.toolName) === tn && norm(m.toolAction) === ta
  );
  if (exactMapping) {
    return { riskClass: exactMapping.riskClass, source: "mapping", reason: exactMapping.reason, confidence: 0.95 };
  }

  const wildcardMapping = DEFAULT_TOOL_RISK_MAPPINGS.find(
    (m) => norm(m.toolName) === tn && m.toolAction === "*"
  );
  if (wildcardMapping) {
    return { riskClass: wildcardMapping.riskClass, source: "mapping", reason: wildcardMapping.reason, confidence: 0.85 };
  }

  const combined = `${tn} ${ta}`;
  for (const h of KEYWORD_RISK_HEURISTICS) {
    const match = h.keywords.find((kw) => combined.includes(kw));
    if (match) {
      return {
        riskClass: h.riskClass,
        source: "heuristic",
        reason: `Keyword "${match}" in tool/action name`,
        confidence: 0.6,
      };
    }
  }

  return { riskClass: "LOW_RISK", source: "default", reason: "No risk signals detected", confidence: 0.5 };
}

export function isSensitiveRiskClass(riskClass: RiskClass): boolean {
  return RISK_CLASS_META[riskClass].severity >= 70;
}

export function getRiskSeverity(riskClass: RiskClass): number {
  return RISK_CLASS_META[riskClass].severity;
}
