// Package exams ports server/exams.js (catalog + offline question bank) and
// server/ai.js (Anthropic-backed generation/feedback) to Go.
package exams

// Exam mirrors an entry in server/exams.js's EXAM_TYPES.
type Exam struct {
	ID      string            `json:"id"`
	Name    string            `json:"name"`
	Short   string            `json:"short"`
	Style   string            `json:"style"`
	Domains []string          `json:"domains"`
	Advice  map[string]string `json:"-"`
}

var ExamTypes = map[string]Exam{
	"ccp": {
		ID:    "ccp",
		Name:  "AWS Certified Cloud Practitioner",
		Short: "Cloud Practitioner",
		Style: "foundational AWS knowledge questions in the style of the CLF-C02 exam: cloud value proposition, core services, security responsibility, and billing",
		Domains: []string{
			"Cloud Concepts",
			"Security & Compliance",
			"Cloud Technology & Services",
			"Billing, Pricing & Support",
		},
		Advice: map[string]string{
			"Cloud Concepts":              "Revisit the six advantages of cloud computing and the differences between IaaS, PaaS and SaaS.",
			"Security & Compliance":       "Study the AWS Shared Responsibility Model and IAM basics — users, groups, roles and policies.",
			"Cloud Technology & Services": "Build a mental map of core services: EC2, S3, RDS, Lambda, VPC, CloudFront and where each fits.",
			"Billing, Pricing & Support":  "Compare On-Demand vs Reserved vs Spot pricing, and learn what each AWS Support plan includes.",
		},
	},
	"saa": {
		ID:    "saa",
		Name:  "AWS Solutions Architect Associate",
		Short: "Solutions Architect",
		Style: "scenario-based architecture questions in the style of the SAA-C03 exam: a short business/technical scenario followed by a question about the best AWS design choice",
		Domains: []string{
			"Design Secure Architectures",
			"Design Resilient Architectures",
			"Design High-Performing Architectures",
			"Design Cost-Optimized Architectures",
		},
		Advice: map[string]string{
			"Design Secure Architectures":          "Focus on IAM policies, security groups vs NACLs, KMS encryption options and VPC isolation patterns.",
			"Design Resilient Architectures":       "Review multi-AZ vs multi-region, Auto Scaling, ELB health checks, SQS decoupling and RDS failover.",
			"Design High-Performing Architectures": "Compare caching layers (CloudFront, ElastiCache), storage performance tiers and database read scaling.",
			"Design Cost-Optimized Architectures":  "Learn S3 storage classes and lifecycle rules, EC2 purchasing options and serverless cost models.",
		},
	},
	"devops": {
		ID:    "devops",
		Name:  "DevOps / Cloud Engineer Interview",
		Short: "DevOps Interview",
		Style: "realistic interview scenario questions for a mid-level DevOps / cloud engineer role: each question describes a practical situation (broken pipeline, container issue, infra change, incident) and asks what the engineer should do",
		Domains: []string{
			"CI/CD Pipelines",
			"Containers & Docker",
			"Infrastructure as Code",
			"Networking & Cloud",
			"Monitoring & Incidents",
		},
		Advice: map[string]string{
			"CI/CD Pipelines":        "Practice explaining pipeline stages (build, test, deploy), rollback strategies and blue/green vs canary releases.",
			"Containers & Docker":    "Rebuild your Docker fundamentals: images vs containers, layers, Dockerfiles, registries and networking.",
			"Infrastructure as Code": "Get hands-on with Terraform: state, plan/apply workflow, modules and handling drift.",
			"Networking & Cloud":     "Drill subnetting/CIDR, DNS resolution, load balancing and VPC design — common rapid-fire interview topics.",
			"Monitoring & Incidents": "Review the difference between metrics, logs and traces, alerting strategy and how to run a blameless postmortem.",
		},
	},
}
