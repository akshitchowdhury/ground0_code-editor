// Guided JavaScript track. Lesson bodies use simple blocks:
// p (paragraph, `inline code` supported), code, list, h3.

const levels = [
  {
    id: 'js-1',
    title: 'Hello, console!',
    summary: 'Print output and store values in variables.',
    blocks: [
      { type: 'p', text: 'Every JavaScript journey starts with `console.log()` — it prints values to the console so you can see what your program is doing.' },
      { type: 'p', text: 'Variables hold values. Use `const` for values that never change and `let` for values that do.' },
      { type: 'code', text: `const name = "Ada";\nlet age = 36;\nconsole.log("Hello,", name);` },
      { type: 'h3', text: 'Your task' },
      { type: 'list', items: ['Create a `const` called `language` with the value `"JavaScript"`.', 'Create a `let` called `year` set to the current year.', 'Log a sentence using both variables.'] },
    ],
    starterCode: `// Level 1 — Hello, console!\n// Create your variables below, then press Run.\n\nconsole.log("Hello, world!");\n`,
    solutionCode: `const language = "JavaScript";\nlet year = 2026;\n\nconsole.log("I am learning " + language + " in " + year + "!");\n// Template literals work too:\nconsole.log(\`I am learning \${language} in \${year}!\`);\n`,
  },
  {
    id: 'js-2',
    title: 'Functions & arrow syntax',
    summary: 'Package logic into reusable functions.',
    blocks: [
      { type: 'p', text: 'Functions let you name a piece of logic and reuse it. Modern JavaScript often uses **arrow functions**:' },
      { type: 'code', text: `function greet(name) {\n  return "Hi " + name;\n}\n\nconst greetArrow = (name) => "Hi " + name;` },
      { type: 'p', text: 'Both forms take parameters and `return` a value. Arrow functions are shorter and common in React code, so get comfortable with them now.' },
      { type: 'h3', text: 'Your task' },
      { type: 'list', items: ['Write a function `add(a, b)` that returns the sum.', 'Write an arrow function `square` that returns a number squared.', 'Log `add(square(3), 4)` — it should print `13`.'] },
    ],
    starterCode: `// Level 2 — Functions\n\nfunction add(a, b) {\n  // return the sum\n}\n\nconst square = (n) => /* your code */ n;\n\nconsole.log(add(square(3), 4)); // expected: 13\n`,
    solutionCode: `function add(a, b) {\n  return a + b;\n}\n\nconst square = (n) => n * n;\n\nconsole.log(add(square(3), 4)); // 13\n`,
  },
  {
    id: 'js-3',
    title: 'Arrays: map & filter',
    summary: 'Transform lists of data the modern way.',
    blocks: [
      { type: 'p', text: 'Arrays hold ordered lists. Instead of writing loops by hand, JavaScript gives you expressive methods:' },
      { type: 'list', items: ['`map(fn)` — transform every element into something new.', '`filter(fn)` — keep only the elements that pass a test.', '`reduce(fn, start)` — boil the array down to one value.'] },
      { type: 'code', text: `const nums = [1, 2, 3, 4, 5];\nconst doubled = nums.map(n => n * 2);    // [2,4,6,8,10]\nconst evens   = nums.filter(n => n % 2 === 0); // [2,4]` },
      { type: 'h3', text: 'Your task' },
      { type: 'list', items: ['Start from the `prices` array in the starter code.', 'Use `filter` to keep prices under 50.', 'Use `map` to apply a 10% discount to those.', 'Log the result.'] },
    ],
    starterCode: `// Level 3 — Arrays\nconst prices = [120, 45, 8, 99, 32, 50, 18];\n\n// 1) keep prices under 50\n// 2) apply a 10% discount to each\n// 3) log the result\n`,
    solutionCode: `const prices = [120, 45, 8, 99, 32, 50, 18];\n\nconst discounted = prices\n  .filter(p => p < 50)\n  .map(p => +(p * 0.9).toFixed(2));\n\nconsole.log(discounted); // [40.5, 7.2, 28.8, 16.2]\n`,
  },
  {
    id: 'js-4',
    title: 'Objects & destructuring',
    summary: 'Model real-world things with key/value data.',
    blocks: [
      { type: 'p', text: 'Objects group related data under named keys. **Destructuring** pulls values out into variables in one line — you will see this constantly in React.' },
      { type: 'code', text: `const user = { name: "Ada", role: "engineer", level: 9 };\n\nconst { name, level } = user;\nconsole.log(name, level); // Ada 9\n\n// Spread copies an object with changes:\nconst promoted = { ...user, level: 10 };` },
      { type: 'h3', text: 'Your task' },
      { type: 'list', items: ['Destructure `title` and `pages` from the `book` object.', 'Create `updatedBook` with the spread operator, changing `pages` to 320.', 'Log both.'] },
    ],
    starterCode: `// Level 4 — Objects\nconst book = {\n  title: "Eloquent JS",\n  author: "Marijn Haverbeke",\n  pages: 290,\n};\n\n// destructure title and pages, then make updatedBook with pages: 320\n`,
    solutionCode: `const book = {\n  title: "Eloquent JS",\n  author: "Marijn Haverbeke",\n  pages: 290,\n};\n\nconst { title, pages } = book;\nconsole.log(title, "has", pages, "pages");\n\nconst updatedBook = { ...book, pages: 320 };\nconsole.log(updatedBook);\n`,
  },
  {
    id: 'js-5',
    title: 'Promises & async/await',
    summary: 'Handle work that takes time, like network calls.',
    blocks: [
      { type: 'p', text: 'Some operations (fetching data, timers) finish later. A `Promise` represents that future value, and `async`/`await` lets you write asynchronous code that reads top-to-bottom.' },
      { type: 'code', text: `const wait = (ms) => new Promise(res => setTimeout(res, ms));\n\nasync function main() {\n  console.log("start");\n  await wait(500);\n  console.log("half a second later");\n}\nmain();` },
      { type: 'p', text: 'This sandbox supports top-level `await`, so you can `await` directly without a wrapper function too.' },
      { type: 'h3', text: 'Your task' },
      { type: 'list', items: ['Write an async function `fetchUser(id)` that waits 300 ms then returns an object `{ id, name: "User" + id }`.', 'Await it twice with different ids and log the results.'] },
    ],
    starterCode: `// Level 5 — async/await\nconst wait = (ms) => new Promise(res => setTimeout(res, ms));\n\n// write fetchUser(id): wait 300ms, then return { id, name: "User" + id }\n\n// then: const u = await fetchUser(1); console.log(u);\n`,
    solutionCode: `const wait = (ms) => new Promise(res => setTimeout(res, ms));\n\nasync function fetchUser(id) {\n  await wait(300);\n  return { id, name: "User" + id };\n}\n\nconst a = await fetchUser(1);\nconsole.log(a);\nconst b = await fetchUser(42);\nconsole.log(b);\n`,
  },
  {
    id: 'js-6',
    title: 'Mini project: word stats',
    summary: 'Combine everything into a tiny text-analysis tool.',
    blocks: [
      { type: 'p', text: 'Time to combine variables, functions, arrays and objects into something useful: a word-frequency counter.' },
      { type: 'list', items: ['Split text into words with `text.toLowerCase().split(/\\W+/)`.', 'Count occurrences into an object: `counts[word] = (counts[word] || 0) + 1`.', 'Use `Object.entries(counts)` + `sort` to rank them.'] },
      { type: 'h3', text: 'Your task' },
      { type: 'list', items: ['Implement `wordStats(text)` returning the 3 most frequent words.', 'Run it on the sample text and log the ranking.'] },
    ],
    starterCode: `// Level 6 — Mini project\nconst text = \`the quick brown fox jumps over the lazy dog\nthe dog barks and the fox runs away the end\`;\n\nfunction wordStats(input) {\n  // 1) split into lowercase words\n  // 2) count each word\n  // 3) return top 3 as [word, count] pairs\n}\n\nconsole.log(wordStats(text));\n`,
    solutionCode: `const text = \`the quick brown fox jumps over the lazy dog\nthe dog barks and the fox runs away the end\`;\n\nfunction wordStats(input) {\n  const words = input.toLowerCase().split(/\\W+/).filter(Boolean);\n  const counts = {};\n  for (const w of words) counts[w] = (counts[w] || 0) + 1;\n  return Object.entries(counts)\n    .sort((a, b) => b[1] - a[1])\n    .slice(0, 3);\n}\n\nconsole.log(wordStats(text)); // [["the",5],["fox",2],["dog",2]]\n`,
  },
]

export default levels
