package cloud

import "strings"

// fallbackDesign is the no-AI path: pick a canned reference architecture by
// keyword-matching the description. Always returns a valid, well-architected
// starter so the feature works with zero API keys.

type cannedDesign struct {
	keywords []string
	note     string
	// chain is the request path (each connects to the next); extras adds
	// side connections (e.g. cache/queue off the compute tier).
	chain  []string
	extras []GenEdge // by ref = type when types are unique in the chain
}

// Reference designs, most specific first (first keyword hit wins).
var cannedDesigns = []cannedDesign{
	{
		keywords: []string{"serverless", "lambda", "event", "function"},
		note:     "Serverless API — API Gateway fronts a Lambda function backed by DynamoDB. Scales to zero.",
		chain:    []string{"users", "apigw", "lambda", "dynamodb"},
	},
	{
		keywords: []string{"static", "spa", "single page", "frontend", "website", "blog"},
		note:     "Static/SPA hosting — CloudFront caches the frontend from S3; the client calls an API backend.",
		chain:    []string{"users", "cloudfront", "client", "apigw", "lambda", "dynamodb"},
	},
	{
		keywords: []string{"microservice", "container", "docker", "kubernetes", "ecs"},
		note:     "Containerised microservices — ALB in front of ECS/Fargate, with RDS and a Redis cache.",
		chain:    []string{"users", "waf", "alb", "ecs", "rds"},
		extras:   []GenEdge{{From: "ecs", To: "elasticache"}},
	},
	{
		keywords: []string{"queue", "worker", "async", "background", "pipeline"},
		note:     "Queue-decoupled workers — the backend enqueues to SQS; workers process asynchronously.",
		chain:    []string{"users", "alb", "backend", "sqs"},
		extras:   []GenEdge{{From: "backend", To: "rds"}},
	},
	{
		keywords: []string{"high traffic", "scale", "viral", "read heavy", "cache"},
		note:     "Scalable read-heavy web app — CDN + WAF + ALB in front of an autoscaling backend, cache-aside on RDS.",
		chain:    []string{"users", "cloudfront", "waf", "alb", "asg", "rds"},
		extras:   []GenEdge{{From: "asg", To: "elasticache"}},
	},
}

// default 3-tier when nothing matches.
var defaultCanned = cannedDesign{
	note:   "Classic 3-tier web app — load balancer → autoscaling backend → managed database, with a cache.",
	chain:  []string{"users", "alb", "backend", "rds"},
	extras: []GenEdge{{From: "backend", To: "elasticache"}},
}

func fallbackDesign(description string) GenerateResult {
	lower := strings.ToLower(description)
	chosen := defaultCanned
	for _, d := range cannedDesigns {
		for _, kw := range d.keywords {
			if strings.Contains(lower, kw) {
				chosen = d
				break
			}
		}
		if chosen.note == d.note {
			break
		}
	}

	// In canned designs each type appears once, so ref == type.
	perStage := map[int]int{}
	var nodes []GenNode
	present := map[string]bool{}
	place := func(t string) {
		if present[t] {
			return
		}
		present[t] = true
		stage := layoutStage(t)
		nodes = append(nodes, GenNode{Ref: t, Type: t, X: 120 + stage*230, Y: 110 + perStage[stage]*120})
		perStage[stage]++
	}
	for _, t := range chosen.chain {
		place(t)
	}
	for _, e := range chosen.extras {
		place(e.To)
	}

	var edges []GenEdge
	for i := 0; i < len(chosen.chain)-1; i++ {
		edges = append(edges, GenEdge{From: chosen.chain[i], To: chosen.chain[i+1]})
	}
	edges = append(edges, chosen.extras...)

	return GenerateResult{Source: "template", Note: chosen.note, Nodes: nodes, Edges: edges}
}
