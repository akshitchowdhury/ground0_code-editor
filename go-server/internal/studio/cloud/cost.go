// cost.go ports src/lib/cloud/cost.js's estimateCost. Illustrative-only
// monthly cost estimate; see specs_repo.go for where the pricing numbers
// come from.
package cloud

import (
	"context"
	"fmt"
	"sort"

	"ground0.dev/goserver/internal/model"
)

type CostItem struct {
	ID      string  `json:"id"`
	Name    string  `json:"name"`
	Icon    string  `json:"icon,omitempty"`
	Kind    string  `json:"kind"`
	Monthly float64 `json:"monthly"`
	Detail  string  `json:"detail"`
}

type CostResult struct {
	Items []CostItem `json:"items"`
	Total float64    `json:"total"`
}

func nodeMonthly(specs specsSnapshot, node model.Node, rps float64, instances float64) (float64, string) {
	reqM := rps * specs.constant("secondsPerMonth") / 1e6
	hoursPerMonth := specs.constant("hoursPerMonth")
	c := node.Config

	switch node.Kind {
	case "compute", "container":
		instanceType := configString(c, "instanceType")
		monthly := instances * specs.instanceHourly(instanceType) * hoursPerMonth
		label := instanceType
		if label == "" {
			label = "instance"
		}
		return monthly, fmt.Sprintf("%d× %s", int(instances), label)
	case "serverless":
		return reqM * specs.constant("lambdaPerMillionReq"), "pay per invocation"
	case "database":
		replicas, _ := configNumber(c, "readReplicas")
		multiAz, _ := configBool(c, "multiAz")
		azMult := 1.0
		if multiAz {
			azMult = 2
		}
		dbClass := configString(c, "dbClass")
		monthly := specs.dbHourly(dbClass) * hoursPerMonth * (azMult + replicas)
		parts := dbClass
		if parts == "" {
			parts = "db"
		}
		if multiAz {
			parts += " · Multi-AZ"
		}
		if replicas > 0 {
			suffix := "replica"
			if replicas > 1 {
				suffix = "replicas"
			}
			parts += fmt.Sprintf(" · %d %s", int(replicas), suffix)
		}
		return monthly, parts
	case "cache":
		cacheType := configString(c, "cacheType")
		label := cacheType
		if label == "" {
			label = "cache node"
		}
		return specs.cacheHourly(cacheType) * hoursPerMonth, label
	case "lb":
		return specs.constant("albMonthly") + reqM*specs.constant("albPerMillionReq"), "ALB + LCUs"
	case "gateway":
		return reqM * specs.constant("apigwPerMillionReq"), "per million requests"
	case "cdn":
		return reqM * specs.constant("cdnPerMillionReq"), "requests + transfer"
	case "client":
		return 10 + reqM*0.4, "frontend hosting + requests"
	case "waf":
		return specs.constant("wafMonthly") + reqM*specs.constant("wafPerMillionReq"), "WAF + requests"
	case "nat":
		return specs.constant("natMonthly") + reqM*specs.constant("natPerMillionReq"), "gateway + data"
	case "dns":
		return specs.constant("dnsMonthly") + reqM*specs.constant("dnsPerMillionReq"), "hosted zone + queries"
	case "storage":
		return specs.constant("s3Monthly") + reqM*specs.constant("s3PerMillionReq"), "storage + requests"
	case "queue":
		return reqM * specs.constant("sqsPerMillionReq"), "per million messages"
	default:
		return 0, "no charge"
	}
}

// EstimateCost ports src/lib/cloud/cost.js's estimateCost.
func EstimateCost(ctx context.Context, repo *SpecsRepo, nodes []model.Node, rps float64, instanceCounts map[string]int) CostResult {
	specs := loadSpecsSnapshot(ctx, repo)
	items := []CostItem{}
	for _, n := range nodes {
		if n.Kind == "internet" {
			continue
		}
		instances := 1.0
		if c, ok := instanceCounts[n.ID]; ok {
			instances = float64(c)
		} else if v, ok := configNumber(n.Config, "instances"); ok {
			instances = v
		}
		monthly, detail := nodeMonthly(specs, n, rps, instances)
		items = append(items, CostItem{ID: n.ID, Name: n.DisplayName(), Icon: n.Icon, Kind: n.Kind, Monthly: monthly, Detail: detail})
	}
	sort.Slice(items, func(i, j int) bool { return items[i].Monthly > items[j].Monthly })
	total := 0.0
	for _, it := range items {
		total += it.Monthly
	}
	return CostResult{Items: items, Total: total}
}
