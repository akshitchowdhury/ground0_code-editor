// Networking Fundamentals — lessons with interactive flow boards.
// Block format matches src/data/tutorials (LessonContent renders it).

export default [
  {
    id: 'how-data-travels',
    title: 'How Data Travels the Internet',
    summary: 'Packets, IP addresses and the hop-by-hop journey of a request.',
    blocks: [
      {
        type: 'p',
        text: 'When you open a website, your data does not travel as one big blob. It is chopped into small **packets**, each stamped with a source and destination **IP address** — like envelopes with a to/from address.',
      },
      {
        type: 'list',
        items: [
          '**IP address** — a unique number identifying a device on a network, e.g. `142.250.72.46`.',
          '**Packet** — a small chunk of your data plus addressing headers.',
          '**Router** — a device that reads the destination IP and forwards the packet one hop closer.',
          '**Port** — which application on the machine should get the data (`80`/`443` for web).',
        ],
      },
      { type: 'h3', text: 'Hop by hop' },
      {
        type: 'p',
        text: 'No single device knows the whole path. Each router only knows the **next hop**. Packets may even take different routes and are reassembled in order at the destination — that is what makes the internet resilient.',
      },
      {
        type: 'p',
        text: 'Press **Play** on the board to follow an HTTP request from your laptop to a web server and back.',
      },
    ],
    flow: {
      title: 'Journey of an HTTP request',
      w: 760,
      h: 330,
      nodes: [
        { id: 'laptop', x: 20, y: 130, icon: '💻', label: 'Your laptop', sub: '192.168.1.7' },
        { id: 'router', x: 200, y: 40, icon: '📶', label: 'Home router', sub: 'NAT gateway' },
        { id: 'isp', x: 380, y: 130, icon: '🏢', label: 'ISP network', sub: 'regional routers' },
        { id: 'backbone', x: 200, y: 230, icon: '🌐', label: 'Internet backbone', sub: 'many hops' },
        { id: 'server', x: 590, y: 130, icon: '🖥️', label: 'Web server', sub: '142.250.72.46:443' },
      ],
      edges: [
        { from: 'laptop', to: 'router' },
        { from: 'router', to: 'isp' },
        { from: 'laptop', to: 'backbone', dashed: true, label: 'alt. route' },
        { from: 'backbone', to: 'isp', dashed: true },
        { from: 'isp', to: 'server' },
      ],
      steps: [
        {
          from: 'laptop',
          to: 'router',
          packet: 'GET /index.html',
          text: 'Your browser splits the request into packets. Each packet carries source IP 192.168.1.7 and destination IP 142.250.72.46, and leaves via your home router.',
        },
        {
          from: 'router',
          to: 'isp',
          packet: 'src: your public IP',
          text: 'The router applies NAT — it swaps your private address for your public IP so the reply can find its way home — and forwards the packet to your ISP.',
        },
        {
          from: 'isp',
          to: 'server',
          packet: 'dst: 142.250.72.46',
          text: 'ISP routers look up the destination in their routing tables and pass the packet hop by hop across the backbone until it reaches the server’s network.',
        },
        {
          from: 'server',
          to: 'isp',
          packet: '200 OK + HTML',
          reverse: false,
          text: 'The server answers. The response is itself split into packets, each addressed back to your public IP.',
        },
        {
          from: 'isp',
          to: 'router',
          packet: 'packets 1..n',
          text: 'Packets may arrive out of order or take different routes — TCP sequence numbers let your machine reassemble them correctly.',
        },
        {
          from: 'router',
          to: 'laptop',
          packet: 'reassembled page',
          text: 'The router translates the public address back to 192.168.1.7 (NAT table) and your browser renders the page. Total round trip: often under 100 ms.',
        },
      ],
    },
  },

  {
    id: 'osi-model',
    title: 'The OSI Model',
    summary: 'Seven layers, one mental model for every network conversation.',
    blocks: [
      {
        type: 'p',
        text: 'The **OSI model** splits networking into 7 layers, each with one job. Data is **encapsulated** going down the sender’s stack (each layer wraps it with a header) and **decapsulated** going up the receiver’s stack.',
      },
      {
        type: 'list',
        items: [
          '**7 Application** — HTTP, DNS, SSH: what apps speak.',
          '**6 Presentation** — encryption (TLS), encoding, compression.',
          '**5 Session** — keeping conversations alive.',
          '**4 Transport** — TCP/UDP: ports, reliability, ordering (*segments*).',
          '**3 Network** — IP: addressing and routing (*packets*).',
          '**2 Data Link** — Ethernet/Wi-Fi: MAC addresses (*frames*).',
          '**1 Physical** — cables, radio, light (*bits*).',
        ],
      },
      { type: 'h3', text: 'Why it matters' },
      {
        type: 'p',
        text: 'Engineers debug by layer: "is it a layer 1 problem (cable) or layer 3 (routing) or layer 7 (app bug)?" Load balancers are described as **L4** or **L7**, firewalls filter at **L3/L4** — the vocabulary is everywhere.',
      },
      {
        type: 'p',
        text: 'The board shows a simplified 4-stop stack on each side. Watch the data get wrapped on the way down and unwrapped on the way up.',
      },
    ],
    flow: {
      title: 'Encapsulation across the stack',
      w: 760,
      h: 420,
      nodes: [
        { id: 'app1', x: 60, y: 20, icon: '🟦', label: 'Application', sub: 'HTTP request' },
        { id: 'tcp1', x: 60, y: 115, icon: '🟩', label: 'Transport', sub: 'TCP segment :443' },
        { id: 'ip1', x: 60, y: 210, icon: '🟨', label: 'Network', sub: 'IP packet' },
        { id: 'eth1', x: 60, y: 305, icon: '🟧', label: 'Link / Physical', sub: 'Ethernet frame' },
        { id: 'wire', x: 316, y: 305, icon: '〰️', label: 'The wire', sub: 'bits / radio / light' },
        { id: 'eth2', x: 572, y: 305, icon: '🟧', label: 'Link / Physical', sub: 'frame received' },
        { id: 'ip2', x: 572, y: 210, icon: '🟨', label: 'Network', sub: 'IP unwrapped' },
        { id: 'tcp2', x: 572, y: 115, icon: '🟩', label: 'Transport', sub: 'segments reassembled' },
        { id: 'app2', x: 572, y: 20, icon: '🟦', label: 'Application', sub: 'server app' },
      ],
      edges: [
        { from: 'app1', to: 'tcp1' },
        { from: 'tcp1', to: 'ip1' },
        { from: 'ip1', to: 'eth1' },
        { from: 'eth1', to: 'wire' },
        { from: 'wire', to: 'eth2' },
        { from: 'eth2', to: 'ip2' },
        { from: 'ip2', to: 'tcp2' },
        { from: 'tcp2', to: 'app2' },
      ],
      steps: [
        {
          from: 'app1',
          to: 'tcp1',
          packet: 'data',
          text: 'L7→L4: the application hands its data (an HTTP request) to the transport layer, which adds a TCP header with source/destination ports — now it is a segment.',
        },
        {
          from: 'tcp1',
          to: 'ip1',
          packet: '[TCP|data]',
          text: 'L4→L3: the network layer wraps the segment in an IP header carrying source and destination IP addresses — now it is a packet.',
        },
        {
          from: 'ip1',
          to: 'eth1',
          packet: '[IP|TCP|data]',
          text: 'L3→L2: the link layer adds MAC addresses for the next physical hop — now it is a frame.',
        },
        {
          from: 'eth1',
          to: 'wire',
          packet: '[ETH|IP|TCP|data]',
          text: 'L1: the frame is converted to raw bits — electrical signals, light pulses or radio waves.',
        },
        {
          from: 'wire',
          to: 'eth2',
          packet: '0101100111…',
          text: 'The bits cross the physical medium. Every router along the way unwraps to L3, reads the IP destination, and re-wraps for the next hop.',
        },
        {
          from: 'eth2',
          to: 'ip2',
          packet: '[IP|TCP|data]',
          text: 'The receiver’s link layer validates the frame and strips the Ethernet header.',
        },
        {
          from: 'ip2',
          to: 'tcp2',
          packet: '[TCP|data]',
          text: 'The network layer confirms "this packet is for me" and strips the IP header. TCP reorders segments and acknowledges receipt.',
        },
        {
          from: 'tcp2',
          to: 'app2',
          packet: 'data',
          text: 'The original application data arrives at the server process listening on port 443 — the exact bytes the sender’s app produced.',
        },
      ],
    },
  },

  {
    id: 'dns',
    title: 'DNS — The Internet’s Phonebook',
    summary: 'How example.com becomes an IP address in milliseconds.',
    blocks: [
      {
        type: 'p',
        text: 'Computers route by IP address, humans remember names. **DNS** (Domain Name System) translates `www.example.com` into `93.184.216.34` using a distributed hierarchy of servers — no single machine holds the whole map.',
      },
      {
        type: 'list',
        items: [
          '**Recursive resolver** — your ISP’s (or `8.8.8.8` / `1.1.1.1`) lookup servant; does the legwork and caches results.',
          '**Root servers** — know who runs each TLD (`.com`, `.org`, `.dev`).',
          '**TLD servers** — know which nameservers are authoritative for each domain.',
          '**Authoritative nameserver** — holds the actual records for the domain.',
        ],
      },
      { type: 'h3', text: 'Record types you will meet' },
      {
        type: 'list',
        items: [
          '`A` / `AAAA` — name → IPv4 / IPv6 address.',
          '`CNAME` — name → another name (alias).',
          '`MX` — mail servers. `TXT` — verification, SPF.',
          '**TTL** — how long answers may be cached.',
        ],
      },
      {
        type: 'p',
        text: 'Caching makes DNS fast: most lookups never leave your resolver. Play the board to see the full cold-cache resolution.',
      },
    ],
    flow: {
      title: 'DNS resolution for www.example.com',
      w: 760,
      h: 400,
      nodes: [
        { id: 'browser', x: 20, y: 160, icon: '🧑‍💻', label: 'Browser', sub: 'wants example.com' },
        { id: 'resolver', x: 230, y: 160, icon: '🔎', label: 'Recursive resolver', sub: '8.8.8.8 (caches)' },
        { id: 'root', x: 470, y: 20, icon: '🌱', label: 'Root server', sub: '"ask .com"' },
        { id: 'tld', x: 560, y: 160, icon: '🏷️', label: '.com TLD server', sub: '"ask ns1.example"' },
        { id: 'auth', x: 470, y: 300, icon: '📒', label: 'Authoritative NS', sub: 'ns1.example.com' },
        { id: 'web', x: 20, y: 300, icon: '🖥️', label: 'Web server', sub: '93.184.216.34' },
      ],
      edges: [
        { from: 'browser', to: 'resolver', label: 'query' },
        { from: 'resolver', to: 'root' },
        { from: 'resolver', to: 'tld' },
        { from: 'resolver', to: 'auth' },
        { from: 'browser', to: 'web', dashed: true, label: 'then: HTTP' },
      ],
      steps: [
        {
          from: 'browser',
          to: 'resolver',
          packet: 'A www.example.com?',
          text: 'The browser checks its own cache, then asks the recursive resolver. If the resolver has a cached answer (within TTL), the journey ends right here.',
        },
        {
          from: 'resolver',
          to: 'root',
          packet: 'who handles .com?',
          text: 'Cold cache: the resolver asks a root server. Root servers don’t know example.com — but they know who runs the .com TLD.',
        },
        {
          from: 'root',
          to: 'resolver',
          packet: 'NS for .com',
          text: 'The root replies with a referral: "ask the .com TLD servers".',
        },
        {
          from: 'resolver',
          to: 'tld',
          packet: 'example.com?',
          text: 'The resolver asks the .com TLD server, which knows the authoritative nameservers for every .com domain.',
        },
        {
          from: 'tld',
          to: 'resolver',
          packet: 'NS ns1.example.com',
          text: 'Another referral: "example.com is served by ns1.example.com".',
        },
        {
          from: 'resolver',
          to: 'auth',
          packet: 'A www.example.com?',
          text: 'Finally the resolver asks the authoritative nameserver — the source of truth that the domain owner controls (this is what you edit in Route 53 / Cloudflare).',
        },
        {
          from: 'auth',
          to: 'resolver',
          packet: 'A 93.184.216.34, TTL 300',
          text: 'The authoritative server returns the A record. The resolver caches it for the TTL (300s here) so the next lookup is instant.',
        },
        {
          from: 'resolver',
          to: 'browser',
          packet: '93.184.216.34',
          text: 'The resolver passes the answer back. The whole chain typically takes 20–120 ms — and ~0 ms when cached.',
        },
        {
          from: 'browser',
          to: 'web',
          packet: 'TCP + TLS + HTTP',
          text: 'Now that the browser has an IP, it opens a TCP connection and sends the actual HTTP request. DNS’s job is done.',
        },
      ],
    },
  },

  {
    id: 'cidr-subnets',
    title: 'CIDR & Subnetting',
    summary: 'Slicing IP space: what 10.0.0.0/16 actually means.',
    blocks: [
      {
        type: 'p',
        text: '**CIDR notation** (`10.0.0.0/16`) describes a block of IP addresses. The `/16` says: the first 16 bits are the **network prefix** (fixed), the remaining bits are for **hosts**.',
      },
      {
        type: 'code',
        text: '10.0.0.0/16  → 65,536 addresses (10.0.0.0 – 10.0.255.255)\n10.0.1.0/24  →    256 addresses (10.0.1.0 – 10.0.1.255)\n10.0.1.0/28  →     16 addresses\n\nRule: addresses = 2^(32 - prefix)\nAWS reserves 5 per subnet → /24 has 251 usable',
      },
      { type: 'h3', text: 'Subnets' },
      {
        type: 'p',
        text: 'A **subnet** is a slice of a bigger block. In the cloud you typically carve a VPC (`10.0.0.0/16`) into subnets per availability zone and per tier — public subnets for load balancers, private subnets for apps and databases.',
      },
      {
        type: 'list',
        items: [
          'Private ranges: `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`.',
          'Routers pick the route with the **longest matching prefix**.',
          '`0.0.0.0/0` means "everything" — the default route to the internet.',
        ],
      },
      {
        type: 'p',
        text: 'The board shows a router deciding where to send three different packets using its route table.',
      },
    ],
    flow: {
      title: 'Longest-prefix routing inside a VPC (10.0.0.0/16)',
      w: 760,
      h: 400,
      nodes: [
        { id: 'pkt', x: 20, y: 160, icon: '✉️', label: 'Incoming packet', sub: 'three destinations' },
        { id: 'rtr', x: 250, y: 160, icon: '🧭', label: 'Router', sub: 'route table' },
        { id: 'web', x: 540, y: 20, icon: '🌍', label: 'Public subnet', sub: '10.0.1.0/24' },
        { id: 'db', x: 540, y: 160, icon: '🗄️', label: 'DB subnet', sub: '10.0.2.0/24' },
        { id: 'inet', x: 540, y: 300, icon: '🌐', label: 'Internet', sub: 'via 0.0.0.0/0 → IGW' },
      ],
      edges: [
        { from: 'pkt', to: 'rtr' },
        { from: 'rtr', to: 'web', label: '10.0.1.0/24' },
        { from: 'rtr', to: 'db', label: '10.0.2.0/24' },
        { from: 'rtr', to: 'inet', label: '0.0.0.0/0' },
      ],
      steps: [
        {
          from: 'pkt',
          to: 'rtr',
          packet: 'dst 10.0.1.37',
          text: 'Packet #1 arrives addressed to 10.0.1.37. The router compares the destination against every route, looking for the longest prefix that matches.',
        },
        {
          from: 'rtr',
          to: 'web',
          packet: '10.0.1.37 ∈ /24 ✓',
          text: '10.0.1.37 matches 10.0.1.0/24 (first 24 bits equal). That is more specific than 0.0.0.0/0, so the packet goes to the public subnet.',
        },
        {
          from: 'pkt',
          to: 'rtr',
          packet: 'dst 10.0.2.205',
          text: 'Packet #2 is addressed to 10.0.2.205 — the database tier.',
        },
        {
          from: 'rtr',
          to: 'db',
          packet: '10.0.2.205 ∈ /24 ✓',
          text: 'It matches 10.0.2.0/24, so it is delivered to the DB subnet. Security groups still decide whether it is *allowed* in — routing ≠ permission.',
        },
        {
          from: 'pkt',
          to: 'rtr',
          packet: 'dst 142.250.72.46',
          text: 'Packet #3 is addressed to a public internet IP. No specific route matches…',
        },
        {
          from: 'rtr',
          to: 'inet',
          packet: 'default route',
          text: '…so the default route 0.0.0.0/0 wins (it matches everything, with the shortest prefix — the fallback). The packet exits via the Internet Gateway.',
        },
      ],
    },
  },

  {
    id: 'vpn',
    title: 'VPNs — Private Tunnels Over Public Wires',
    summary: 'Encrypted tunnels: how remote workers reach private networks safely.',
    blocks: [
      {
        type: 'p',
        text: 'A **VPN** (Virtual Private Network) builds an **encrypted tunnel** between you and a trusted gateway, across the untrusted public internet. Anyone watching the traffic sees only ciphertext between two endpoints.',
      },
      {
        type: 'list',
        items: [
          '**Remote-access VPN** — a laptop joins the company network (WireGuard, OpenVPN).',
          '**Site-to-site VPN** — an office network connects to a cloud VPC (e.g. AWS Site-to-Site VPN).',
          '**Encapsulation** — the original packet (with private IPs) is encrypted and wrapped inside a new packet with public IPs.',
        ],
      },
      { type: 'h3', text: 'What a VPN does and does not do' },
      {
        type: 'list',
        items: [
          'Does: hide traffic contents and private addresses from the path; give you an address inside the private network.',
          'Does not: make you anonymous to the VPN provider, or protect data after it leaves the tunnel.',
        ],
      },
      {
        type: 'p',
        text: 'Watch the board: the coffee-shop snooper only ever sees encrypted bytes.',
      },
    ],
    flow: {
      title: 'Remote-access VPN tunnel',
      w: 760,
      h: 400,
      nodes: [
        { id: 'laptop', x: 20, y: 100, icon: '💻', label: 'Laptop (café)', sub: 'VPN client' },
        { id: 'snoop', x: 250, y: 280, icon: '🕵️', label: 'Snooper', sub: 'public Wi-Fi', danger: true },
        { id: 'inet', x: 250, y: 100, icon: '🌐', label: 'Public internet', sub: 'untrusted path' },
        { id: 'gw', x: 480, y: 100, icon: '🛡️', label: 'VPN gateway', sub: 'company edge' },
        { id: 'srv', x: 620, y: 280, icon: '🗄️', label: 'Internal app', sub: '10.8.0.20 (private)' },
      ],
      edges: [
        { from: 'laptop', to: 'inet', label: 'encrypted tunnel' },
        { from: 'inet', to: 'gw' },
        { from: 'snoop', to: 'inet', dashed: true, label: 'sniffing' },
        { from: 'gw', to: 'srv', label: 'private LAN' },
      ],
      steps: [
        {
          from: 'laptop',
          to: 'inet',
          packet: 'handshake 🔑',
          text: 'The VPN client authenticates to the gateway and they agree on session keys (e.g. WireGuard’s Noise handshake). The laptop receives a private address like 10.8.0.55.',
        },
        {
          from: 'laptop',
          to: 'inet',
          packet: '🔒 [encrypted]',
          text: 'The app sends a request to internal server 10.8.0.20. The VPN encrypts that whole packet and wraps it in a new public packet addressed to the gateway.',
        },
        {
          from: 'snoop',
          to: 'inet',
          packet: '???',
          danger: true,
          text: 'The snooper on the café Wi-Fi captures the traffic — and sees only ciphertext between your laptop and one gateway IP. No URLs, no contents, no internal addresses.',
        },
        {
          from: 'inet',
          to: 'gw',
          packet: '🔒 → decrypt',
          text: 'The gateway authenticates the packet, decrypts it, and recovers the original inner packet: "10.8.0.55 → 10.8.0.20".',
        },
        {
          from: 'gw',
          to: 'srv',
          packet: '10.8.0.55 → :8080',
          text: 'The inner packet is released onto the private network. To the internal app, your laptop looks like any local machine.',
        },
        {
          from: 'srv',
          to: 'gw',
          packet: 'response',
          text: 'The response flows back: encrypted at the gateway, carried over the tunnel, decrypted on your laptop. Private conversation, public wires.',
        },
      ],
    },
  },

  {
    id: 'tls-security',
    title: 'Network Security: TLS, Firewalls & Security Groups',
    summary: 'How HTTPS protects traffic and how firewalls decide who gets in.',
    blocks: [
      {
        type: 'p',
        text: '**TLS** (the S in HTTPS) gives you three guarantees: **encryption** (nobody can read it), **integrity** (nobody can tamper with it) and **authentication** (you are really talking to the right server, proven by its certificate).',
      },
      { type: 'h3', text: 'Layers of defense' },
      {
        type: 'list',
        items: [
          '**Firewall / Security group** — allow-lists which ports and sources may connect (L3/L4). In AWS, security groups are *stateful* and attach to instances.',
          '**NACL** — subnet-level, stateless allow/deny rules.',
          '**WAF** — inspects HTTP itself (L7): SQL injection, XSS patterns.',
          '**Principle of least privilege** — open only what is needed: `443` from anywhere, `22` from your IP, DB port only from the app tier.',
        ],
      },
      {
        type: 'p',
        text: 'The board plays a TLS 1.3 handshake, then shows the firewall rejecting a port scan — the two everyday faces of network security.',
      },
    ],
    flow: {
      title: 'TLS handshake + security group at work',
      w: 760,
      h: 380,
      nodes: [
        { id: 'client', x: 20, y: 140, icon: '🧑‍💻', label: 'Client', sub: 'browser' },
        { id: 'fw', x: 300, y: 140, icon: '🧱', label: 'Security group', sub: 'allow 443, deny rest' },
        { id: 'server', x: 580, y: 140, icon: '🖥️', label: 'Server', sub: 'cert for example.com' },
        { id: 'attacker', x: 300, y: 300, icon: '👿', label: 'Scanner', sub: 'probing port 22', danger: true },
      ],
      edges: [
        { from: 'client', to: 'fw', label: ':443' },
        { from: 'fw', to: 'server' },
        { from: 'attacker', to: 'fw', dashed: true, label: ':22 ✗' },
      ],
      steps: [
        {
          from: 'client',
          to: 'fw',
          packet: 'ClientHello',
          text: 'The client connects on port 443 and sends ClientHello: supported TLS versions, cipher suites, and its half of the key exchange.',
        },
        {
          from: 'fw',
          to: 'server',
          packet: 'allowed: 443 ✓',
          text: 'The security group checks its inbound rules: port 443 from 0.0.0.0/0 is allowed — the packet passes to the server.',
        },
        {
          from: 'server',
          to: 'client',
          packet: 'ServerHello + cert',
          text: 'The server replies with its chosen cipher, its half of the key exchange, and its **certificate** — signed by a CA the browser already trusts.',
        },
        {
          from: 'client',
          to: 'server',
          packet: 'verify + session keys',
          text: 'The browser verifies the certificate chain (right name, valid dates, trusted CA), then both sides derive the same symmetric session keys. In TLS 1.3 this costs just one round trip.',
        },
        {
          from: 'client',
          to: 'server',
          packet: '🔒 GET /account',
          text: 'All application data now flows encrypted. Even your ISP sees only the destination IP and ciphertext.',
        },
        {
          from: 'attacker',
          to: 'fw',
          packet: 'SYN :22',
          danger: true,
          text: 'Meanwhile a scanner probes SSH on port 22. No inbound rule matches — the security group silently drops the packet. The attacker can’t even tell the machine exists.',
        },
      ],
    },
  },
]
