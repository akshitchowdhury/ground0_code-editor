// Package cloud ports src/lib/cloud/{rules,analyze,simulate,loadtest,cost}.js
// — the Architecture Studio's rule/simulation/capacity/cost engines — to Go.
// Pure functions operating on model.Graph; no I/O except specs_repo.go's
// catalog lookups.
package cloud

import "ground0.dev/goserver/internal/model"

// Component-kind classifications, mirroring src/data/cloud/components.js.
var (
	statefulKinds    = map[string]bool{"database": true, "cache": true}
	computeKinds     = map[string]bool{"compute": true, "container": true, "serverless": true}
	publicEntryKinds = map[string]bool{"lb": true, "gateway": true, "cdn": true}
	sensitivePorts   = map[int]string{
		22: "SSH", 3389: "RDP", 3306: "MySQL", 5432: "Postgres",
		1433: "SQL Server", 27017: "MongoDB", 6379: "Redis",
	}
)

func isStateful(n model.Node) bool     { return statefulKinds[n.Kind] }
func isCompute(n model.Node) bool      { return computeKinds[n.Kind] }
func isInternetNode(n model.Node) bool { return n.Kind == "internet" }

// Coarse request-path stage per kind, used by classifyEdge's "no backwards
// flow" check. 0 web · 1 edge-security+LB · 2 compute · 3 data/storage.
var stage = map[string]int{
	"internet": 0, "client": 0,
	"dns": 1, "cdn": 1, "waf": 1, "lb": 1, "gateway": 1,
	"compute": 2, "container": 2, "serverless": 2,
	"database": 3, "cache": 3, "storage": 3,
}

var stageOf = map[string]string{
	"internet": "the web tier", "client": "the web tier",
	"dns": "the edge / security tier", "cdn": "the edge / security tier", "waf": "the edge / security tier",
	"lb": "the load-balancer tier", "gateway": "the load-balancer tier",
	"compute": "the compute tier", "container": "the compute tier", "serverless": "the compute tier",
	"queue": "the messaging tier", "database": "the data tier", "cache": "the data tier", "storage": "the storage tier",
	"nat": "an outbound NAT gateway",
}

var leafKinds = map[string]bool{"database": true, "cache": true, "storage": true}

func isLeaf(k string) bool { return leafKinds[k] }

// EdgeClassification mirrors rules.js's classifyEdge return shape.
type EdgeClassification struct {
	OK     bool   `json:"ok"`
	Level  string `json:"level"`
	Code   string `json:"code"`
	Reason string `json:"reason"`
}

// classifyEdge classifies a directed connection from → to. Ported verbatim
// from src/lib/cloud/rules.js — see that file for the full rationale
// (canonical request pipeline, NAT egress-only, data tiers as leaves, no
// backwards flow).
func classifyEdge(from, to model.Node) EdgeClassification {
	if from.ID == to.ID {
		return EdgeClassification{false, "illegal", "self", "A component cannot connect to itself."}
	}

	fk, tk := from.Kind, to.Kind
	fname, tname := from.DisplayName(), to.DisplayName()

	// NAT Gateway: outbound (egress) only.
	if tk == "nat" {
		if computeKinds[fk] {
			return EdgeClassification{true, "ok", "nat-egress",
				fname + " reaches the internet for outbound traffic (OS patches, package installs, third-party APIs) through " + tname + "."}
		}
		return EdgeClassification{false, "illegal", "nat-inbound",
			"A NAT Gateway is outbound-only. " + fname + " can't push traffic INTO " + tname + " — the internet must never reach private resources through a NAT. Route inbound requests through a load balancer / API gateway instead."}
	}
	if fk == "nat" && tk != "internet" {
		return EdgeClassification{false, "illegal", "nat-forward",
			"A NAT Gateway only provides outbound access to the internet — it does not forward requests on to " + tname + ". " + tname + " should be reached through the app tier, not the NAT."}
	}

	sf, sfOK := stage[fk]
	st, stOK := stage[tk]

	// Data tiers are leaves: they answer queries, never initiate them (two
	// data tiers in the same stage, e.g. db <-> cache, are allowed).
	if isLeaf(fk) && !(isLeaf(tk) && sfOK && stOK && sf == st) {
		return EdgeClassification{false, "illegal", "data-source",
			fname + " is a data tier — it answers queries, it doesn't call out to " + tname + ". Reverse the connection so the app / compute tier calls " + fname + "."}
	}

	// A client / the internet must never hit a data tier directly.
	if (fk == "internet" || fk == "client") && isLeaf(tk) {
		return EdgeClassification{false, "illegal", "client-to-data",
			fname + " is wired straight to " + tname + ". A frontend / client must never hold database credentials or query a data tier directly — put a backend / API tier in between."}
	}

	// Data must flow forward through the tiers, not backwards.
	if sfOK && stOK && sf > st {
		return EdgeClassification{false, "illegal", "backwards",
			"Illogical setup: data can't flow backwards. " + fname + " (" + stageOf[fk] + ") sits AFTER " + tname + " (" + stageOf[tk] + ") in the request path. Wire tiers in order — Web → Security → Load Balancer → Compute → Data."}
	}

	return EdgeClassification{true, "ok", "ok", fname + " → " + tname + "."}
}
