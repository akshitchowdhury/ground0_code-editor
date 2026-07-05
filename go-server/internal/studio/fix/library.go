package fix

import "strings"

// Curated fixes for the most common findings, matched by keyword in the
// finding title. This is the zero-API-key fallback — hand-written so it's
// always accurate, if less tailored than the LLM path.
type libEntry struct {
	keywords    []string
	explanation string
	steps       []string
	snippet     string
	language    string
}

var cloudLibrary = []libEntry{
	{
		keywords:    []string{"not encrypted", "encryption"},
		explanation: "Encryption at rest is a one-click, no-downside setting expected for anything storing data — enable it with a KMS key.",
		steps:       []string{"Open the resource's config and turn on encryption at rest (KMS).", "Use a customer-managed KMS key if you need audit/rotation control.", "For existing unencrypted data, create an encrypted snapshot/copy and cut over."},
		snippet:     "resource \"aws_db_instance\" \"main\" {\n  storage_encrypted = true\n  kms_key_id        = aws_kms_key.data.arn\n}",
		language:    "hcl",
	},
	{
		keywords:    []string{"public bucket", "public access"},
		explanation: "A public S3 bucket exposes your objects to the whole internet. Block public access and serve files through CloudFront instead.",
		steps:       []string{"Enable 'Block all public access' on the bucket.", "Serve files via CloudFront with an Origin Access Identity/Control.", "Grant the CDN read access with a bucket policy scoped to it."},
		snippet:     "resource \"aws_s3_bucket_public_access_block\" \"b\" {\n  bucket                  = aws_s3_bucket.assets.id\n  block_public_acls       = true\n  block_public_policy     = true\n  ignore_public_acls      = true\n  restrict_public_buckets = true\n}",
		language:    "hcl",
	},
	{
		keywords:    []string{"web application firewall", "no waf"},
		explanation: "A WAF filters common web exploits (SQLi, XSS) and abusive traffic before it reaches your load balancer or API.",
		steps:       []string{"Add a WAF component in front of your public entry point.", "Attach the AWS managed rule groups (Common, Known Bad Inputs).", "Add rate-based rules to blunt abusive traffic."},
		snippet:     "",
		language:    "",
	},
	{
		keywords:    []string{"multi-az", "single point of failure", "no load balancer"},
		explanation: "A single instance or single-AZ database is a single point of failure. Spread compute across AZs behind a load balancer and enable Multi-AZ on the database.",
		steps:       []string{"Put compute in an Auto Scaling Group across ≥2 AZs behind a load balancer.", "Enable Multi-AZ on the database for automatic failover.", "Health-check targets so the LB routes around a failed instance."},
		snippet:     "resource \"aws_db_instance\" \"main\" {\n  multi_az = true\n}",
		language:    "hcl",
	},
	{
		keywords:    []string{"automated backups", "no backups"},
		explanation: "Without automated backups a failure means permanent data loss. Enable snapshots + point-in-time recovery.",
		steps:       []string{"Set a backup retention window (e.g. 7–35 days).", "Confirm point-in-time recovery is on.", "Periodically test a restore — an untested backup isn't a backup."},
		snippet:     "resource \"aws_db_instance\" \"main\" {\n  backup_retention_period = 7\n}",
		language:    "hcl",
	},
	{
		keywords:    []string{"over-privileged", "iam"},
		explanation: "An admin/wildcard IAM policy violates least privilege — a compromised instance could do anything. Scope the role to only what it needs.",
		steps:       []string{"Replace the wildcard policy with an explicit allow-list of actions.", "Scope each action to specific resource ARNs.", "Use IAM Access Analyzer to right-size from observed usage."},
		snippet:     "{\n  \"Effect\": \"Allow\",\n  \"Action\": [\"s3:GetObject\"],\n  \"Resource\": \"arn:aws:s3:::my-bucket/*\"\n}",
		language:    "json",
	},
	{
		keywords:    []string{"nat gateway", "private subnet"},
		explanation: "Private-subnet compute can't reach the internet for OS patches or third-party APIs without a NAT gateway (or VPC endpoints) for outbound-only access.",
		steps:       []string{"Add a NAT gateway in a public subnet.", "Route the private subnets' 0.0.0.0/0 through the NAT.", "For AWS-only traffic, prefer VPC endpoints to avoid NAT data charges."},
		snippet:     "",
		language:    "",
	},
	{
		keywords:    []string{"cache has no database", "caching layer", "no cache"},
		explanation: "A cache is volatile and can't be the system of record. Put a database behind it (cache-aside) so reads are fast but data is durable.",
		steps:       []string{"Add a database as the source of truth.", "Wire the app to check the cache first, fall back to the DB on a miss, then populate the cache.", "Set a sensible TTL and an eviction policy."},
		snippet:     "",
		language:    "",
	},
	{
		keywords:    []string{"plain http", "https"},
		explanation: "Traffic entering over port 80 sends data in the clear. Serve over HTTPS and redirect HTTP to it.",
		steps:       []string{"Terminate TLS (443) at the load balancer / CDN.", "Add an HTTP→HTTPS redirect listener on port 80.", "Use an ACM certificate for the domain."},
		snippet:     "",
		language:    "",
	},
	{
		keywords:    []string{"directly internet-facing", "exposed to the internet", "queried directly"},
		explanation: "Compute and data tiers shouldn't be directly internet-facing. Put a load balancer / API gateway in front and keep the tier in a private subnet.",
		steps:       []string{"Move the tier into a private subnet.", "Front it with a load balancer or API gateway.", "Restrict its security group to accept traffic only from that front door."},
		snippet:     "",
		language:    "",
	},
	{
		keywords:    []string{"illogical connection", "backwards", "invalid"},
		explanation: "This wiring breaks the canonical request path (Web → Security → Load Balancer → Compute → Data). Rewire the tiers in order.",
		steps:       []string{"Remove the offending connection.", "Route requests forward through the tiers, never backwards.", "Data tiers should be reached from compute, never the other way around."},
		snippet:     "",
		language:    "",
	},
}

