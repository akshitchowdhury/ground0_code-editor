// Package model holds the shared Node/Edge graph shapes the studio engines
// (Phase 2) operate on. Fields are tolerant of the loosely-shaped JSON the
// frontend already sends (src/data/cloud/components.js nodes carry a mutable
// free-form `config` bag), so unknown/missing keys never fail decoding.
package model

// Node mirrors a dropped component in the Cloud/Agent studio canvas.
type Node struct {
	ID             string         `json:"id"`
	Type           string         `json:"type"`
	Kind           string         `json:"kind"`
	Label          string         `json:"label,omitempty"`
	Name           string         `json:"name,omitempty"`
	Tier           string         `json:"tier,omitempty"`
	Provider       string         `json:"provider,omitempty"`
	Icon           string         `json:"icon,omitempty"`
	Ports          []int          `json:"ports,omitempty"`
	OpenToInternet bool           `json:"openToInternet,omitempty"`
	Config         map[string]any `json:"config,omitempty"`
}

// DisplayName returns Label, falling back to Name, matching the JS
// `n.label || n.name` pattern used throughout analyze.js/simulate.js.
func (n Node) DisplayName() string {
	if n.Label != "" {
		return n.Label
	}
	return n.Name
}

// Edge mirrors a connection drawn between two nodes. Port is present for
// Cloud-studio edges (security-group check); Agent-studio edges are
// portless and use Label instead.
type Edge struct {
	ID    string `json:"id"`
	From  string `json:"from"`
	To    string `json:"to"`
	Port  int    `json:"port,omitempty"`
	Label string `json:"label,omitempty"`
}

// Graph is the {nodes, edges} request body shape shared by every
// /api/studio/* endpoint.
type Graph struct {
	Nodes []Node `json:"nodes"`
	Edges []Edge `json:"edges"`
}

func (g Graph) NodeByID(id string) (Node, bool) {
	for _, n := range g.Nodes {
		if n.ID == id {
			return n, true
		}
	}
	return Node{}, false
}
