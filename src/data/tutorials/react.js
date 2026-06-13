// Guided React track. Code runs in the live preview pane — define an
// `App` component (or export default) and it renders automatically.

const levels = [
  {
    id: 'react-1',
    title: 'Your first component',
    summary: 'JSX: writing HTML-like UI in JavaScript.',
    blocks: [
      { type: 'p', text: 'A React **component** is just a function that returns JSX — an HTML-like syntax inside JavaScript. The preview pane on the right renders it live.' },
      { type: 'code', text: `function App() {\n  return <h1>Hello React!</h1>;\n}` },
      { type: 'list', items: ['Component names must start with a capital letter.', 'A component must return a single root element — wrap siblings in a `<div>` or `<>...</>` fragment.', 'Use `{curly braces}` to embed JavaScript expressions inside JSX.'] },
      { type: 'h3', text: 'Your task' },
      { type: 'list', items: ['Add a `<p>` under the heading introducing yourself.', 'Create a `name` variable and render it inside the JSX with `{name}`.'] },
    ],
    starterCode: `function App() {\n  return (\n    <div>\n      <h1>Hello React! 👋</h1>\n      {/* add a <p> with your name here */}\n    </div>\n  );\n}\n\nexport default App;\n`,
    solutionCode: `function App() {\n  const name = "Ada";\n  return (\n    <div>\n      <h1>Hello React! 👋</h1>\n      <p>My name is {name} and this is my first component.</p>\n      <p>2 + 2 = {2 + 2}</p>\n    </div>\n  );\n}\n\nexport default App;\n`,
  },
  {
    id: 'react-2',
    title: 'Props',
    summary: 'Pass data into components to make them reusable.',
    blocks: [
      { type: 'p', text: '**Props** are arguments you pass to components, like attributes on HTML tags. They make one component reusable with different data.' },
      { type: 'code', text: `function Badge({ label, color }) {\n  return <span style={{ background: color, padding: 6 }}>{label}</span>;\n}\n\n<Badge label="New" color="gold" />` },
      { type: 'h3', text: 'Your task' },
      { type: 'list', items: ['Create a `ProfileCard` component that takes `name` and `role` props.', 'Render three `ProfileCard`s with different people inside `App`.'] },
    ],
    starterCode: `// Create ProfileCard({ name, role }) and use it 3 times in App\n\nfunction App() {\n  return (\n    <div>\n      <h1>Team</h1>\n      {/* <ProfileCard name="..." role="..." /> */}\n    </div>\n  );\n}\n\nexport default App;\n`,
    solutionCode: `function ProfileCard({ name, role }) {\n  return (\n    <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12, margin: 8 }}>\n      <strong>{name}</strong>\n      <p style={{ margin: 4, color: "#666" }}>{role}</p>\n    </div>\n  );\n}\n\nfunction App() {\n  return (\n    <div>\n      <h1>Team</h1>\n      <ProfileCard name="Ada Lovelace" role="Engineer" />\n      <ProfileCard name="Grace Hopper" role="Admiral of Code" />\n      <ProfileCard name="Alan Turing" role="Theorist" />\n    </div>\n  );\n}\n\nexport default App;\n`,
  },
  {
    id: 'react-3',
    title: 'State with useState',
    summary: 'Make the UI respond to clicks and changes.',
    blocks: [
      { type: 'p', text: '**State** is data that changes over time. The `useState` hook gives you a value and a setter — calling the setter re-renders the component.' },
      { type: 'code', text: `const [count, setCount] = useState(0);\n\n<button onClick={() => setCount(count + 1)}>\n  Clicked {count} times\n</button>` },
      { type: 'h3', text: 'Your task' },
      { type: 'list', items: ['Build a counter with **+** and **−** buttons.', 'Add a **Reset** button that sets it back to 0.', 'Bonus: disable − when the count is 0.'] },
    ],
    starterCode: `function App() {\n  // const [count, setCount] = useState(0);\n\n  return (\n    <div>\n      <h1>Counter</h1>\n      {/* buttons + display here */}\n    </div>\n  );\n}\n\nexport default App;\n`,
    solutionCode: `function App() {\n  const [count, setCount] = useState(0);\n\n  return (\n    <div style={{ textAlign: "center", fontFamily: "sans-serif" }}>\n      <h1>Counter: {count}</h1>\n      <button onClick={() => setCount(count - 1)} disabled={count === 0}>−</button>\n      <button onClick={() => setCount(count + 1)} style={{ margin: "0 8px" }}>+</button>\n      <button onClick={() => setCount(0)}>Reset</button>\n    </div>\n  );\n}\n\nexport default App;\n`,
  },
  {
    id: 'react-4',
    title: 'Rendering lists',
    summary: 'Turn arrays of data into arrays of elements.',
    blocks: [
      { type: 'p', text: 'Use `array.map()` directly in JSX to render lists. Every item needs a unique `key` prop so React can track changes efficiently.' },
      { type: 'code', text: `const fruits = ["apple", "banana", "cherry"];\n\n<ul>\n  {fruits.map(f => <li key={f}>{f}</li>)}\n</ul>` },
      { type: 'h3', text: 'Your task' },
      { type: 'list', items: ['Render the `todos` array as a list.', 'Show done items with a line-through style.', 'Show a count of remaining items.'] },
    ],
    starterCode: `const todos = [\n  { id: 1, text: "Learn JSX", done: true },\n  { id: 2, text: "Master props", done: true },\n  { id: 3, text: "Understand state", done: false },\n  { id: 4, text: "Build something cool", done: false },\n];\n\nfunction App() {\n  return (\n    <div>\n      <h1>My Todos</h1>\n      {/* render the list here */}\n    </div>\n  );\n}\n\nexport default App;\n`,
    solutionCode: `const todos = [\n  { id: 1, text: "Learn JSX", done: true },\n  { id: 2, text: "Master props", done: true },\n  { id: 3, text: "Understand state", done: false },\n  { id: 4, text: "Build something cool", done: false },\n];\n\nfunction App() {\n  const remaining = todos.filter(t => !t.done).length;\n  return (\n    <div>\n      <h1>My Todos</h1>\n      <ul>\n        {todos.map(t => (\n          <li key={t.id} style={{ textDecoration: t.done ? "line-through" : "none" }}>\n            {t.text}\n          </li>\n        ))}\n      </ul>\n      <p>{remaining} remaining</p>\n    </div>\n  );\n}\n\nexport default App;\n`,
  },
  {
    id: 'react-5',
    title: 'Forms & events',
    summary: 'Controlled inputs: React owns the form state.',
    blocks: [
      { type: 'p', text: 'In React, form inputs are usually **controlled**: their value lives in state, and `onChange` updates it on every keystroke.' },
      { type: 'code', text: `const [text, setText] = useState("");\n\n<input value={text} onChange={e => setText(e.target.value)} />` },
      { type: 'h3', text: 'Your task' },
      { type: 'list', items: ['Build a small form with a name input.', 'Show a live greeting that updates as you type.', 'On submit (button or Enter), add the name to a `guests` list.'] },
    ],
    starterCode: `function App() {\n  // useState for the input text and the guests array\n\n  return (\n    <div>\n      <h1>Guest list</h1>\n      {/* input + live greeting + list of guests */}\n    </div>\n  );\n}\n\nexport default App;\n`,
    solutionCode: `function App() {\n  const [name, setName] = useState("");\n  const [guests, setGuests] = useState([]);\n\n  function addGuest(e) {\n    e.preventDefault();\n    if (!name.trim()) return;\n    setGuests([...guests, name.trim()]);\n    setName("");\n  }\n\n  return (\n    <div>\n      <h1>Guest list</h1>\n      <form onSubmit={addGuest}>\n        <input\n          value={name}\n          onChange={(e) => setName(e.target.value)}\n          placeholder="Type a name"\n        />\n        <button type="submit">Add</button>\n      </form>\n      {name && <p>Hello, {name}! 👋</p>}\n      <ul>\n        {guests.map((g, i) => <li key={i}>{g}</li>)}\n      </ul>\n    </div>\n  );\n}\n\nexport default App;\n`,
  },
  {
    id: 'react-6',
    title: 'Effects with useEffect',
    summary: 'Run side effects: timers, subscriptions, data loading.',
    blocks: [
      { type: 'p', text: '`useEffect(fn, deps)` runs code **after** render — for timers, fetching, or syncing with things outside React. Return a cleanup function to undo the effect.' },
      { type: 'code', text: `useEffect(() => {\n  const id = setInterval(() => setTick(t => t + 1), 1000);\n  return () => clearInterval(id); // cleanup\n}, []); // [] = run once on mount` },
      { type: 'h3', text: 'Your task' },
      { type: 'list', items: ['Build a stopwatch that counts seconds with `setInterval`.', 'Add Start / Stop / Reset controls.', 'Make sure the interval is cleaned up properly.'] },
    ],
    starterCode: `function App() {\n  const [seconds, setSeconds] = useState(0);\n  const [running, setRunning] = useState(false);\n\n  // useEffect: when running, tick every second (and clean up!)\n\n  return (\n    <div>\n      <h1>⏱ {seconds}s</h1>\n      {/* Start / Stop / Reset buttons */}\n    </div>\n  );\n}\n\nexport default App;\n`,
    solutionCode: `function App() {\n  const [seconds, setSeconds] = useState(0);\n  const [running, setRunning] = useState(false);\n\n  useEffect(() => {\n    if (!running) return;\n    const id = setInterval(() => setSeconds(s => s + 1), 1000);\n    return () => clearInterval(id);\n  }, [running]);\n\n  return (\n    <div style={{ textAlign: "center", fontFamily: "sans-serif" }}>\n      <h1>⏱ {seconds}s</h1>\n      <button onClick={() => setRunning(!running)}>\n        {running ? "Stop" : "Start"}\n      </button>\n      <button onClick={() => { setRunning(false); setSeconds(0); }} style={{ marginLeft: 8 }}>\n        Reset\n      </button>\n    </div>\n  );\n}\n\nexport default App;\n`,
  },
]

export default levels