var agentLibrary = []libEntry{
	{
		keywords:    []string{"no agent or llm"},
		explanation: "Every agentic system needs a reasoning model. Add an Agent (looping) or LLM (single-shot).",
		steps:       []string{"Drop an Agent or LLM onto the canvas.", "Wire User → Agent → Response.", "Add a system prompt to steer it."},
	},
	{
		keywords:    []string{"step limit", "no maximum"},
		explanation: "An agent loop with no step cap can run forever and burn unbounded tokens. Set a max-step (recursion) limit.",
		steps:       []string{"Set the agent's max steps to a bounded value (typically 4–10).", "Add a fallback response when the limit is hit."},
		snippet:     "agent = Agent(model=model, tools=tools, max_steps=8)",
		language:    "python",
	},
	{
		keywords:    []string{"human approval", "human"},
		explanation: "An irreversible / side-effecting tool must have a human in the loop. Gate it behind an approval step.",
		steps:       []string{"Route the risky tool through a Human-in-the-loop node.", "Pause for approval before the action runs.", "Log who approved what, for auditability."},
	},
	{
		keywords:    []string{"guardrail"},
		explanation: "Untrusted input straight to the model is a prompt-injection risk. Add input/output guardrails.",
		steps:       []string{"Add a Guardrails node between the user and the agent.", "Enable prompt-injection / jailbreak filtering and PII redaction.", "Validate the output schema before returning it."},
	},
	{
		keywords:    []string{"unsandboxed", "code"},
		explanation: "Model-written code must run isolated — no host filesystem, secrets, or network. Enable sandboxing.",
		steps:       []string{"Run code tools in an isolated sandbox (container / microVM).", "Drop network + filesystem access unless explicitly needed.", "Set CPU/memory/time limits."},
	},
	{
		keywords:    []string{"vector database", "rag", "retrieval", "knowledge source"},
		explanation: "The RAG pipeline is incomplete. Knowledge must flow: Knowledge → Embedder → Vector DB → Retriever → Agent.",
		steps:       []string{"Add an Embedder and a Vector DB.", "Index your documents into the Vector DB offline.", "Wire a Retriever from the Vector DB to the Agent."},
	},
	{
		keywords:    []string{"fine-tuning", "fine-tune"},
		explanation: "Fine-tuning teaches style/format, not facts. To add knowledge, use RAG instead.",
		steps:       []string{"For knowledge, build a RAG pipeline (Embedder → Vector DB → Retriever).", "Reserve fine-tuning for output style/format with hundreds+ labeled examples."},
	},
	{
		keywords:    []string{"eval", "test set"},
		explanation: "Without a fixed eval set you can't measure quality or catch regressions. Add one.",
		steps:       []string{"Add an Eval node with a fixed set of representative test cases.", "Score the agent before each deploy.", "Track the score over time to catch regressions."},
	},
	{
		keywords:    []string{"observability", "tracing"},
		explanation: "Add tracing so you can debug runs and control spend in production.",
		steps:       []string{"Add an Observability/Tracing node wired to the agent.", "Record each run's steps, tool calls, tokens, cost and latency.", "Alert on cost/latency spikes."},
	},
	{
		keywords:    []string{"system prompt"},
		explanation: "A system prompt is the cheapest lever on behaviour — define the agent's role, rules and output format.",
		steps:       []string{"Add a Prompt node wired to the agent.", "Specify role, constraints, tone and output format.", "Iterate on it before reaching for fine-tuning."},
	},
	{
		keywords:    []string{"invalid wiring"},
		explanation: "This connection isn't valid in an agent pipeline. Rewire it through the right intermediate node.",
		steps:       []string{"Remove the invalid connection.", "Knowledge reaches the model through the RAG pipeline, not directly.", "Nothing flows out of the Response; nothing flows into the User."},
	},
}

func libraryFix(f Finding) Result {
	lib := cloudLibrary
	if f.Studio == "agent" {
		lib = agentLibrary
	}
	title := strings.ToLower(f.Title)
	for _, e := range lib {
		for _, kw := range e.keywords {
			if strings.Contains(title, kw) {
				steps := e.steps
				if steps == nil {
					steps = []string{}
				}
				return Result{Explanation: e.explanation, Steps: steps, Snippet: e.snippet, Language: e.language, Source: "library"}
			}
		}
	}
	// Generic fallback — echo the finding's own guidance as the explanation.
	return Result{
		Explanation: f.Detail,
		Steps:       []string{"Address the issue described above, then re-run the review to confirm it clears."},
		Source:      "library",
	}
}
