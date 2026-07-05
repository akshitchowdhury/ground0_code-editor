package cloud

import (
	"context"
	"strings"

	"ground0.dev/goserver/internal/llm"
)

// generate.go turns a plain-English description into a starter architecture:
// a list of catalog components + connections the frontend materializes onto
// the canvas. The LLM is constrained to the real catalog ids below; if it's
// unavailable or returns junk, a keyword-matched canned design is used, so
// the feature always produces something usable.

// GenNode is a component the frontend will drop (ref is an LLM-local id used
// only to wire edges; x/y are a pre-computed tiered layout).
type GenNode struct {
	Ref  string `json:"ref"`
	Type string `json:"type"`
	X    int    `json:"x"`
	Y    int    `json:"y"`
}

type GenEdge struct {
	From string `json:"from"`
	To   string `json:"to"`
}

type GenerateResult struct {
	Source string    `json:"source"` // "ai" | "template"
	Note   string    `json:"note"`
	Nodes  []GenNode `json:"nodes"`
	Edges  []GenEdge `json:"edges"`
}

// Catalog component ids the generator may use, with a one-line hint. Kept in
// sync with src/data/cloud/components.js (COMPONENT_CATALOG ids).
var genCatalog = []struct{ id, desc string }{
	{"users", "the public internet / end users — every design needs exactly one, it's the entry point"},
	{"route53", "managed DNS"},
	{"cloudfront", "CDN for caching static content at the edge"},
	{"waf", "web application firewall"},
	{"client", "client-side frontend / SPA that calls the backend"},
	{"alb", "application load balancer (spreads traffic across compute)"},
	{"apigw", "API gateway (managed front door for APIs / serverless)"},
	{"nat", "NAT gateway (outbound-only internet for private compute)"},
	{"firewall", "network firewall"},
	{"ec2", "a single virtual server"},
	{"backend", "an autoscaling backend / API server (the usual app tier)"},
	{"asg", "an auto scaling group of servers"},
	{"ecs", "containerised services (ECS/Fargate)"},
	{"lambda", "serverless function (pairs with apigw)"},
	{"rds", "managed relational database (Postgres/MySQL)"},
	{"dynamodb", "serverless NoSQL key-value database"},
	{"elasticache", "in-memory cache (Redis) in front of the database"},
	{"s3", "object storage for static assets / uploads"},
	{"sqs", "message queue to decouple producers from consumers"},
}

var validGenType = func() map[string]bool {
	m := map[string]bool{}
	for _, c := range genCatalog {
		m[c.id] = true
	}
	return m
}()

// tier ordering for layout — mirrors the pipeline lanes (web → edge/LB →
// compute → data). Reuses the coarse `stage` map from rules.go by type→kind.
var typeKind = map[string]string{
	"users": "internet", "route53": "dns", "cloudfront": "cdn", "waf": "waf", "client": "client",
	"alb": "lb", "apigw": "gateway", "nat": "nat", "firewall": "waf",
	"ec2": "compute", "backend": "compute", "asg": "compute", "ecs": "container", "lambda": "serverless",
	"rds": "database", "dynamodb": "database", "elasticache": "cache", "s3": "storage", "sqs": "queue",
}

func layoutStage(t string) int {
	switch typeKind[t] {
	case "internet", "client":
		return 0
	case "dns", "cdn", "waf", "lb", "gateway", "nat":
		return 1
	case "compute", "container", "serverless":
		return 2
	default: // database, cache, storage, queue
		return 3
	}
}

const genSystem = "You are a senior cloud solutions architect. You translate a plain-English app " +
	"description into a small, well-architected AWS reference design using ONLY the provided component catalog. " +
	"Favour correctness: users → (edge/security) → load balancer or api gateway → compute → data. " +
	"Keep it minimal but complete (typically 4–8 components). Always include exactly one 'users' component."

func genPrompt(description string) string {
	var cat strings.Builder
	for _, c := range genCatalog {
		cat.WriteString("- " + c.id + ": " + c.desc + "\n")
	}
	return "App to design:\n\"" + description + "\"\n\n" +
		"Available components (use these ids EXACTLY, no others):\n" + cat.String() + "\n" +
		"Respond with ONLY a JSON object of the shape " +
		`{"nodes":[{"ref":"a","type":"users"},{"ref":"b","type":"alb"}],"edges":[{"from":"a","to":"b"}],"note":"one short sentence on the design"}` +
		" — refs are your own short labels, type must be a catalog id, edges point from source ref to target ref (request direction). No markdown, no commentary."
}

type genLLMResponse struct {
	Nodes []struct {
		Ref  string `json:"ref"`
		Type string `json:"type"`
	} `json:"nodes"`
	Edges []GenEdge `json:"edges"`
	Note  string    `json:"note"`
}

// Generate produces a starter design from a description. Never errors — falls
// back to a keyword-matched template when the LLM is unavailable/invalid.
func Generate(ctx context.Context, client *llm.Client, description string) GenerateResult {
	if client.Enabled() {
		var resp genLLMResponse
		if client.GenerateInto(ctx, genSystem, genPrompt(description), &resp) {
			if result, ok := materialize(resp); ok {
				return result
			}
		}
	}
	return fallbackDesign(description)
}

// materialize validates the LLM spec against the catalog, drops unknown
// types + dangling edges, and lays nodes out in tiered columns. Returns
// (_, false) if nothing usable survived (→ caller uses the fallback).
func materialize(resp genLLMResponse) (GenerateResult, bool) {
	seenRef := map[string]bool{}
	perStage := map[int]int{}
	var nodes []GenNode
	valid := map[string]bool{}
	for _, n := range resp.Nodes {
		if !validGenType[n.Type] || n.Ref == "" || seenRef[n.Ref] {
			continue
		}
		seenRef[n.Ref] = true
		valid[n.Ref] = true
		stage := layoutStage(n.Type)
		nodes = append(nodes, GenNode{
			Ref: n.Ref, Type: n.Type,
			X: 120 + stage*230, Y: 110 + perStage[stage]*120,
		})
		perStage[stage]++
	}
	if len(nodes) == 0 {
		return GenerateResult{}, false
	}
	var edges []GenEdge
	seenEdge := map[string]bool{}
	for _, e := range resp.Edges {
		key := e.From + "->" + e.To
		if !valid[e.From] || !valid[e.To] || e.From == e.To || seenEdge[key] {
			continue
		}
		seenEdge[key] = true
		edges = append(edges, e)
	}
	note := strings.TrimSpace(resp.Note)
	if note == "" {
		note = "Generated from your description — review and tweak, then run the flow."
	}
	if edges == nil {
		edges = []GenEdge{}
	}
	return GenerateResult{Source: "ai", Note: note, Nodes: nodes, Edges: edges}, true
}
