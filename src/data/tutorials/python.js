// Guided Python track — runs on real CPython (Pyodide/WebAssembly).

const levels = [
  {
    id: 'py-1',
    title: 'print() & variables',
    summary: 'Output text and store values.',
    blocks: [
      { type: 'p', text: 'Python is famous for reading almost like English. `print()` writes to the console, and variables are created just by assigning to a name — no `let` or `const` needed.' },
      { type: 'code', text: `name = "Ada"\nage = 36\nprint("Hello,", name)\nprint(f"{name} is {age} years old")  # f-string formatting` },
      { type: 'p', text: 'The first run downloads the Python runtime (~10 MB, one time) — give it a few seconds.' },
      { type: 'h3', text: 'Your task' },
      { type: 'list', items: ['Create variables `language` and `version` (e.g. `"Python"`, `3.12`).', 'Print a sentence with an f-string using both.'] },
    ],
    starterCode: `# Level 1 — print() & variables\n\nprint("Hello, Python!")\n\n# create language and version, then print an f-string\n`,
    solutionCode: `language = "Python"\nversion = 3.12\n\nprint(f"I am learning {language} {version}!")\n`,
  },
  {
    id: 'py-2',
    title: 'Lists & loops',
    summary: 'Collections and the for loop.',
    blocks: [
      { type: 'p', text: 'A `list` holds an ordered collection. The `for` loop visits each item — and `range(n)` generates number sequences. **Indentation defines blocks in Python**, so be precise with it.' },
      { type: 'code', text: `fruits = ["apple", "banana", "cherry"]\nfor fruit in fruits:\n    print(fruit.title())\n\nfor i in range(3):\n    print("count:", i)` },
      { type: 'h3', text: 'Your task' },
      { type: 'list', items: ['Loop over the `scores` list and print each one.', 'Compute and print the total and average (use `sum()` and `len()`).', 'Print only the scores above 80.'] },
    ],
    starterCode: `# Level 2 — Lists & loops\nscores = [72, 95, 88, 64, 81]\n\n# print each score, the total, the average, and scores above 80\n`,
    solutionCode: `scores = [72, 95, 88, 64, 81]\n\nfor s in scores:\n    print("score:", s)\n\nprint("total:", sum(scores))\nprint("average:", sum(scores) / len(scores))\n\nfor s in scores:\n    if s > 80:\n        print("high score:", s)\n`,
  },
  {
    id: 'py-3',
    title: 'Functions',
    summary: 'def, parameters, return values, defaults.',
    blocks: [
      { type: 'p', text: 'Define functions with `def`. Parameters can have **default values**, and functions return results with `return`.' },
      { type: 'code', text: `def greet(name, excited=False):\n    message = f"Hello, {name}"\n    return message + "!!!" if excited else message\n\nprint(greet("Ada"))\nprint(greet("Grace", excited=True))` },
      { type: 'h3', text: 'Your task' },
      { type: 'list', items: ['Write `celsius_to_fahrenheit(c)` → `c * 9/5 + 32`.', 'Write `describe(temp_c)` that returns `"freezing"`, `"mild"` or `"hot"` (you pick the cutoffs).', 'Test both with a few values.'] },
    ],
    starterCode: `# Level 3 — Functions\n\ndef celsius_to_fahrenheit(c):\n    pass  # replace with your code\n\n# write describe(temp_c) returning "freezing" / "mild" / "hot"\n\nprint(celsius_to_fahrenheit(20))  # expected: 68.0\n`,
    solutionCode: `def celsius_to_fahrenheit(c):\n    return c * 9 / 5 + 32\n\ndef describe(temp_c):\n    if temp_c <= 0:\n        return "freezing"\n    elif temp_c < 25:\n        return "mild"\n    return "hot"\n\nfor t in [-5, 18, 31]:\n    print(t, "°C =", celsius_to_fahrenheit(t), "°F →", describe(t))\n`,
  },
  {
    id: 'py-4',
    title: 'Dictionaries',
    summary: 'Key/value data and iteration patterns.',
    blocks: [
      { type: 'p', text: 'A `dict` maps keys to values — Python\'s version of a JS object. Use `.items()` to loop over pairs and `.get(key, default)` for safe lookups.' },
      { type: 'code', text: `user = {"name": "Ada", "role": "engineer"}\nprint(user["name"])\nprint(user.get("team", "unassigned"))\n\nfor key, value in user.items():\n    print(key, "→", value)` },
      { type: 'h3', text: 'Your task' },
      { type: 'list', items: ['Count word frequencies in `text` into a dict.', 'Hint: `text.split()` gives words; `counts.get(w, 0) + 1` updates safely.', 'Print each word with its count.'] },
    ],
    starterCode: `# Level 4 — Dictionaries\ntext = "the cat sat on the mat the cat smiled"\n\ncounts = {}\n# fill counts, then print each word with its count\n`,
    solutionCode: `text = "the cat sat on the mat the cat smiled"\n\ncounts = {}\nfor word in text.split():\n    counts[word] = counts.get(word, 0) + 1\n\nfor word, n in counts.items():\n    print(f"{word}: {n}")\n`,
  },
  {
    id: 'py-5',
    title: 'List comprehensions',
    summary: 'Pythonic one-line transformations.',
    blocks: [
      { type: 'p', text: 'A **list comprehension** builds a list from an iterable in a single readable expression — Python\'s answer to `map` + `filter`.' },
      { type: 'code', text: `nums = [1, 2, 3, 4, 5, 6]\nsquares = [n * n for n in nums]\nevens   = [n for n in nums if n % 2 == 0]\npairs   = [(n, n * n) for n in nums if n > 3]` },
      { type: 'h3', text: 'Your task' },
      { type: 'list', items: ['From `words`, build a list of lengths.', 'Build a list of words longer than 4 letters, uppercased.', 'Bonus: a dict comprehension `{word: len(word) ...}`.'] },
    ],
    starterCode: `# Level 5 — Comprehensions\nwords = ["python", "is", "really", "fun", "to", "write"]\n\n# lengths = ...\n# long_upper = ...\n# bonus: word_lengths dict\n`,
    solutionCode: `words = ["python", "is", "really", "fun", "to", "write"]\n\nlengths = [len(w) for w in words]\nprint(lengths)\n\nlong_upper = [w.upper() for w in words if len(w) > 4]\nprint(long_upper)\n\nword_lengths = {w: len(w) for w in words}\nprint(word_lengths)\n`,
  },
  {
    id: 'py-6',
    title: 'Classes',
    summary: 'Bundle data + behaviour with object-oriented Python.',
    blocks: [
      { type: 'p', text: 'A `class` is a blueprint for objects. `__init__` runs when an object is created, and `self` refers to the instance.' },
      { type: 'code', text: `class Player:\n    def __init__(self, name):\n        self.name = name\n        self.score = 0\n\n    def add_points(self, points):\n        self.score += points\n        return self.score` },
      { type: 'h3', text: 'Your task' },
      { type: 'list', items: ['Create a `BankAccount` class with `owner` and `balance`.', 'Add `deposit(amount)` and `withdraw(amount)` — block withdrawals beyond the balance.', 'Create an account, run a few transactions, print the result.'] },
    ],
    starterCode: `# Level 6 — Classes\n\nclass BankAccount:\n    def __init__(self, owner, balance=0):\n        pass  # store owner and balance\n\n    # deposit(amount), withdraw(amount)\n\n# account = BankAccount("Ada", 100)\n`,
    solutionCode: `class BankAccount:\n    def __init__(self, owner, balance=0):\n        self.owner = owner\n        self.balance = balance\n\n    def deposit(self, amount):\n        self.balance += amount\n        print(f"+{amount} → balance {self.balance}")\n\n    def withdraw(self, amount):\n        if amount > self.balance:\n            print(f"Declined: insufficient funds for {amount}")\n        else:\n            self.balance -= amount\n            print(f"-{amount} → balance {self.balance}")\n\naccount = BankAccount("Ada", 100)\naccount.deposit(50)\naccount.withdraw(30)\naccount.withdraw(500)\nprint(f"{account.owner} ends with {account.balance}")\n`,
  },
]

export default levels
