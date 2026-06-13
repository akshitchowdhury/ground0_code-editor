// Starter snippets for Project Mode (free playground).

export const DEFAULT_CODE = {
  javascript: `// JavaScript playground — Node-style scripting in your browser.
// Press Run (or Ctrl+Enter) to execute. console.log streams to the right.

const planets = ["Mercury", "Venus", "Earth", "Mars"];

const described = planets.map((p, i) => \`\${i + 1}. \${p}\`);
console.log("Inner planets:");
described.forEach(line => console.log(" ", line));

// Top-level await works too:
const wait = (ms) => new Promise(r => setTimeout(r, ms));
await wait(400);
console.log("\\n...and async/await just works ✨");
`,

  react: `// React playground — your component renders live on the right.
// Define an App component (or export default) and press Run.

function App() {
  const [count, setCount] = useState(0);

  return (
    <div style={{ fontFamily: "sans-serif", textAlign: "center", marginTop: 40 }}>
      <h1>Hello React ⚛️</h1>
      <p>You clicked {count} times</p>
      <button
        onClick={() => setCount(count + 1)}
        style={{
          padding: "10px 24px",
          fontSize: 16,
          borderRadius: 8,
          border: "none",
          background: "#6366f1",
          color: "white",
          cursor: "pointer",
        }}
      >
        Click me
      </button>
    </div>
  );
}

export default App;
`,

  python: `# Python playground — real CPython running in your browser (WebAssembly).
# The first run downloads the runtime (~10 MB), then it's instant.

import math

def fib(n):
    a, b = 0, 1
    for _ in range(n):
        a, b = b, a + b
    return a

print("First 10 Fibonacci numbers:")
print([fib(i) for i in range(10)])

print(f"\\nGolden ratio ≈ {fib(20) / fib(19):.6f}")
print(f"Actual phi    = {(1 + math.sqrt(5)) / 2:.6f}")
`,

  go: `// Go playground — real Go 1.23, compiled & run in a free cloud sandbox.
// Goroutines, channels, generics — everything works.

package main

import (
	"fmt"
	"sync"
)

func main() {
	fmt.Println("Hello from Go! 🐹")

	// Fan out some work across goroutines:
	var wg sync.WaitGroup
	results := make(chan string, 4)

	for _, planet := range []string{"Mercury", "Venus", "Earth", "Mars"} {
		wg.Add(1)
		go func(p string) {
			defer wg.Done()
			results <- "visited " + p
		}(planet)
	}

	wg.Wait()
	close(results)

	for msg := range results {
		fmt.Println(msg)
	}
}
`,

  java: `// Java playground — JDK 22, compiled & run in a free cloud sandbox.
// Note: use "class Main" (without public) — the sandbox names the file prog.java.

import java.util.*;

class Main {
    record Planet(String name, double gravity) {}

    public static void main(String[] args) {
        System.out.println("Hello from Java! ☕");

        List<Planet> planets = List.of(
            new Planet("Mercury", 3.7),
            new Planet("Earth", 9.8),
            new Planet("Jupiter", 24.8)
        );

        planets.stream()
            .filter(p -> p.gravity() > 5)
            .forEach(p -> System.out.printf("%s pulls at %.1f m/s²%n", p.name(), p.gravity()));
    }
}
`,

  shell: `#!/bin/bash
# Shell playground — write a script here and press "Run Script",
# or type commands directly in the terminal on the left.
# Type "help" in the terminal to see every supported command.

echo "Hello from the Ground0 shell!"
mkdir -p demo/src
echo "console.log('hi')" > demo/src/app.js
tree demo
cat demo/src/app.js
`,
}
