const API_BASE = "https://api.cloudflare.com/client/v4";
const PROJECT_NAME = "saraaminpour";
const ROOT_DOMAIN = "sara-aminpour.com";
const PAGES_HOST = `${PROJECT_NAME}.pages.dev`;
const CUSTOM_DOMAINS = [ROOT_DOMAIN, `www.${ROOT_DOMAIN}`];
const apply = process.argv.includes("--apply");

const token = process.env.CLOUDFLARE_API_TOKEN;
const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;

if (!token || !accountId) {
  console.error(
    "Missing CLOUDFLARE_API_TOKEN or CLOUDFLARE_ACCOUNT_ID. Load them into the environment and rerun."
  );
  process.exit(1);
}

async function cf(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : {};

  if (!response.ok || data.success === false) {
    const messages = [
      ...(data.errors || []).map((error) => error.message),
      ...(data.messages || []).map((message) => message.message)
    ].filter(Boolean);
    const detail = messages.length ? messages.join("; ") : response.statusText;
    const error = new Error(`${options.method || "GET"} ${path} failed: ${detail}`);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data.result;
}

async function exists(path) {
  try {
    return await cf(path);
  } catch (error) {
    if (error.status === 404) {
      return null;
    }
    throw error;
  }
}

function action(message) {
  console.log(`${apply ? "APPLY" : "PLAN"} ${message}`);
}

async function verifyToken() {
  const result = await cf("/user/tokens/verify");
  console.log(`Token verified: ${result.status || "active"}`);
}

async function ensureProject() {
  const projectPath = `/accounts/${accountId}/pages/projects/${PROJECT_NAME}`;
  const project = await exists(projectPath);

  if (project) {
    console.log(`Pages project exists: ${project.name}`);
    return project;
  }

  action(`create Pages project ${PROJECT_NAME}`);
  if (!apply) {
    return null;
  }

  return cf(`/accounts/${accountId}/pages/projects`, {
    method: "POST",
    body: JSON.stringify({
      name: PROJECT_NAME,
      production_branch: "main"
    })
  });
}

async function listProjectDomains() {
  const result = await exists(
    `/accounts/${accountId}/pages/projects/${PROJECT_NAME}/domains`
  );
  return Array.isArray(result) ? result : [];
}

async function ensureProjectDomain(name, existingDomains) {
  if (existingDomains.some((domain) => domain.name === name)) {
    console.log(`Pages custom domain exists: ${name}`);
    return;
  }

  action(`add Pages custom domain ${name}`);
  if (!apply) {
    return;
  }

  await cf(`/accounts/${accountId}/pages/projects/${PROJECT_NAME}/domains`, {
    method: "POST",
    body: JSON.stringify({ name })
  });
}

async function getZone() {
  const result = await cf(`/zones?name=${encodeURIComponent(ROOT_DOMAIN)}`);
  const zone = Array.isArray(result) ? result[0] : null;

  if (!zone) {
    throw new Error(`Cloudflare zone not found for ${ROOT_DOMAIN}`);
  }

  console.log(`Zone found: ${zone.name} (${zone.id})`);
  return zone;
}

async function ensureCname(zoneId, name) {
  const encodedName = encodeURIComponent(name);
  const records = await cf(
    `/zones/${zoneId}/dns_records?type=CNAME&name=${encodedName}`
  );
  const existing = Array.isArray(records) ? records[0] : null;

  if (existing?.content === PAGES_HOST && existing.proxied === true) {
    console.log(`DNS CNAME is already correct: ${name} -> ${PAGES_HOST}`);
    return;
  }

  if (existing) {
    console.log(
      `DNS CNAME exists but differs for ${name}: ${existing.content}. Leaving it unchanged.`
    );
    return;
  }

  action(`create proxied CNAME ${name} -> ${PAGES_HOST}`);
  if (!apply) {
    return;
  }

  await cf(`/zones/${zoneId}/dns_records`, {
    method: "POST",
    body: JSON.stringify({
      type: "CNAME",
      name,
      content: PAGES_HOST,
      proxied: true,
      ttl: 1
    })
  });
}

async function main() {
  console.log(
    apply
      ? "Applying Cloudflare Pages setup."
      : "Dry run only. Add --apply to create project, domains, and DNS records."
  );
  await verifyToken();
  await ensureProject();

  const existingDomains = apply ? await listProjectDomains() : [];
  for (const domain of CUSTOM_DOMAINS) {
    await ensureProjectDomain(domain, existingDomains);
  }

  const zone = await getZone();
  for (const domain of CUSTOM_DOMAINS) {
    await ensureCname(zone.id, domain);
  }

  console.log("Cloudflare setup check complete.");
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
