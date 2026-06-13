// Guided Java track — core Java through the four OOP pillars, with a
// mini task per level and a capstone project. Runs on JDK 22 via the
// cloud sandbox. NOTE: the sandbox compiles the file as prog.java, so
// the entry class is written as `class Main` (no `public` modifier).

const levels = [
  {
    id: 'java-1',
    title: 'Hello, Java!',
    summary: 'Classes, the main method, and printing.',
    blocks: [
      { type: 'p', text: 'All Java code lives inside a **class**, and programs start at `public static void main(String[] args)`. `System.out.println` prints a line.' },
      { type: 'code', text: `class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello, Java!");\n        System.out.printf("Pi is roughly %.2f%n", 3.14159);\n    }\n}` },
      { type: 'p', text: '**Sandbox note:** normally the entry class is `public class Main` in a file called `Main.java`. This sandbox compiles your code as `prog.java`, so we drop the `public` modifier — everything else is standard Java.' },
      { type: 'h3', text: 'Your task' },
      { type: 'list', items: ['Print your name with `println`.', 'Use `printf` with `%s` and `%d` to print a name and an age in one line.', 'Add a single-line (`//`) and a multi-line (`/* */`) comment.'] },
    ],
    starterCode: `class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello, Java!");\n        // your code here\n    }\n}\n`,
    solutionCode: `class Main {\n    public static void main(String[] args) {\n        /* The classic first program,\n           now with formatting. */\n        System.out.println("My name is Ada");\n        System.out.printf("%s is %d years old%n", "Ada", 36); // %n = newline\n    }\n}\n`,
  },
  {
    id: 'java-2',
    title: 'Variables & types',
    summary: 'Primitives, Strings, var, and casting.',
    blocks: [
      { type: 'p', text: 'Java is strongly typed with eight **primitives** (`int`, `long`, `double`, `boolean`, `char`, `byte`, `short`, `float`) plus reference types like `String`. Since Java 10, `var` infers local variable types.' },
      { type: 'code', text: `int count = 42;\ndouble price = 9.99;\nboolean active = true;\nchar grade = 'A';\nString name = "Duke";\nvar inferred = 3.14;        // double\n\nint truncated = (int) price; // explicit cast: 9\ndouble widened = count;      // implicit widening` },
      { type: 'p', text: 'Integer division truncates: `7 / 2` is `3`, but `7 / 2.0` is `3.5`. The `%` operator gives the remainder.' },
      { type: 'h3', text: 'Your task' },
      { type: 'list', items: ['Declare one variable of each: `int`, `double`, `boolean`, `char`, `String`.', 'Show the integer-division trap: print `7 / 2` and `7 / 2.0`.', 'Cast a `double` to `int` and print what gets lost.'] },
    ],
    starterCode: `class Main {\n    public static void main(String[] args) {\n        // declare int, double, boolean, char, String\n        // demonstrate 7 / 2 vs 7 / 2.0\n        // cast a double to int\n    }\n}\n`,
    solutionCode: `class Main {\n    public static void main(String[] args) {\n        int year = 2026;\n        double temp = 21.5;\n        boolean sunny = true;\n        char initial = 'G';\n        String city = "Bangalore";\n\n        System.out.println(city + " " + year + ": " + temp + "°C, sunny=" + sunny + " (" + initial + ")");\n\n        System.out.println(7 / 2);     // 3  — integer division!\n        System.out.println(7 / 2.0);   // 3.5\n\n        double pi = 3.99999;\n        System.out.println((int) pi);  // 3 — cast truncates, no rounding\n    }\n}\n`,
  },
  {
    id: 'java-3',
    title: 'Control flow',
    summary: 'if/else, switch expressions, loops.',
    blocks: [
      { type: 'p', text: 'Java has the classic `if`/`else`, three loops (`for`, `while`, `do-while`), and a `switch` that since Java 14 can be a clean **expression** with arrows.' },
      { type: 'code', text: `String size = switch (units) {\n    case 0, 1 -> "small";\n    case 2, 3 -> "medium";\n    default   -> "large";\n};\n\nfor (int i = 0; i < 3; i++) { }\nwhile (n > 0) { n--; }` },
      { type: 'h3', text: 'Your task' },
      { type: 'list', items: ['Loop 1–20 and print FizzBuzz (3 → Fizz, 5 → Buzz, both → FizzBuzz).', 'Convert a numeric score (0–100) to a letter grade with a switch expression on `score / 10`.', 'Use `continue` to skip one value and `break` to stop early somewhere.'] },
    ],
    starterCode: `class Main {\n    public static void main(String[] args) {\n        // FizzBuzz 1..20\n\n        int score = 87;\n        // letter grade via switch expression on score / 10\n    }\n}\n`,
    solutionCode: `class Main {\n    public static void main(String[] args) {\n        for (int i = 1; i <= 20; i++) {\n            if (i % 15 == 0) System.out.println("FizzBuzz");\n            else if (i % 3 == 0) System.out.println("Fizz");\n            else if (i % 5 == 0) System.out.println("Buzz");\n            else System.out.println(i);\n        }\n\n        int score = 87;\n        String grade = switch (score / 10) {\n            case 10, 9 -> "A";\n            case 8 -> "B";\n            case 7 -> "C";\n            case 6 -> "D";\n            default -> "F";\n        };\n        System.out.println("Score " + score + " → grade " + grade);\n    }\n}\n`,
  },
  {
    id: 'java-4',
    title: 'Methods',
    summary: 'Static methods, parameters, overloading.',
    blocks: [
      { type: 'p', text: 'Methods bundle reusable logic. `static` methods belong to the class itself (no object needed) — that\'s why `main` is static. **Overloading** = same name, different parameter lists.' },
      { type: 'code', text: `static int max(int a, int b) {\n    return a > b ? a : b;\n}\n\nstatic double max(double a, double b) {  // overload\n    return a > b ? a : b;\n}\n\nstatic int max(int a, int b, int c) {    // another overload\n    return max(max(a, b), c);\n}` },
      { type: 'h3', text: 'Your task' },
      { type: 'list', items: ['Write `static boolean isPrime(int n)`.', 'Write an overload `static void printPrimes(int upTo)` that uses it.', 'Print all primes up to 50.'] },
    ],
    starterCode: `class Main {\n    // static boolean isPrime(int n) { ... }\n    // static void printPrimes(int upTo) { ... }\n\n    public static void main(String[] args) {\n        // printPrimes(50);\n    }\n}\n`,
    solutionCode: `class Main {\n    static boolean isPrime(int n) {\n        if (n < 2) return false;\n        for (int i = 2; i * i <= n; i++) {\n            if (n % i == 0) return false;\n        }\n        return true;\n    }\n\n    static void printPrimes(int upTo) {\n        for (int n = 2; n <= upTo; n++) {\n            if (isPrime(n)) System.out.print(n + " ");\n        }\n        System.out.println();\n    }\n\n    public static void main(String[] args) {\n        printPrimes(50);\n    }\n}\n`,
  },
  {
    id: 'java-5',
    title: 'Arrays & Strings',
    summary: 'Fixed-size collections and text processing.',
    blocks: [
      { type: 'p', text: 'Arrays are fixed-length: `int[] nums = new int[5]` or `{1, 2, 3}` literals. Strings are **immutable** — methods like `toUpperCase` return new strings. For heavy concatenation use `StringBuilder`.' },
      { type: 'code', text: `int[] nums = {5, 3, 8, 1};\nSystem.out.println(nums.length);\nSystem.out.println(java.util.Arrays.toString(nums));\n\nString s = "Hello, Java";\ns.length(); s.toUpperCase(); s.contains("Java");\ns.split(", "); s.charAt(0); s.substring(7);` },
      { type: 'h3', text: 'Your task' },
      { type: 'list', items: ['Find the largest value and the average of the `temps` array.', 'Reverse the string `"sandbox"` using a loop or `StringBuilder.reverse()`.', 'Count the vowels in a sentence with `charAt` (or `toCharArray`).'] },
    ],
    starterCode: `import java.util.Arrays;\n\nclass Main {\n    public static void main(String[] args) {\n        int[] temps = {21, 35, 28, 19, 31};\n        // max + average\n\n        String word = "sandbox";\n        // reverse it\n\n        String sentence = "Java keeps strings immutable";\n        // count vowels\n    }\n}\n`,
    solutionCode: `import java.util.Arrays;\n\nclass Main {\n    public static void main(String[] args) {\n        int[] temps = {21, 35, 28, 19, 31};\n        int max = temps[0];\n        int sum = 0;\n        for (int t : temps) {\n            if (t > max) max = t;\n            sum += t;\n        }\n        System.out.println(Arrays.toString(temps));\n        System.out.println("max=" + max + " avg=" + (double) sum / temps.length);\n\n        String word = "sandbox";\n        String reversed = new StringBuilder(word).reverse().toString();\n        System.out.println(reversed);\n\n        String sentence = "Java keeps strings immutable";\n        int vowels = 0;\n        for (char c : sentence.toLowerCase().toCharArray()) {\n            if ("aeiou".indexOf(c) >= 0) vowels++;\n        }\n        System.out.println("vowels: " + vowels);\n    }\n}\n`,
  },
  {
    id: 'java-6',
    title: 'Classes & objects',
    summary: 'Fields, constructors, this, toString.',
    blocks: [
      { type: 'p', text: 'A class is a blueprint; `new` creates objects from it. The **constructor** initializes fields, and `this` refers to the current object. Override `toString()` so printing your object is readable.' },
      { type: 'code', text: `class Book {\n    String title;\n    int pages;\n\n    Book(String title, int pages) {\n        this.title = title;\n        this.pages = pages;\n    }\n\n    @Override\n    public String toString() {\n        return title + " (" + pages + "p)";\n    }\n}` },
      { type: 'h3', text: 'Your task' },
      { type: 'list', items: ['Create a `Movie` class with `title`, `year`, and `rating` fields and a constructor.', 'Add an instance method `boolean isClassic()` — true if older than 25 years.', 'Override `toString()`, create two movies, print them and their classic status.'] },
    ],
    starterCode: `class Movie {\n    // fields: title, year, rating\n    // constructor + isClassic() + toString()\n}\n\nclass Main {\n    public static void main(String[] args) {\n        // Movie m = new Movie("Alien", 1979, 8.5);\n    }\n}\n`,
    solutionCode: `class Movie {\n    String title;\n    int year;\n    double rating;\n\n    Movie(String title, int year, double rating) {\n        this.title = title;\n        this.year = year;\n        this.rating = rating;\n    }\n\n    boolean isClassic() {\n        return 2026 - year > 25;\n    }\n\n    @Override\n    public String toString() {\n        return title + " (" + year + ") ★" + rating;\n    }\n}\n\nclass Main {\n    public static void main(String[] args) {\n        Movie alien = new Movie("Alien", 1979, 8.5);\n        Movie dune = new Movie("Dune: Part Two", 2024, 8.6);\n\n        System.out.println(alien + " classic? " + alien.isClassic());\n        System.out.println(dune + " classic? " + dune.isClassic());\n    }\n}\n`,
  },
  {
    id: 'java-7',
    title: 'Encapsulation',
    summary: 'OOP pillar #1: private state, controlled access.',
    blocks: [
      { type: 'p', text: '**Encapsulation** hides an object\'s internal state behind methods. Make fields `private`, then expose only what\'s safe through getters/setters — which lets you enforce rules (validation) in one place.' },
      { type: 'code', text: `class Account {\n    private double balance;   // nobody can touch this directly\n\n    public double getBalance() { return balance; }\n\n    public void deposit(double amount) {\n        if (amount <= 0) {\n            System.out.println("Rejected: deposit must be positive");\n            return;\n        }\n        balance += amount;\n    }\n}` },
      { type: 'h3', text: 'Your task' },
      { type: 'list', items: ['Build a `Thermostat` class with a private `temperature` field.', 'Its setter must clamp values to the range 5–30 and report rejected values.', 'Show that invalid values can\'t sneak in.'] },
    ],
    starterCode: `class Thermostat {\n    private double temperature = 20;\n\n    // getter + setter that only accepts 5..30\n}\n\nclass Main {\n    public static void main(String[] args) {\n        Thermostat t = new Thermostat();\n        // try setting 25, then 99, then print the temperature\n    }\n}\n`,
    solutionCode: `class Thermostat {\n    private double temperature = 20;\n\n    public double getTemperature() {\n        return temperature;\n    }\n\n    public void setTemperature(double value) {\n        if (value < 5 || value > 30) {\n            System.out.println("Rejected " + value + "°C — allowed range is 5–30");\n            return;\n        }\n        temperature = value;\n    }\n}\n\nclass Main {\n    public static void main(String[] args) {\n        Thermostat t = new Thermostat();\n        t.setTemperature(25);\n        System.out.println("now: " + t.getTemperature());\n        t.setTemperature(99);  // rejected\n        System.out.println("still: " + t.getTemperature());\n    }\n}\n`,
  },
  {
    id: 'java-8',
    title: 'Inheritance & polymorphism',
    summary: 'OOP pillars #2 & #3: extends, super, @Override.',
    blocks: [
      { type: 'p', text: '**Inheritance** lets a class build on another with `extends`; `super(...)` calls the parent constructor. **Polymorphism** means a parent-typed variable can hold any subclass — and overridden methods dispatch to the *actual* type at runtime.' },
      { type: 'code', text: `class Animal {\n    String name;\n    Animal(String name) { this.name = name; }\n    String speak() { return "..."; }\n}\n\nclass Dog extends Animal {\n    Dog(String name) { super(name); }\n    @Override\n    String speak() { return "Woof!"; }\n}\n\nAnimal pet = new Dog("Rex");\nSystem.out.println(pet.speak()); // Woof! — runtime dispatch` },
      { type: 'h3', text: 'Your task' },
      { type: 'list', items: ['Create an `Employee` base class (`name`, `salary`) with a `monthlyPay()` method.', 'Subclass `Manager` adds a `bonus` and overrides `monthlyPay()` to include it.', 'Put a mix of employees in an `Employee[]` and print each pay — polymorphism in action.'] },
    ],
    starterCode: `class Employee {\n    String name;\n    double salary;\n\n    Employee(String name, double salary) {\n        this.name = name;\n        this.salary = salary;\n    }\n\n    double monthlyPay() {\n        return salary / 12;\n    }\n}\n\n// class Manager extends Employee { ... }\n\nclass Main {\n    public static void main(String[] args) {\n        // Employee[] staff = { new Employee(...), new Manager(...) };\n    }\n}\n`,
    solutionCode: `class Employee {\n    String name;\n    double salary;\n\n    Employee(String name, double salary) {\n        this.name = name;\n        this.salary = salary;\n    }\n\n    double monthlyPay() {\n        return salary / 12;\n    }\n}\n\nclass Manager extends Employee {\n    double bonus;\n\n    Manager(String name, double salary, double bonus) {\n        super(name, salary);\n        this.bonus = bonus;\n    }\n\n    @Override\n    double monthlyPay() {\n        return super.monthlyPay() + bonus / 12;\n    }\n}\n\nclass Main {\n    public static void main(String[] args) {\n        Employee[] staff = {\n            new Employee("Asha", 60000),\n            new Manager("Bilal", 90000, 12000),\n        };\n        for (Employee e : staff) {\n            System.out.printf("%s earns %.2f / month (%s)%n",\n                e.name, e.monthlyPay(), e.getClass().getSimpleName());\n        }\n    }\n}\n`,
  },
  {
    id: 'java-9',
    title: 'Abstraction & interfaces',
    summary: 'OOP pillar #4: abstract classes and contracts.',
    blocks: [
      { type: 'p', text: 'An **abstract class** can\'t be instantiated — it defines a partial blueprint with `abstract` methods subclasses must fill in. An **interface** is a pure contract; a class can implement many of them. Since Java 8 interfaces may carry `default` methods.' },
      { type: 'code', text: `abstract class Shape {\n    abstract double area();                 // no body — must override\n    void describe() {                       // shared behaviour\n        System.out.println("area = " + area());\n    }\n}\n\ninterface Drawable {\n    void draw();\n    default String label() { return "drawable"; }\n}\n\nclass Circle extends Shape implements Drawable { ... }` },
      { type: 'h3', text: 'Your task' },
      { type: 'list', items: ['Make `Shape` abstract with abstract `area()`, and concrete `Circle` and `Rectangle` subclasses.', 'Add a `Printable` interface with `print()`; implement it in both shapes.', 'Loop over a `Shape[]` calling `area()` and `print()` on each.'] },
    ],
    starterCode: `abstract class Shape {\n    abstract double area();\n}\n\ninterface Printable {\n    void print();\n}\n\n// Circle (radius) and Rectangle (width, height)\n\nclass Main {\n    public static void main(String[] args) {\n        // Shape[] shapes = { new Circle(2), new Rectangle(3, 4) };\n    }\n}\n`,
    solutionCode: `abstract class Shape {\n    abstract double area();\n}\n\ninterface Printable {\n    void print();\n}\n\nclass Circle extends Shape implements Printable {\n    double radius;\n    Circle(double radius) { this.radius = radius; }\n\n    @Override\n    double area() { return Math.PI * radius * radius; }\n\n    @Override\n    public void print() {\n        System.out.printf("Circle(r=%.1f) area=%.2f%n", radius, area());\n    }\n}\n\nclass Rectangle extends Shape implements Printable {\n    double width, height;\n    Rectangle(double width, double height) {\n        this.width = width;\n        this.height = height;\n    }\n\n    @Override\n    double area() { return width * height; }\n\n    @Override\n    public void print() {\n        System.out.printf("Rectangle(%sx%s) area=%.2f%n", width, height, area());\n    }\n}\n\nclass Main {\n    public static void main(String[] args) {\n        Shape[] shapes = { new Circle(2), new Rectangle(3, 4) };\n        for (Shape s : shapes) {\n            ((Printable) s).print();\n        }\n    }\n}\n`,
  },
  {
    id: 'java-10',
    title: 'Collections & generics',
    summary: 'ArrayList, HashMap, and type-safe containers.',
    blocks: [
      { type: 'p', text: 'The Collections Framework replaces raw arrays for most real work. **Generics** (`List<String>`) make containers type-safe at compile time.' },
      { type: 'code', text: `List<String> tasks = new ArrayList<>();\ntasks.add("write code");\ntasks.remove(0);\n\nMap<String, Integer> stock = new HashMap<>();\nstock.put("nails", 120);\nstock.getOrDefault("screws", 0);\n\nfor (Map.Entry<String, Integer> e : stock.entrySet()) {\n    System.out.println(e.getKey() + " → " + e.getValue());\n}` },
      { type: 'p', text: 'Bonus modern touch: `list.forEach(System.out::println)` and `stream().filter(...)` exist for every collection.' },
      { type: 'h3', text: 'Your task' },
      { type: 'list', items: ['Count word frequencies of a sentence into a `Map<String, Integer>` using `getOrDefault`.', 'Collect words longer than 3 letters into a `List<String>`.', 'Print both structures.'] },
    ],
    starterCode: `import java.util.*;\n\nclass Main {\n    public static void main(String[] args) {\n        String sentence = "the cat sat on the mat and the cat smiled";\n        String[] words = sentence.split(" ");\n\n        // Map<String, Integer> counts = ...\n        // List<String> longWords = ...\n    }\n}\n`,
    solutionCode: `import java.util.*;\n\nclass Main {\n    public static void main(String[] args) {\n        String sentence = "the cat sat on the mat and the cat smiled";\n        String[] words = sentence.split(" ");\n\n        Map<String, Integer> counts = new HashMap<>();\n        List<String> longWords = new ArrayList<>();\n\n        for (String w : words) {\n            counts.put(w, counts.getOrDefault(w, 0) + 1);\n            if (w.length() > 3) longWords.add(w);\n        }\n\n        System.out.println("counts: " + counts);\n        System.out.println("long words: " + longWords);\n\n        // stream flavour:\n        counts.entrySet().stream()\n            .filter(e -> e.getValue() > 1)\n            .forEach(e -> System.out.println(e.getKey() + " appears " + e.getValue() + "x"));\n    }\n}\n`,
  },
  {
    id: 'java-11',
    title: 'Exceptions',
    summary: 'try/catch/finally, throw, custom exceptions.',
    blocks: [
      { type: 'p', text: 'Exceptions signal failures up the call stack. `try/catch` handles them, `finally` always runs, and `throw` raises one. **Checked** exceptions (like `IOException`) must be declared or caught; **unchecked** (`RuntimeException` family) need not.' },
      { type: 'code', text: `try {\n    int n = Integer.parseInt("not-a-number");\n} catch (NumberFormatException e) {\n    System.out.println("bad input: " + e.getMessage());\n} finally {\n    System.out.println("always runs");\n}\n\n// custom exception\nclass InsufficientFundsException extends RuntimeException {\n    InsufficientFundsException(String msg) { super(msg); }\n}` },
      { type: 'h3', text: 'Your task' },
      { type: 'list', items: ['Write `static int divide(int a, int b)` that throws `ArithmeticException` naturally — catch it and print a friendly message.', 'Create a custom `EmptyCartException` and a `checkout(int items)` method that throws it when `items == 0`.', 'Catch your custom exception, and prove `finally` runs either way.'] },
    ],
    starterCode: `class Main {\n    // static int divide(int a, int b) { ... }\n    // class EmptyCartException extends RuntimeException { ... }\n    // static void checkout(int items) { ... }\n\n    public static void main(String[] args) {\n        // try dividing by zero, then checking out 0 items\n    }\n}\n`,
    solutionCode: `class EmptyCartException extends RuntimeException {\n    EmptyCartException(String msg) {\n        super(msg);\n    }\n}\n\nclass Main {\n    static int divide(int a, int b) {\n        return a / b; // throws ArithmeticException when b == 0\n    }\n\n    static void checkout(int items) {\n        if (items == 0) {\n            throw new EmptyCartException("cannot checkout an empty cart");\n        }\n        System.out.println("checked out " + items + " items");\n    }\n\n    public static void main(String[] args) {\n        try {\n            System.out.println(divide(10, 0));\n        } catch (ArithmeticException e) {\n            System.out.println("math error: " + e.getMessage());\n        } finally {\n            System.out.println("divide attempt finished");\n        }\n\n        try {\n            checkout(0);\n        } catch (EmptyCartException e) {\n            System.out.println("checkout failed: " + e.getMessage());\n        } finally {\n            System.out.println("checkout attempt finished");\n        }\n    }\n}\n`,
  },
  {
    id: 'java-12',
    title: 'Mini project: library system',
    summary: 'Capstone — every OOP concept in one small app.',
    blocks: [
      { type: 'p', text: 'Time to combine everything: encapsulation, inheritance, polymorphism, abstraction, collections, and exceptions in one small library system.' },
      { type: 'list', items: ['Abstract `LibraryItem` (private `title`, abstract `loanDays()`).', '`Book` (21 loan days) and `Dvd` (7 loan days) extend it.', '`Library` keeps a `List<LibraryItem>` and a `Set`/`List` of borrowed titles.', '`borrow(title)` throws `ItemNotAvailableException` if unknown or already borrowed.'] },
      { type: 'h3', text: 'Your task' },
      { type: 'p', text: 'Fill in the starter skeleton: implement the subclasses, `borrow`, and `printCatalog`. Then borrow a few items — including one twice, to see your exception fire.' },
    ],
    starterCode: `import java.util.*;\n\nabstract class LibraryItem {\n    private String title;\n    LibraryItem(String title) { this.title = title; }\n    String getTitle() { return title; }\n    abstract int loanDays();\n}\n\n// class Book extends LibraryItem — 21 loan days\n// class Dvd  extends LibraryItem — 7 loan days\n// class ItemNotAvailableException extends RuntimeException\n\nclass Library {\n    private List<LibraryItem> items = new ArrayList<>();\n    private Set<String> borrowed = new HashSet<>();\n\n    void add(LibraryItem item) { items.add(item); }\n\n    // void borrow(String title) { ... }\n    // void printCatalog() { ... }\n}\n\nclass Main {\n    public static void main(String[] args) {\n        Library lib = new Library();\n        // add items, print catalog, borrow some (one of them twice)\n    }\n}\n`,
    solutionCode: `import java.util.*;\n\nabstract class LibraryItem {\n    private String title;\n    LibraryItem(String title) { this.title = title; }\n    String getTitle() { return title; }\n    abstract int loanDays();\n}\n\nclass Book extends LibraryItem {\n    Book(String title) { super(title); }\n    @Override\n    int loanDays() { return 21; }\n}\n\nclass Dvd extends LibraryItem {\n    Dvd(String title) { super(title); }\n    @Override\n    int loanDays() { return 7; }\n}\n\nclass ItemNotAvailableException extends RuntimeException {\n    ItemNotAvailableException(String msg) { super(msg); }\n}\n\nclass Library {\n    private List<LibraryItem> items = new ArrayList<>();\n    private Set<String> borrowed = new HashSet<>();\n\n    void add(LibraryItem item) { items.add(item); }\n\n    void borrow(String title) {\n        LibraryItem found = null;\n        for (LibraryItem item : items) {\n            if (item.getTitle().equals(title)) { found = item; break; }\n        }\n        if (found == null) {\n            throw new ItemNotAvailableException("no such item: " + title);\n        }\n        if (!borrowed.add(title)) {\n            throw new ItemNotAvailableException(title + " is already borrowed");\n        }\n        System.out.println("Borrowed \\"" + title + "\\" for " + found.loanDays() + " days");\n    }\n\n    void printCatalog() {\n        for (LibraryItem item : items) {\n            String status = borrowed.contains(item.getTitle()) ? "OUT" : "in";\n            System.out.printf("[%s] %-22s (%s, %d-day loan)%n",\n                status, item.getTitle(), item.getClass().getSimpleName(), item.loanDays());\n        }\n    }\n}\n\nclass Main {\n    public static void main(String[] args) {\n        Library lib = new Library();\n        lib.add(new Book("Effective Java"));\n        lib.add(new Book("Clean Code"));\n        lib.add(new Dvd("The Matrix"));\n\n        lib.borrow("Effective Java");\n        lib.borrow("The Matrix");\n\n        try {\n            lib.borrow("Effective Java"); // already out!\n        } catch (ItemNotAvailableException e) {\n            System.out.println("oops: " + e.getMessage());\n        }\n\n        lib.printCatalog();\n    }\n}\n`,
  },
]

export default levels
